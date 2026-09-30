import type { Prediction, BacktestResult, AppConfig, MarketObservation, Horizon } from '@/domain/types';
import { computeFeatures } from '@/features/featureEngine';
import { generateModelOutputs, combineEnsemble, computeModelAgreement } from '@/models/ensemble';
import { classifySignalQuality, classifyConfidence, classifyMarketCondition, determineDirection } from '@/forecast/signalQuality';
import { classifyDirection, FLAT_THRESHOLD } from '@/domain/config';

export interface BacktestConfig {
  asset: string;
  horizon: Horizon;
  payoutPercentage: number;
  stake: number;
  includeNoSignal: boolean;
}

export function runBacktest(
  observations: MarketObservation[],
  config: AppConfig,
  btConfig: BacktestConfig
): BacktestResult {
  const { asset, horizon, payoutPercentage, stake, includeNoSignal } = btConfig;
  const horizonMs = horizon * 1000;

  const predictions: Array<{
    timestamp: number;
    upProbability: number;
    direction: 'UP' | 'DOWN' | 'NO_SIGNAL';
    signalQuality: string;
    confidence: number;
    marketCondition: string;
    actualDirection: 'UP' | 'DOWN' | 'FLAT';
    correct: boolean | null;
  }> = [];

  // Replay historical data chronologically
  const minObs = 20;
  for (let i = minObs; i < observations.length; i++) {
    const currentObs = observations.slice(0, i + 1);
    const features = computeFeatures(currentObs, asset, observations[i].timestamp);
    if (!features) continue;

    const currentTime = observations[i].timestamp;
    const currentPrice = observations[i].price;

    // Find the observation at currentTime + horizon
    const futureTime = currentTime + horizonMs;
    let futureObs: MarketObservation | null = null;
    for (let j = i + 1; j < observations.length; j++) {
      if (observations[j].timestamp >= futureTime) {
        futureObs = observations[j];
        break;
      }
    }
    if (!futureObs) continue;

    const actualMovement = (futureObs.price - currentPrice) / currentPrice;
    const actualDirection = classifyDirection(actualMovement, FLAT_THRESHOLD);

    const modelOutputs = generateModelOutputs(features, config);
    const ensemble = combineEnsemble(modelOutputs, config);
    const modelAgreement = computeModelAgreement(modelOutputs);

    const signalQuality = classifySignalQuality(
      ensemble.upProbability,
      modelAgreement,
      modelOutputs.length,
      features.dataQuality,
      features,
      config,
      null
    );

    const direction = determineDirection(ensemble.upProbability, signalQuality);
    const marketCondition = classifyMarketCondition(features);

    if (direction === 'NO_SIGNAL' && !includeNoSignal) {
      predictions.push({
        timestamp: currentTime,
        upProbability: ensemble.upProbability,
        direction: 'NO_SIGNAL',
        signalQuality,
        confidence: ensemble.confidence,
        marketCondition,
        actualDirection,
        correct: null,
      });
      continue;
    }

    if (direction === 'NO_SIGNAL') {
      predictions.push({
        timestamp: currentTime,
        upProbability: ensemble.upProbability,
        direction: 'NO_SIGNAL',
        signalQuality,
        confidence: ensemble.confidence,
        marketCondition,
        actualDirection,
        correct: null,
      });
      continue;
    }

    let correct: boolean | null = null;
    if (actualDirection === 'FLAT') {
      correct = null;
    } else {
      correct = direction === actualDirection;
    }

    predictions.push({
      timestamp: currentTime,
      upProbability: ensemble.upProbability,
      direction: direction as 'UP' | 'DOWN' | 'NO_SIGNAL',
      signalQuality,
      confidence: ensemble.confidence,
      marketCondition,
      actualDirection,
      correct,
    });
  }

  return computeBacktestResults(predictions, horizon, asset, payoutPercentage, stake);
}

