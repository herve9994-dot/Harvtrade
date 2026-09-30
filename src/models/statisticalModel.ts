import type { MarketFeatures, ModelOutput } from '@/domain/types';
import { clamp } from '@/domain/config';

function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function statisticalModel(features: MarketFeatures): ModelOutput {
  const signals: number[] = [];

  // Momentum signal
  const momentumSignal = features.shortTermMomentum * 500;
  signals.push(momentumSignal);

  // Trend signal
  const trendSignal = features.shortTermTrend * 1000;
  signals.push(trendSignal);

  // Mean reversion signal (opposite of z-score)
  signals.push(features.meanReversionSignal * 0.8);

  // Acceleration signal
  signals.push(features.acceleration * 200);

  // Order book imbalance if available
  if (features.orderBookImbalance !== null) {
    signals.push(features.orderBookImbalance * 2);
  }

  // Trade imbalance
  signals.push(features.tradeImbalance * 1.5);

  // Combine signals
  const combined = signals.reduce((a, b) => a + b, 0) / signals.length;

  // Adjust probability based on volatility (higher vol = closer to 50%)
  const volAdjustment = clamp(features.rollingVolatility * 200, 0, 2);
  const adjustedSignal = combined / (1 + volAdjustment);

  const upProb = clamp(logistic(adjustedSignal), 0.01, 0.99);
  const downProb = 1 - upProb;

  const expectedMovement = (upProb - 0.5) * 2 * features.rollingVolatility * features.price;

  const explanationParts: string[] = [];
  explanationParts.push(`Momentum ${features.shortTermMomentum > 0 ? 'positive' : 'negative'}`);
  explanationParts.push(`Trend ${features.shortTermTrend > 0 ? 'up' : 'down'}`);
  explanationParts.push(`Volatility ${features.rollingVolatility > 0.0008 ? 'elevated' : 'normal'}`);
  if (features.orderBookImbalance !== null) {
    explanationParts.push(`Order book ${features.orderBookImbalance > 0 ? 'bid-heavy' : 'ask-heavy'}`);
  } else {
    explanationParts.push('Order book unavailable');
  }

  return {
    modelName: 'Statistical Baseline',
    modelType: 'STATISTICAL',
    upProbability: upProb,
    downProbability: downProb,
    expectedMovement,
    confidence: Math.abs(upProb - 0.5) * 2,
    contribution: 0.5,
    features: features.availableFeatures,
    explanation: explanationParts.join('; '),
  };
}
