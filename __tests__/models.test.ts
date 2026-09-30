import { statisticalModel } from '../src/models/statisticalModel';
import { mlModel } from '../src/models/mlModel';
import { combineEnsemble, computeModelAgreement, computeModelDisagreement } from '../src/models/ensemble';
import type { MarketFeatures, ModelOutput } from '../src/domain/types';

function makeFeatures(overrides: Partial<MarketFeatures> = {}): MarketFeatures {
  return {
    timestamp: Date.now(),
    asset: 'BTC/USD',
    priceReturn: 0.001,
    shortTermMomentum: 0.002,
    acceleration: 0.0005,
    volatility: 0.0008,
    rollingVolatility: 0.0008,
    volumeChange: 0.1,
    tradeImbalance: 0.2,
    bidAskSpread: 0.02,
    orderBookImbalance: 0.15,
    microprice: 67000,
    shortTermTrend: 0.0002,
    meanReversionSignal: -0.5,
    liquidityScore: 0.6,
    price: 67000,
    dataQuality: 'GOOD',
    availableFeatures: ['priceReturn', 'shortTermMomentum', 'volatility'],
    ...overrides,
  };
}

describe('statisticalModel', () => {
  it('produces valid probabilities', () => {
    const out = statisticalModel(makeFeatures());
    expect(out.upProbability).toBeGreaterThan(0);
    expect(out.upProbability).toBeLessThan(1);
    expect(out.downProbability).toBe(1 - out.upProbability);
  });

  it('leans UP with positive momentum', () => {
    const out = statisticalModel(makeFeatures({ shortTermMomentum: 0.01, shortTermTrend: 0.005 }));
    expect(out.upProbability).toBeGreaterThan(0.5);
  });

  it('leans DOWN with negative momentum', () => {
    const out = statisticalModel(makeFeatures({ shortTermMomentum: -0.01, shortTermTrend: -0.005 }));
    expect(out.upProbability).toBeLessThan(0.5);
  });

  it('produces explanation string', () => {
    const out = statisticalModel(makeFeatures());
    expect(out.explanation.length).toBeGreaterThan(10);
  });
});

describe('mlModel', () => {
  it('produces valid probabilities before training', () => {
    const out = mlModel.predict(makeFeatures());
    expect(out.upProbability).toBeGreaterThan(0);
    expect(out.upProbability).toBeLessThan(1);
  });

  it('adjusts after training on UP', () => {
    const features = makeFeatures({ shortTermMomentum: 0.005 });
    const before = mlModel.predict(features).upProbability;
    for (let i = 0; i < 30; i++) {
      mlModel.train(features, 'UP');
    }
    const after = mlModel.predict(features).upProbability;
    expect(after).toBeGreaterThanOrEqual(before);
  });
});

describe('ensemble', () => {
  it('combines model outputs', () => {
    const outputs: ModelOutput[] = [
      { modelName: 'A', modelType: 'STATISTICAL', upProbability: 0.6, downProbability: 0.4, expectedMovement: 0.1, confidence: 0.2, contribution: 0.5, features: [], explanation: 'A' },
      { modelName: 'B', modelType: 'ML', upProbability: 0.7, downProbability: 0.3, expectedMovement: 0.15, confidence: 0.4, contribution: 0.5, features: [], explanation: 'B' },
    ];
    const ensemble = combineEnsemble(outputs, { modelWeights: { statistical: 0.5, ml: 0.5, ensemble: 1 } } as any);
    expect(ensemble.upProbability).toBeCloseTo(0.65, 5);
    expect(ensemble.downProbability).toBeCloseTo(0.35, 5);
  });

  it('computes model agreement', () => {
    const outputs: ModelOutput[] = [
      { modelName: 'A', modelType: 'STATISTICAL', upProbability: 0.6, downProbability: 0.4, expectedMovement: 0, confidence: 0, contribution: 1, features: [], explanation: '' },
      { modelName: 'B', modelType: 'ML', upProbability: 0.55, downProbability: 0.45, expectedMovement: 0, confidence: 0, contribution: 1, features: [], explanation: '' },
    ];
    expect(computeModelAgreement(outputs)).toBe(2);
  });

  it('computes model disagreement', () => {
    const outputs: ModelOutput[] = [
      { modelName: 'A', modelType: 'STATISTICAL', upProbability: 0.6, downProbability: 0.4, expectedMovement: 0, confidence: 0, contribution: 1, features: [], explanation: '' },
      { modelName: 'B', modelType: 'ML', upProbability: 0.4, downProbability: 0.6, expectedMovement: 0, confidence: 0, contribution: 1, features: [], explanation: '' },
    ];
    expect(computeModelDisagreement(outputs)).toBeGreaterThan(0);
  });
});
