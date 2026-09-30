import type {
  AppConfig,
  ConfidenceLevel,
  DataQuality,
  Direction,
  MarketCondition,
  MarketFeatures,
  ModelOutput,
  SignalQuality,
  Horizon,
} from '@/domain/types';
import { clamp } from '@/domain/config';

export function classifyConfidence(confidence: number, config: AppConfig): ConfidenceLevel {
  if (confidence >= config.confidenceThresholds.high / 100) return 'HIGH';
  if (confidence >= config.confidenceThresholds.moderate / 100) return 'MODERATE';
  return 'LOW';
}

export function classifySignalQuality(
  upProbability: number,
  modelAgreement: number,
  modelAgreementTotal: number,
  dataQuality: DataQuality,
  features: MarketFeatures | null,
  config: AppConfig,
  recentAccuracy: number | null
): SignalQuality {
  const probSep = Math.abs(upProbability - 0.5) * 2;
  const agreementRatio = modelAgreementTotal > 0 ? modelAgreement / modelAgreementTotal : 0;

  // If data is stale/unavailable, no signal
  if (dataQuality === 'STALE' || dataQuality === 'UNAVAILABLE') return 'NO_SIGNAL';

  // If features unavailable
  if (!features) return 'NO_SIGNAL';

  // If spread is excessive
  const spreadPct = features.bidAskSpread / (features.price || 1);
  if (spreadPct > config.noSignalConditions.maxSpread) return 'NO_SIGNAL';

  // If volatility is abnormal
  if (features.rollingVolatility > config.noSignalConditions.maxVolatility) return 'NO_SIGNAL';

  // If model disagreement is too high
  if (1 - agreementRatio > config.noSignalConditions.maxModelDisagreement) return 'NO_SIGNAL';

  // If recent accuracy is very poor, reduce signal quality
  let accuracyPenalty = 0;
  if (recentAccuracy !== null && recentAccuracy < 0.50) {
    accuracyPenalty = 0.1;
  }

  const effectiveProbSep = probSep - accuracyPenalty;

  const strongThreshold = config.signalQualityThresholds.strong / 100;
  const moderateThreshold = config.signalQualityThresholds.moderate / 100;
  const weakThreshold = config.signalQualityThresholds.weak / 100;

  if (effectiveProbSep >= strongThreshold && agreementRatio >= 1.0 && dataQuality === 'GOOD') {
    return 'STRONG';
  }
  if (effectiveProbSep >= moderateThreshold && agreementRatio >= 0.75) {
    return 'MODERATE';
  }
  if (effectiveProbSep >= weakThreshold) {
    return 'WEAK';
  }
  return 'NO_SIGNAL';
}

export function classifyMarketCondition(features: MarketFeatures): MarketCondition {
  if (features.availableFeatures.length < 3) return 'UNKNOWN';

  const trend = features.shortTermTrend;
  const vol = features.rollingVolatility;

  if (vol > 0.0015) return 'VOLATILE';
  if (vol < 0.0003) return 'CALM';
  if (Math.abs(trend) > 0.0001) {
    return trend > 0 ? 'TRENDING_UP' : 'TRENDING_DOWN';
  }
  return 'RANGING';
}

export function determineDirection(
  upProbability: number,
  signalQuality: SignalQuality
): Direction | 'NO_SIGNAL' {
  if (signalQuality === 'NO_SIGNAL') return 'NO_SIGNAL';
  return upProbability > 0.5 ? 'UP' : 'DOWN';
}

export function classifyDeepAnalysis(
  features: MarketFeatures,
  modelOutputs: ModelOutput[],
  ensemble: ModelOutput,
  signalQuality: SignalQuality,
  modelAgreement: number,
  modelAgreementTotal: number
): {
  momentum: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  shortTermTrend: 'UP' | 'SIDEWAYS' | 'DOWN';
  volatility: 'LOW' | 'MEDIUM' | 'HIGH';
  liquidity: 'LOW' | 'MEDIUM' | 'HIGH';
  orderFlow: 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'UNAVAILABLE';
  modelAgreement: 'STRONG' | 'MIXED' | 'WEAK';
  dataQuality: 'GOOD' | 'DEGRADED' | 'STALE';
  finalDecision: Direction | 'NO_SIGNAL';
  explanation: string;
} {
  const momentum = features.shortTermMomentum > 0.0002 ? 'POSITIVE' :
    features.shortTermMomentum < -0.0002 ? 'NEGATIVE' : 'NEUTRAL';

  const shortTermTrend = features.shortTermTrend > 0.0001 ? 'UP' :
    features.shortTermTrend < -0.0001 ? 'DOWN' : 'SIDEWAYS';

  const volatility = features.rollingVolatility > 0.001 ? 'HIGH' :
    features.rollingVolatility > 0.0005 ? 'MEDIUM' : 'LOW';

  const liquidity = features.liquidityScore > 0.6 ? 'HIGH' :
    features.liquidityScore > 0.3 ? 'MEDIUM' : 'LOW';

  const orderFlow = features.orderBookImbalance === null ? 'UNAVAILABLE' :
    features.orderBookImbalance > 0.1 ? 'BULLISH' :
    features.orderBookImbalance < -0.1 ? 'BEARISH' : 'NEUTRAL';

  const agreementRatio = modelAgreementTotal > 0 ? modelAgreement / modelAgreementTotal : 0;
  const modelAg = agreementRatio >= 1.0 ? 'STRONG' :
    agreementRatio >= 0.75 ? 'MIXED' : 'WEAK';

  const dataQ = features.dataQuality === 'GOOD' ? 'GOOD' :
    features.dataQuality === 'DEGRADED' ? 'DEGRADED' : 'STALE';

  const finalDecision = signalQuality === 'NO_SIGNAL' ? 'NO_SIGNAL' as const :
    ensemble.upProbability > 0.5 ? 'UP' as const : 'DOWN' as const;

  const explanationParts: string[] = [];
  explanationParts.push(`Momentum ${momentum.toLowerCase()}`);
  explanationParts.push(`Trend ${shortTermTrend.toLowerCase()}`);
  explanationParts.push(`Volatility ${volatility.toLowerCase()}`);
  explanationParts.push(`Liquidity ${liquidity.toLowerCase()}`);
  explanationParts.push(`Order flow ${orderFlow.toLowerCase()}`);
  explanationParts.push(`Model agreement ${modelAg.toLowerCase()}`);
  explanationParts.push(`Data quality ${dataQ.toLowerCase()}`);
  explanationParts.push(`Final decision: ${finalDecision}`);

  return {
    momentum,
    shortTermTrend,
    volatility,
    liquidity,
    orderFlow,
    modelAgreement: modelAg,
    dataQuality: dataQ,
    finalDecision,
    explanation: explanationParts.join('; '),
  };
}
