import type { MarketFeatures, ModelOutput } from '@/domain/types';
import { clamp } from '@/domain/config';

// Lightweight online logistic regression for short-horizon prediction.
// Uses gradient descent with L2 regularization, trained incrementally on resolved predictions.
interface MLState {
  weights: number[];
  bias: number;
  learningRate: number;
  iterations: number;
}

const FEATURE_KEYS = [
  'priceReturn',
  'shortTermMomentum',
  'acceleration',
  'volatility',
  'rollingVolatility',
  'volumeChange',
  'tradeImbalance',
  'bidAskSpread',
  'shortTermTrend',
  'meanReversionSignal',
  'liquidityScore',
];

function featuresToVector(f: MarketFeatures): number[] {
  return [
    f.priceReturn,
    f.shortTermMomentum,
    f.acceleration,
    f.volatility,
    f.rollingVolatility,
    f.volumeChange,
    f.tradeImbalance,
    f.bidAskSpread,
    f.shortTermTrend,
    f.meanReversionSignal,
    f.liquidityScore,
  ];
}

export class MLModel {
  private state: MLState;

  constructor() {
    this.state = {
      weights: new Array(FEATURE_KEYS.length).fill(0),
      bias: 0,
      learningRate: 0.01,
      iterations: 0,
    };
  }

  predict(features: MarketFeatures): ModelOutput {
    const x = featuresToVector(features);
    const z = this.state.bias + x.reduce((sum, xi, i) => sum + xi * this.state.weights[i], 0);
    const upProb = clamp(this.sigmoid(z), 0.01, 0.99);
    const downProb = 1 - upProb;

    const expectedMovement = (upProb - 0.5) * 2 * features.rollingVolatility * features.price;

    const explanationParts: string[] = [];
    explanationParts.push(`ML model trained on ${this.state.iterations} samples`);
    if (this.state.iterations < 20) {
      explanationParts.push('Insufficient training data — using weak prior');
    }
    explanationParts.push(`Key signal: ${this.dominantFeature(features)}`);

    return {
      modelName: 'Logistic Regression ML',
      modelType: 'ML',
      upProbability: upProb,
      downProbability: downProb,
      expectedMovement,
      confidence: Math.abs(upProb - 0.5) * 2 * Math.min(1, this.state.iterations / 20),
      contribution: 0.5,
      features: features.availableFeatures,
      explanation: explanationParts.join('; '),
    };
  }

  train(features: MarketFeatures, actualDirection: 'UP' | 'DOWN'): void {
    const x = featuresToVector(features);
    const z = this.state.bias + x.reduce((sum, xi, i) => sum + xi * this.state.weights[i], 0);
    const pred = this.sigmoid(z);
    const target = actualDirection === 'UP' ? 1 : 0;
    const error = pred - target;

    // Gradient descent with L2 regularization
    const lambda = 0.001;
    this.state.bias -= this.state.learningRate * error;
    for (let i = 0; i < this.state.weights.length; i++) {
      const grad = error * x[i] + lambda * this.state.weights[i];
      this.state.weights[i] -= this.state.learningRate * grad;
    }
    this.state.iterations++;

    // Decay learning rate
    if (this.state.iterations % 100 === 0) {
      this.state.learningRate *= 0.95;
    }
  }

  isTrained(): boolean {
    return this.state.iterations >= 20;
  }

  getIterations(): number {
    return this.state.iterations;
  }

  private sigmoid(x: number): number {
    if (x < -500) return 0;
    if (x > 500) return 1;
    return 1 / (1 + Math.exp(-x));
  }

  private dominantFeature(f: MarketFeatures): string {
    const candidates: Array<[string, number]> = [
      ['momentum', Math.abs(f.shortTermMomentum)],
      ['trend', Math.abs(f.shortTermTrend)],
      ['mean reversion', Math.abs(f.meanReversionSignal)],
      ['acceleration', Math.abs(f.acceleration)],
    ];
    candidates.sort((a, b) => b[1] - a[1]);
    return candidates[0][0];
  }
}

export const mlModel = new MLModel();
