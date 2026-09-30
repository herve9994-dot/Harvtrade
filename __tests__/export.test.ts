import { predictionsToCSV, tradesToCSV, predictionsToJSON } from '../src/data/export';
import type { Prediction, PaperTrade } from '../src/domain/types';

function makePrediction(): Prediction {
  return {
    id: 'pred-1',
    timestamp: 1700000000000,
    asset: 'BTC/USD',
    currentPrice: 67000,
    horizon: 10,
    upProbability: 0.65,
    downProbability: 0.35,
    expectedMovement: 0.5,
    confidence: 0.3,
    confidenceLevel: 'MODERATE',
    signalQuality: 'MODERATE',
    direction: 'UP',
    modelOutputs: [],
    ensembleOutput: { modelName: 'Ensemble', modelType: 'ENSEMBLE', upProbability: 0.65, downProbability: 0.35, expectedMovement: 0.5, confidence: 0.3, contribution: 1, features: [], explanation: 'test' },
    features: null as any,
    modelAgreement: 2,
    modelAgreementTotal: 2,
    marketCondition: 'RANGING',
    latency: 5,
    dataQuality: 'GOOD',
    resolved: true,
    outcomeTimestamp: 1700000010000,
    actualPrice: 67100,
    actualDirection: 'UP',
    result: 'CORRECT',
  };
}

describe('export', () => {
  describe('predictionsToCSV', () => {
    it('generates CSV with headers', () => {
      const csv = predictionsToCSV([makePrediction()]);
      const lines = csv.split('\n');
      expect(lines[0]).toContain('id,timestamp,asset');
      expect(lines.length).toBe(2);
    });

    it('includes prediction data', () => {
      const csv = predictionsToCSV([makePrediction()]);
      expect(csv).toContain('BTC/USD');
      expect(csv).toContain('CORRECT');
    });
  });

  describe('tradesToCSV', () => {
    it('generates CSV for trades', () => {
      const trade: PaperTrade = {
        id: 't1',
        predictionId: 'p1',
        timestamp: 1700000000000,
        asset: 'BTC/USD',
        direction: 'UP',
        stake: 100,
        horizon: 10,
        entryPrice: 67000,
        payoutPercentage: 87,
        status: 'WON',
        exitPrice: 67100,
        pnl: 87,
        resolvedAt: 1700000010000,
      };
      const csv = tradesToCSV([trade]);
      expect(csv).toContain('id,predictionId');
      expect(csv).toContain('BTC/USD');
      expect(csv).toContain('WON');
    });
  });

  describe('predictionsToJSON', () => {
    it('generates valid JSON', () => {
      const json = predictionsToJSON([makePrediction()]);
      const parsed = JSON.parse(json);
      expect(parsed.length).toBe(1);
      expect(parsed[0].asset).toBe('BTC/USD');
    });
  });
});
