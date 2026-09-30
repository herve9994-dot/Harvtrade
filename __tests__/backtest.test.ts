import { runBacktest } from '../src/backtest/backtestEngine';
import type { MarketObservation, AppConfig } from '../src/domain/types';
import { DEFAULT_CONFIG } from '../src/domain/config';

function makeTrendingObservations(count: number, basePrice = 100): MarketObservation[] {
  const obs: MarketObservation[] = [];
  let price = basePrice;
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    price *= 1 + 0.0002 + (Math.random() - 0.5) * 0.0003;
    obs.push({
      timestamp: now - (count - i) * 1000,
      asset: 'BTC/USD',
      price,
      bid: price * 0.9999,
      ask: price * 1.0001,
      spread: price * 0.0002,
      volume: 1 + Math.random() * 3,
      tradeImbalance: 0.1,
      orderBookImbalance: 0.1,
      microprice: price,
      dataQuality: 'GOOD',
    });
  }
  return obs;
}

function makeVolatileObservations(count: number, basePrice = 100): MarketObservation[] {
  const obs: MarketObservation[] = [];
  let price = basePrice;
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    price *= 1 + (Math.random() - 0.5) * 0.003;
    obs.push({
      timestamp: now - (count - i) * 1000,
      asset: 'BTC/USD',
      price,
      bid: price * 0.9999,
      ask: price * 1.0001,
      spread: price * 0.0002,
      volume: 1 + Math.random() * 3,
      tradeImbalance: 0,
      orderBookImbalance: 0,
      microprice: price,
      dataQuality: 'GOOD',
    });
  }
  return obs;
}

describe('backtestEngine', () => {
  const config: AppConfig = {
    ...DEFAULT_CONFIG,
    signalQualityThresholds: { strong: 30, moderate: 20, weak: 10 },
    noSignalConditions: {
      ...DEFAULT_CONFIG.noSignalConditions,
      maxVolatility: 0.01,
      minDataPoints: 10,
    },
  };

  it('runs backtest on trending data', () => {
    const obs = makeTrendingObservations(200);
    const result = runBacktest(obs, config, {
      asset: 'BTC/USD',
      horizon: 10,
      payoutPercentage: 87,
      stake: 100,
      includeNoSignal: true,
    });
    expect(result.totalPredictions + result.noSignal).toBeGreaterThan(0);
    expect(result.horizon).toBe(10);
    expect(result.asset).toBe('BTC/USD');
    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.accuracy).toBeLessThanOrEqual(1);
  });

  it('computes confusion matrix', () => {
    const obs = makeTrendingObservations(60);
    const result = runBacktest(obs, config, {
      asset: 'BTC/USD',
      horizon: 5,
      payoutPercentage: 87,
      stake: 100,
      includeNoSignal: true,
    });
    const cm = result.confusionMatrix;
    expect(cm.upCorrect + cm.upIncorrect + cm.downCorrect + cm.downIncorrect).toBe(result.totalPredictions);
  });

  it('computes Brier score in valid range', () => {
    const obs = makeVolatileObservations(80);
    const result = runBacktest(obs, config, {
      asset: 'BTC/USD',
      horizon: 10,
      payoutPercentage: 87,
      stake: 100,
      includeNoSignal: true,
    });
    expect(result.brierScore).toBeGreaterThanOrEqual(0);
    expect(result.brierScore).toBeLessThanOrEqual(1);
  });

  it('computes simulated P/L', () => {
    const obs = makeTrendingObservations(80);
    const result = runBacktest(obs, config, {
      asset: 'BTC/USD',
      horizon: 10,
      payoutPercentage: 87,
      stake: 100,
      includeNoSignal: false,
    });
    expect(typeof result.simulatedPnl).toBe('number');
    expect(typeof result.maxDrawdown).toBe('number');
    expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
  });

  it('tracks no-signal predictions separately', () => {
    const obs = makeVolatileObservations(60);
    const result = runBacktest(obs, config, {
      asset: 'BTC/USD',
      horizon: 10,
      payoutPercentage: 87,
      stake: 100,
      includeNoSignal: true,
    });
    expect(result.noSignal).toBeGreaterThanOrEqual(0);
    expect(result.totalPredictions + result.noSignal).toBeGreaterThan(0);
  });
});