function computeBacktestResults(
  predictions: Array<{
    timestamp: number;
    upProbability: number;
    direction: 'UP' | 'DOWN' | 'NO_SIGNAL';
    signalQuality: string;
    confidence: number;
    marketCondition: string;
    actualDirection: 'UP' | 'DOWN' | 'FLAT';
    correct: boolean | null;
  }>,
  horizon: Horizon,
  asset: string,
  payoutPercentage: number,
  stake: number
): BacktestResult {
  const validPredictions = predictions.filter((p) => p.correct !== null);
  const noSignalCount = predictions.filter((p) => p.direction === 'NO_SIGNAL').length;
  const correct = validPredictions.filter((p) => p.correct === true).length;
  const incorrect = validPredictions.filter((p) => p.correct === false).length;
  const total = validPredictions.length;

  const accuracy = total > 0 ? correct / total : 0;

  // Precision: of all UP predictions, how many were actually UP
  const upPredictions = validPredictions.filter((p) => p.direction === 'UP');
  const upCorrect = upPredictions.filter((p) => p.actualDirection === 'UP').length;
  const precision = upPredictions.length > 0 ? upCorrect / upPredictions.length : 0;

  // Recall: of all actual UPs, how many did we predict UP
  const actualUps = validPredictions.filter((p) => p.actualDirection === 'UP');
  const recall = actualUps.length > 0 ? upCorrect / actualUps.length : 0;

  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // Brier score
  const brierScore = validPredictions.length > 0
    ? validPredictions.reduce((sum, p) => {
        const predicted = p.direction === 'UP' ? p.upProbability : 1 - p.upProbability;
        const actual = p.actualDirection === 'UP' ? 1 : 0;
        return sum + (predicted - actual) ** 2;
      }, 0) / validPredictions.length
    : 0;

  // Confusion matrix
  const upCorrectCount = validPredictions.filter((p) => p.direction === 'UP' && p.actualDirection === 'UP').length;
  const upIncorrectCount = validPredictions.filter((p) => p.direction === 'UP' && p.actualDirection === 'DOWN').length;
  const downCorrectCount = validPredictions.filter((p) => p.direction === 'DOWN' && p.actualDirection === 'DOWN').length;
  const downIncorrectCount = validPredictions.filter((p) => p.direction === 'DOWN' && p.actualDirection === 'UP').length;

  const falsePositiveRate = upPredictions.length > 0 ? upIncorrectCount / upPredictions.length : 0;

  // Simulated P/L with binary option payout
  const pnlPerTrade = stake * (payoutPercentage / 100);
  let simPnl = 0;
  let maxPnl = 0;
  let minPnl = 0;
  let maxDrawdown = 0;
  let currentStreak = 0;
  let maxLosingStreak = 0;
  let maxWinningStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  for (const p of validPredictions) {
    if (p.correct === true) {
      simPnl += pnlPerTrade;
      currentWinStreak++;
      currentLossStreak = 0;
      maxWinningStreak = Math.max(maxWinningStreak, currentWinStreak);
    } else if (p.correct === false) {
      simPnl -= stake;
      currentLossStreak++;
      currentWinStreak = 0;
      maxLosingStreak = Math.max(maxLosingStreak, currentLossStreak);
    }
    maxPnl = Math.max(maxPnl, simPnl);
    minPnl = Math.min(minPnl, simPnl);
    maxDrawdown = Math.max(maxDrawdown, maxPnl - simPnl);
  }

  // Sharpe-like: mean return / std return
  const returns = validPredictions.map((p) => (p.correct === true ? pnlPerTrade : -stake));
  const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdReturn = returns.length > 0
    ? Math.sqrt(returns.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) / returns.length)
    : 0;
  const sharpeLike = stdReturn > 0 ? meanReturn / stdReturn : 0;

  // Performance by confidence level
  const performanceByConfidence: Record<string, { total: number; correct: number }> = {};
  for (const p of validPredictions) {
    const level = p.confidence > 0.4 ? 'HIGH' : p.confidence > 0.2 ? 'MODERATE' : 'LOW';
    if (!performanceByConfidence[level]) performanceByConfidence[level] = { total: 0, correct: 0 };
    performanceByConfidence[level].total++;
    if (p.correct) performanceByConfidence[level].correct++;
  }

  // Performance by market condition
  const performanceByMarketCondition: Record<string, { total: number; correct: number }> = {};
  for (const p of validPredictions) {
    if (!performanceByMarketCondition[p.marketCondition]) {
      performanceByMarketCondition[p.marketCondition] = { total: 0, correct: 0 };
    }
    performanceByMarketCondition[p.marketCondition].total++;
    if (p.correct) performanceByMarketCondition[p.marketCondition].correct++;
  }

  // Calibration: average predicted probability vs actual accuracy
  const avgPredictedProb = validPredictions.length > 0
    ? validPredictions.reduce((sum, p) => sum + (p.direction === 'UP' ? p.upProbability : 1 - p.upProbability), 0) / validPredictions.length
    : 0;

  const calibration = Math.abs(avgPredictedProb - accuracy);

  return {
    horizon,
    asset,
    totalPredictions: total,
    correct,
    incorrect,
    noSignal: noSignalCount,
    accuracy,
    precision,
    recall,
    f1Score,
    brierScore,
    confusionMatrix: {
      upCorrect: upCorrectCount,
      upIncorrect: upIncorrectCount,
      downCorrect: downCorrectCount,
      downIncorrect: downIncorrectCount,
    },
    averagePredictedProbability: avgPredictedProb,
    calibration,
    maxLosingStreak,
    maxWinningStreak,
    simulatedPnl: simPnl,
    maxDrawdown,
    sharpeLike,
    performanceByConfidence,
    performanceByMarketCondition,
    falsePositiveRate,
    directionalHitRate: accuracy,
  };
}
