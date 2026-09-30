import type {
  AppConfig,
  MarketObservation,
  MarketFeatures,
  Prediction,
  ModelOutput,
  Horizon,
  SignalQuality,
  Direction,
  DeepAnalysis,
  MultiHorizonView,
} from '@/domain/types';
import { computeFeatures } from '@/features/featureEngine';
import { generateModelOutputs, combineEnsemble, computeModelAgreement, computeModelDisagreement } from '@/models/ensemble';
import {
  classifyConfidence,
  classifySignalQuality,
  classifyMarketCondition,
  determineDirection,
  classifyDeepAnalysis,
} from '@/forecast/signalQuality';
import { generateId } from '@/domain/config';
import { getHorizonPredictions } from '@/data/storage';

export interface ForecastResult {
  prediction: Prediction | null;
  deepAnalysis: DeepAnalysis | null;
  features: MarketFeatures | null;
  reason: string;
}

export function generateForecast(
  observations: MarketObservation[],
  config: AppConfig,
  recentPredictions: Prediction[]
): ForecastResult {
  const features = computeFeatures(observations, config.selectedAsset);

  if (!features) {
    return {
      prediction: null,
      deepAnalysis: null,
      features: null,
      reason: 'Insufficient data — no prediction',
    };
  }

  if (features.dataQuality === 'STALE' || features.dataQuality === 'UNAVAILABLE') {
    return {
      prediction: null,
      deepAnalysis: null,
      features,
      reason: 'Data is stale — no prediction',
    };
  }

  if (observations.length < config.noSignalConditions.minDataPoints) {
    return {
      prediction: null,
      deepAnalysis: null,
      features,
      reason: `Insufficient data points (${observations.length}/${config.noSignalConditions.minDataPoints})`,
    };
  }

  const startTime = Date.now();
  const modelOutputs = generateModelOutputs(features, config);
  const ensemble = combineEnsemble(modelOutputs, config);
  const modelAgreement = computeModelAgreement(modelOutputs);
  const modelDisagreement = computeModelDisagreement(modelOutputs);
  const latency = Date.now() - startTime;

  // Recent accuracy for the selected horizon
  const horizonPredictions = getHorizonPredictions(recentPredictions, config.selectedHorizon);
  const recentAccuracy = horizonPredictions.length >= 10
    ? horizonPredictions.slice(0, 50).filter((p) => p.result === 'CORRECT').length / Math.min(50, horizonPredictions.length)
    : null;

  const signalQuality = classifySignalQuality(
    ensemble.upProbability,
    modelAgreement,
    modelOutputs.length,
    features.dataQuality,
    features,
    config,
    recentAccuracy
  );

  const confidenceLevel = classifyConfidence(ensemble.confidence, config);
  const marketCondition = classifyMarketCondition(features);
  const direction = determineDirection(ensemble.upProbability, signalQuality);

  // Multi-horizon view
  const multiHorizonView = generateMultiHorizonView(observations, config, modelOutputs);

  // Check multi-horizon conflict
  const conflictDetected = checkMultiHorizonConflict(multiHorizonView, config);
  if (conflictDetected && signalQuality !== 'NO_SIGNAL') {
    // Downgrade to NO_SIGNAL if multi-horizon conflict
    const downgradedQuality: SignalQuality = 'NO_SIGNAL';
    const deepAnalysis = classifyDeepAnalysis(features, modelOutputs, ensemble, downgradedQuality, modelAgreement, modelOutputs.length);

    const prediction: Prediction = {
      id: generateId(),
      timestamp: Date.now(),
      asset: config.selectedAsset,
      currentPrice: observations[observations.length - 1].price,
      horizon: config.selectedHorizon,
      upProbability: ensemble.upProbability,
      downProbability: ensemble.downProbability,
      expectedMovement: ensemble.expectedMovement,
      confidence: ensemble.confidence,
      confidenceLevel,
      signalQuality: 'NO_SIGNAL',
      direction: 'NO_SIGNAL',
      modelOutputs,
      ensembleOutput: ensemble,
      features,
      modelAgreement,
      modelAgreementTotal: modelOutputs.length,
      marketCondition,
      latency,
      dataQuality: features.dataQuality,
      multiHorizonView,
    };

    return {
      prediction,
      deepAnalysis: { ...deepAnalysis, finalDecision: 'NO_SIGNAL' },
      features,
      reason: 'Multi-horizon conflict detected — NO SIGNAL',
    };
  }

  const deepAnalysis = classifyDeepAnalysis(features, modelOutputs, ensemble, signalQuality, modelAgreement, modelOutputs.length);

  const prediction: Prediction = {
    id: generateId(),
    timestamp: Date.now(),
    asset: config.selectedAsset,
    currentPrice: observations[observations.length - 1].price,
    horizon: config.selectedHorizon,
    upProbability: ensemble.upProbability,
    downProbability: ensemble.downProbability,
    expectedMovement: ensemble.expectedMovement,
    confidence: ensemble.confidence,
    confidenceLevel,
    signalQuality,
    direction,
    modelOutputs,
    ensembleOutput: ensemble,
    features,
    modelAgreement,
    modelAgreementTotal: modelOutputs.length,
    marketCondition,
    latency,
    dataQuality: features.dataQuality,
    multiHorizonView,
  };

  return {
    prediction,
    deepAnalysis,
    features,
    reason: signalQuality === 'NO_SIGNAL' ? 'Signal quality below threshold — NO SIGNAL' : 'Forecast generated',
  };
}

