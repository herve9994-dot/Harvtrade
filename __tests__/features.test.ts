import { computeFeatures } from '../src/features/featureEngine';
import type { MarketObservation } from '../src/domain/types';

function makeObservations(count: number, basePrice = 100): MarketObservation[] {
  const obs: MarketObservation[] = [];
  let price = basePrice;
  for (let i = 0; i < count; i++) {
    price *= 1 + (Math.random() - 0.5) * 0.001;
    obs.push({
      timestamp: Date.now() - (count - i) * 1000,
      asset: 'BTC/USD',
      price,
      bid: price * 0.9999,
      ask: price * 1.0001,
      spread: price * 0.0002,
      volume: 1 + Math.random() * 3,
      tradeImbalance: Math.random() - 0.5,
      orderBookImbalance: Math.random() - 0.5,
      microprice: price,
      dataQuality: 'GOOD',
    });
  }
  return obs;
}

describe('featureEngine', () => {
  it('returns null for insufficient data', () => {
    expect(computeFeatures(makeObservations(3), 'BTC/USD')).toBeNull();
  });

  it('computes features for 5+ observations', () => {
    const features = computeFeatures(makeObservations(20), 'BTC/USD');
    expect(features).not.toBeNull();
    expect(features!.asset).toBe('BTC/USD');
    expect(features!.availableFeatures).toContain('priceReturn');
    expect(features!.availableFeatures).toContain('shortTermMomentum');
    expect(features!.availableFeatures).toContain('volatility');
  });

  it('computes priceReturn correctly', () => {
    const obs = makeObservations(10, 100);
    const last = obs[obs.length - 1];
    const prev = obs[obs.length - 2];
    const features = computeFeatures(obs, 'BTC/USD');
    const expected = (last.price - prev.price) / prev.price;
    expect(features!.priceReturn).toBeCloseTo(expected, 8);
  });

  it('includes orderBookImbalance when available', () => {
    const features = computeFeatures(makeObservations(10), 'BTC/USD');
    expect(features!.orderBookImbalance).not.toBeNull();
    expect(features!.availableFeatures).toContain('orderBookImbalance');
  });

  it('marks data quality as GOOD for recent data', () => {
    const features = computeFeatures(makeObservations(20), 'BTC/USD');
    expect(features!.dataQuality).toBe('GOOD');
  });
});
