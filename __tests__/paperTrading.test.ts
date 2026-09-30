import { computeBinaryOptionAnalysis, createPaperTrade, resolvePaperTrade, computePaperTradingState } from '../src/papertrading/paperTradingEngine';
import type { Prediction, PaperTrade, AppConfig } from '../src/domain/types';
import { DEFAULT_CONFIG } from '../src/domain/config';

function makePrediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    id: 'test-1',
    timestamp: Date.now(),
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
    ensembleOutput: {
      modelName: 'Ensemble',
      modelType: 'ENSEMBLE',
      upProbability: 0.65,
      downProbability: 0.35,
      expectedMovement: 0.5,
      confidence: 0.3,
      contribution: 1,
      features: [],
      explanation: 'test',
    },
    features: null as any,
    modelAgreement: 2,
    modelAgreementTotal: 2,
    marketCondition: 'RANGING',
    latency: 5,
    dataQuality: 'GOOD',
    ...overrides,
  };
}

describe('paperTradingEngine', () => {
  describe('computeBinaryOptionAnalysis', () => {
    it('calculates break-even win rate correctly', () => {
      // payout 87% → break-even = 1 / (1 + 0.87) = 0.5348
      const result = computeBinaryOptionAnalysis(0.55, 87, 100, 50);
      expect(result.breakEvenWinRate).toBeCloseTo(0.5348, 3);
    });

    it('marks profitable when win rate > break-even', () => {
      const result = computeBinaryOptionAnalysis(0.60, 87, 100, 50);
      expect(result.profitable).toBe(true);
      expect(result.expectedValue).toBeGreaterThan(0);
    });

    it('marks not profitable when win rate < break-even', () => {
      const result = computeBinaryOptionAnalysis(0.45, 87, 100, 50);
      expect(result.profitable).toBe(false);
      expect(result.expectedValue).toBeLessThan(0);
    });

    it('calculates EV correctly', () => {
      // EV = 0.55 * 100 * 0.87 - 0.45 * 100 = 47.85 - 45 = 2.85
      const result = computeBinaryOptionAnalysis(0.55, 87, 100, 50);
      expect(result.expectedValue).toBeCloseTo(2.85, 1);
    });
  });

  describe('createPaperTrade', () => {
    it('creates a trade for a valid prediction', () => {
      const config: AppConfig = { ...DEFAULT_CONFIG, paperBalance: 10000, defaultStake: 100, defaultPayoutPercentage: 87 };
      const trade = createPaperTrade(makePrediction(), config);
      expect(trade).not.toBeNull();
      expect(trade!.direction).toBe('UP');
      expect(trade!.stake).toBe(100);
      expect(trade!.status).toBe('OPEN');
    });

    it('returns null for NO_SIGNAL prediction', () => {
      const config: AppConfig = { ...DEFAULT_CONFIG };
      const trade = createPaperTrade(makePrediction({ direction: 'NO_SIGNAL', signalQuality: 'NO_SIGNAL' }), config);
      expect(trade).toBeNull();
    });

    it('returns null when balance is insufficient', () => {
      const config: AppConfig = { ...DEFAULT_CONFIG, paperBalance: 50, defaultStake: 100 };
      const trade = createPaperTrade(makePrediction(), config);
      expect(trade).toBeNull();
    });
  });

  describe('resolvePaperTrade', () => {
    it('resolves as WON when direction matches', () => {
      const trade: PaperTrade = {
        id: 't1',
        predictionId: 'p1',
        timestamp: Date.now(),
        asset: 'BTC/USD',
        direction: 'UP',
        stake: 100,
        horizon: 10,
        entryPrice: 67000,
        payoutPercentage: 87,
        status: 'OPEN',
      };
      const resolved = resolvePaperTrade(trade, 67100, 'UP');
      expect(resolved.status).toBe('WON');
      expect(resolved.pnl).toBe(87);
    });

    it('resolves as LOST when direction does not match', () => {
      const lostTrade: PaperTrade = {
        id: 't2',
        predictionId: 'p2',
        timestamp: Date.now(),
        asset: 'BTC/USD',
        direction: 'UP',
        stake: 100,
        horizon: 10,
        entryPrice: 67000,
        payoutPercentage: 87,
        status: 'OPEN',
      };
      const resolved = resolvePaperTrade(lostTrade, 66900, 'DOWN');
      expect(resolved.status).toBe('LOST');
      expect(resolved.pnl).toBe(-100);
    });

    it('resolves as NO_VALID_RESULT when flat', () => {
      const trade: PaperTrade = {
        id: 't1',
        predictionId: 'p1',
        timestamp: Date.now(),
        asset: 'BTC/USD',
        direction: 'UP',
        stake: 100,
        horizon: 10,
        entryPrice: 67000,
        payoutPercentage: 87,
        status: 'OPEN',
      };
      const resolved = resolvePaperTrade(trade, 67000, 'FLAT');
      expect(resolved.status).toBe('NO_VALID_RESULT');
      expect(resolved.pnl).toBe(0);
    });
  });

  describe('computePaperTradingState', () => {
    it('computes win rate and P/L', () => {
      const trades: PaperTrade[] = [
        { id: '1', predictionId: '1', timestamp: 1, asset: 'BTC/USD', direction: 'UP', stake: 100, horizon: 10, entryPrice: 67000, payoutPercentage: 87, status: 'WON', pnl: 87, resolvedAt: 2 },
        { id: '2', predictionId: '2', timestamp: 3, asset: 'BTC/USD', direction: 'DOWN', stake: 100, horizon: 10, entryPrice: 67000, payoutPercentage: 87, status: 'LOST', pnl: -100, resolvedAt: 4 },
      ];
      const state = computePaperTradingState(10000, trades);
      expect(state.wins).toBe(1);
      expect(state.losses).toBe(1);
      expect(state.winRate).toBeCloseTo(0.5, 2);
      expect(state.totalPnl).toBe(-13);
      expect(state.balance).toBe(9987);
    });

    it('computes streaks', () => {
      const trades: PaperTrade[] = [
        { id: '1', predictionId: '1', timestamp: 1, asset: 'BTC/USD', direction: 'UP', stake: 100, horizon: 10, entryPrice: 67000, payoutPercentage: 87, status: 'WON', pnl: 87, resolvedAt: 1 },
        { id: '2', predictionId: '2', timestamp: 2, asset: 'BTC/USD', direction: 'UP', stake: 100, horizon: 10, entryPrice: 67000, payoutPercentage: 87, status: 'WON', pnl: 87, resolvedAt: 2 },
        { id: '3', predictionId: '3', timestamp: 3, asset: 'BTC/USD', direction: 'UP', stake: 100, horizon: 10, entryPrice: 67000, payoutPercentage: 87, status: 'LOST', pnl: -100, resolvedAt: 3 },
      ];
      const state = computePaperTradingState(10000, trades);
      // Most recent is LOST
      expect(state.streakType).toBe('LOSS');
      expect(state.currentStreak).toBe(1);
    });
  });
});