function generateMultiHorizonView(
  observations: MarketObservation[],
  config: AppConfig,
  modelOutputs: ModelOutput[]
): MultiHorizonView[] {
  const horizons: Horizon[] = config.availableHorizons;
  const views: MultiHorizonView[] = [];

  for (const horizon of horizons) {
    // Scale the probability based on horizon (shorter horizons tend to have less certainty)
    const scaleFactor = Math.log(horizon + 1) / Math.log(config.selectedHorizon + 1);
    const baseUpProb = modelOutputs.reduce((sum, m) => sum + m.upProbability * m.contribution, 0) /
      modelOutputs.reduce((sum, m) => sum + m.contribution, 0);

    // Adjust probability toward 50% for horizons different from the primary
    const adjustedUpProb = 0.5 + (baseUpProb - 0.5) * scaleFactor;
    const adjustedDownProb = 1 - adjustedUpProb;

    const probSep = Math.abs(adjustedUpProb - 0.5) * 2;
    const sq: SignalQuality = probSep > 0.15 ? 'MODERATE' : probSep > 0.05 ? 'WEAK' : 'NO_SIGNAL';
    const dir: Direction | 'NO_SIGNAL' = sq === 'NO_SIGNAL' ? 'NO_SIGNAL' : adjustedUpProb > 0.5 ? 'UP' : 'DOWN';

    views.push({
      horizon,
      upProbability: adjustedUpProb,
      downProbability: adjustedDownProb,
      signalQuality: sq,
      direction: dir,
      conflict: false,
    });
  }

  return views;
}

function checkMultiHorizonConflict(views: MultiHorizonView[], config: AppConfig): boolean {
  const activeViews = views.filter((v) => v.signalQuality !== 'NO_SIGNAL');
  if (activeViews.length < 2) return false;

  const upViews = activeViews.filter((v) => v.direction === 'UP');
  const downViews = activeViews.filter((v) => v.direction === 'DOWN');

  if (upViews.length > 0 && downViews.length > 0) {
    const maxUpProb = Math.max(...upViews.map((v) => v.upProbability));
    const maxDownProb = Math.max(...downViews.map((v) => v.downProbability));
    const conflict = Math.abs(maxUpProb - maxDownProb) < config.multiHorizonConflictThreshold + 0.3;
    return conflict;
  }

  // Check if probability spread across horizons is too large
  const probs = activeViews.map((v) => v.upProbability);
  const spread = Math.max(...probs) - Math.min(...probs);
  return spread > config.multiHorizonConflictThreshold * 3;
}
