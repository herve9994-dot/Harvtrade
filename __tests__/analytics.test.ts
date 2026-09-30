import { computePredictionQuality, computeOverallStats, computeModelEvaluations } from '../src/analytics/analyticsEngine';
import type { Prediction } from '../src/domain/types';

function makePrediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    id: `pred-${Math.random()}`,
    timestamp: Date.now(),
    asset: 'BTC/USD',
    currentPrice: 67000,
    horizon: 10,
    upProbability: 0.6,
    downProbability: 0.4,
    expectedMovement: 0.5,
    confidence: 0.2,
    confidenceLevel: 'MODERATE',
    signalQuality: 'MODERATE',
    direction: 'UP',
    modelOutputs: [
      { modelName: 'Stat', modelType: 'STATISTICAL', upProbability: 0.6, downProbability: 0.4, expectedMovement: 0, confidence: 0.2, contribution: 0.5, features: [], explanation: '' },
      { modelName: 'ML', modelType: 'ML', upProbability: 0.55, downProbability: 0.45, expectedMovement: 0, confidence: 0.1, contribution: 0.5, features: [], explanation: '' },
    ],
    ensembleOutput: { modelName: 'Ensemble', modelType: 'ENSEMBLE', upProbability: 0.6, downProbability: 0.4, expectedMovement: 0, confidence: 0.2, contribution: 1, features: [], explanation: '' },
    features: null as any,
    modelAgreement: 2,
    modelAgreementTotal: 2,
    marketCondition: 'RANGING',
    latency: 5,
    dataQuality: 'GOOD',
    resolved: true,
    outcomeTimestamp: Date.now() + 10000,
    actualPrice: 67100,
    actualDirection: 'UP',
    result: 'CORRECT',
    ...overrides,
  };
}

describe('analyticsEngine', () => {
  describe('computePredictionQuality', () => {
    it('computes quality for resolved predictions', () => {
      const predictions = [
        makePrediction({ result: 'CORRECT', actualDirection: 'UP', direction: 'UP' }),
        makePrediction({ result: 'INCORRECT', actualDirection: 'DOWN', direction: 'UP', id: 'p2' }),
        makePrediction({ result: 'CORRECT', actualDirection: 'UP', direction: 'UP', id: 'p3' }),
      ];
      const q = computePredictionQuality(predictions, 10);
      expect(q.totalPredictions).toBe(3);
      expect(q.correctPredictions).toBe(2);
      expect(q.incorrectPredictions).toBe(1);
      expect(q.directionalAccuracy).toBeCloseTo(2 / 3, 2);
    });

    it('filters by horizon', () => {
      const predictions = [
        makePrediction({ horizon: 10, result: 'CORRECT' }),
        makePrediction({ horizon: 5, result: 'CORRECT', id: 'p2' }),
      ];
      const q10 = computePredictionQuality(predictions, 10);
      const q5 = computePredictionQuality(predictions, 5);
      expect(q10.totalPredictions).toBe(1);
      expect(q5.totalPredictions).toBe(1);
    });

    it('computes Brier score', () => {
      const predictions = [
        makePrediction({ upProbability: 0.6, direction: 'UP', actualDirection: 'UP', result: 'CORRECT' }),
      ];
      const q = computePredictionQuality(predictions, 10);
      // Brier = (0.6 - 1)^2 = 0.16
      expect(q.brierScore).toBeCloseTo(0.16, 2);
    });
  });

  describe('computeOverallStats', () => {
    it('computes overall accuracy', () => {
      const predictions = [
        makePrediction({ result: 'CORRECT', confidenceLevel: 'HIGH' }),
        makePrediction({ result: 'INCORRECT', confidenceLevel: 'LOW', id: 'p2' }),
      ];
      const stats = computeOverallStats(predictions);
      expect(stats.totalPredictions).toBe(2);
      expect(stats.correct).toBe(1);
      expect(stats.accuracy).toBe(0.5);
      expect(stats.byConfidence['HIGH']).toBeDefined();
      expect(stats.byConfidence['LOW']).toBeDefined();
    });

    it('tracks no-signal predictions', () => {
      const predictions = [
        makePrediction({ direction: 'NO_SIGNAL', signalQuality: 'NO_SIGNAL', result: 'NO_VALID_RESULT', actualDirection: 'FLAT' }),
      ];
      const stats = computeOverallStats(predictions);
      expect(stats.noSignalCount).toBe(1);
    });
  });

  describe('computeModelEvaluations', () => {
    it('evaluates models separately', () => {
      const predictions = [
        makePrediction({ result: 'CORRECT', actualDirection: 'UP', direction: 'UP' }),
      ];
      const evals = computeModelEvaluations(predictions);
      expect(evals.length).toBe(2); // STATISTICAL and ML
      const statEval = evals.find((e) => e.modelType === 'STATISTICAL');
      expect(statEval).toBeDefined();
      expect(statEval!.totalPredictions).toBe(1);
      expect(statEval!.correct).toBe(1);
    });
  });
});
