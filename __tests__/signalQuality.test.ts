import { classifyConfidence, classifySignalQuality, classifyMarketCondition, determineDirection } from '../src/forecast/signalQuality';
import type { MarketFeatures, AppConfig } from '../src/domain/types';
import { DEFAULT_CONFIG } from '../src/domain/config';

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
    availableFeatures: ['priceReturn', 'shortTermMomentum', 'volatility', 'bidAskSpread', 'rollingVolatility'],
    ...overrides,
  };
}

describe('signalQuality', () => {
  const config = { ...DEFAULT_CONFIG };

  describe('classifyConfidence', () => {
    it('classifies HIGH above threshold', () => {
      expect(classifyConfidence(0.75, config)).toBe('HIGH');
    });
    it('classifies MODERATE above moderate threshold', () => {
      expect(classifyConfidence(0.58, config)).toBe('MODERATE');
    });
    it('classifies LOW below moderate threshold', () => {
      expect(classifyConfidence(0.40, config)).toBe('LOW');
    });
  });

  describe('classifySignalQuality', () => {
    it('returns NO_SIGNAL for stale data', () => {
      const features = makeFeatures({ dataQuality: 'STALE' });
      expect(classifySignalQuality(0.65, 2, 2, 'STALE', features, config, null)).toBe('NO_SIGNAL');
    });

    it('returns NO_SIGNAL when no features', () => {
      expect(classifySignalQuality(0.65, 2, 2, 'GOOD', null, config, null)).toBe('NO_SIGNAL');
    });

    it('returns NO_SIGNAL when spread is excessive', () => {
      const features = makeFeatures({ bidAskSpread: 100, price: 67000 });
      // bidAskSpread / price = 100/67000 ≈ 0.00149 > maxSpread 0.05... need to adjust
      // Actually maxSpread is 0.05 (5%), so 100/67000 = 0.00149 < 0.05 - should still pass
      // Let's use a truly excessive spread
      const features2 = makeFeatures({ bidAskSpread: 5000, price: 67000 });
      expect(classifySignalQuality(0.65, 2, 2, 'GOOD', features2, config, null)).toBe('NO_SIGNAL');
    });

    it('returns NO_SIGNAL when volatility is abnormal', () => {
      const features = makeFeatures({ rollingVolatility: 0.01 });
      expect(classifySignalQuality(0.65, 2, 2, 'GOOD', features, config, null)).toBe('NO_SIGNAL');
    });

    it('returns STRONG for high probability + full agreement + good data', () => {
      const features = makeFeatures({ rollingVolatility: 0.0005, bidAskSpread: 0.001, price: 67000 });
      // prob separation = |0.65 - 0.5| * 2 = 0.3 → 30% > strong threshold 65%? No.
      // Need higher probability. Let's use 0.85
      expect(classifySignalQuality(0.85, 2, 2, 'GOOD', features, config, null)).toBe('STRONG');
    });

    it('downgrades when recent accuracy is poor', () => {
      const features = makeFeatures({ rollingVolatility: 0.0005, bidAskSpread: 0.001, price: 67000 });
      // With 45% accuracy, penalty of 0.1 reduces effective separation
      const result = classifySignalQuality(0.58, 2, 2, 'GOOD', features, config, 0.45);
      expect(result).not.toBe('STRONG');
    });
  });

  describe('classifyMarketCondition', () => {
    it('classifies volatile market', () => {
      expect(classifyMarketCondition(makeFeatures({ rollingVolatility: 0.002 }))).toBe('VOLATILE');
    });
    it('classifies calm market', () => {
      expect(classifyMarketCondition(makeFeatures({ rollingVolatility: 0.0002 }))).toBe('CALM');
    });
    it('classifies trending up', () => {
      expect(classifyMarketCondition(makeFeatures({ shortTermTrend: 0.0002, rollingVolatility: 0.0005 }))).toBe('TRENDING_UP');
    });
    it('classifies trending down', () => {
      expect(classifyMarketCondition(makeFeatures({ shortTermTrend: -0.0002, rollingVolatility: 0.0005 }))).toBe('TRENDING_DOWN');
    });
    it('classifies ranging', () => {
      expect(classifyMarketCondition(makeFeatures({ shortTermTrend: 0.00001, rollingVolatility: 0.0005 }))).toBe('RANGING');
    });
  });

  describe('determineDirection', () => {
    it('returns NO_SIGNAL when signal quality is NO_SIGNAL', () => {
      expect(determineDirection(0.7, 'NO_SIGNAL')).toBe('NO_SIGNAL');
    });
    it('returns UP when probability > 0.5', () => {
      expect(determineDirection(0.65, 'MODERATE')).toBe('UP');
    });
    it('returns DOWN when probability < 0.5', () => {
      expect(determineDirection(0.35, 'MODERATE')).toBe('DOWN');
    });
  });
});
