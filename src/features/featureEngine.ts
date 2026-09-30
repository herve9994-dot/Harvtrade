import type { MarketObservation, MarketFeatures, DataQuality } from '@/domain/types';

export function computeFeatures(observations: MarketObservation[], asset: string, refTime?: number): MarketFeatures | null {
  if (observations.length < 5) return null;

  const obs = observations.slice(-60);
  const prices = obs.map((o) => o.price);
  const currentPrice = prices[prices.length - 1];
  const timestamp = obs[obs.length - 1].timestamp;

  const availableFeatures: string[] = [];

  // Price return (last tick)
  const prevPrice = prices[prices.length - 2] ?? currentPrice;
  const priceReturn = (currentPrice - prevPrice) / prevPrice;
  availableFeatures.push('priceReturn');

  // Short-term momentum (last N ticks)
  const momentumWindow = Math.min(10, prices.length - 1);
  const momentumStart = prices[prices.length - 1 - momentumWindow] ?? currentPrice;
  const shortTermMomentum = (currentPrice - momentumStart) / momentumStart;
  availableFeatures.push('shortTermMomentum');

  // Acceleration (change of returns)
  const recentReturns: number[] = [];
  for (let i = Math.max(1, prices.length - 10); i < prices.length; i++) {
    recentReturns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const firstHalf = recentReturns.slice(0, Math.floor(recentReturns.length / 2));
  const secondHalf = recentReturns.slice(Math.floor(recentReturns.length / 2));
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / Math.max(1, firstHalf.length);
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / Math.max(1, secondHalf.length);
  const acceleration = avgSecond - avgFirst;
  availableFeatures.push('acceleration');

  // Volatility (std of recent returns)
  const meanReturn = recentReturns.reduce((a, b) => a + b, 0) / Math.max(1, recentReturns.length);
  const variance = recentReturns.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) / Math.max(1, recentReturns.length);
  const volatility = Math.sqrt(variance);
  availableFeatures.push('volatility');

  // Rolling volatility (longer window)
  const longReturns: number[] = [];
  for (let i = Math.max(1, prices.length - 30); i < prices.length; i++) {
    longReturns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const longMean = longReturns.reduce((a, b) => a + b, 0) / Math.max(1, longReturns.length);
  const longVar = longReturns.reduce((sum, r) => sum + (r - longMean) ** 2, 0) / Math.max(1, longReturns.length);
  const rollingVolatility = Math.sqrt(longVar);
  availableFeatures.push('rollingVolatility');

  // Volume change
  const volumes = obs.map((o) => o.volume ?? 0).filter((v) => v > 0);
  let volumeChange = 0;
  if (volumes.length >= 4) {
    const recentVol = volumes.slice(-2).reduce((a, b) => a + b, 0) / 2;
    const olderVol = volumes.slice(-4, -2).reduce((a, b) => a + b, 0) / 2;
    volumeChange = olderVol > 0 ? (recentVol - olderVol) / olderVol : 0;
    availableFeatures.push('volumeChange');
  }

  // Trade imbalance
  const tradeImbalance = obs[obs.length - 1].tradeImbalance ?? 0;
  if (obs[obs.length - 1].tradeImbalance !== undefined) {
    availableFeatures.push('tradeImbalance');
  }

  // Bid/ask spread
  const lastObs = obs[obs.length - 1];
  const bidAskSpread = lastObs.spread ?? 0;
  if (lastObs.spread !== undefined) {
    availableFeatures.push('bidAskSpread');
  }

  // Order book imbalance (may not be available)
  const orderBookImbalance = lastObs.orderBookImbalance ?? null;
  if (lastObs.orderBookImbalance !== undefined) {
    availableFeatures.push('orderBookImbalance');
  }

  // Microprice
  const microprice = lastObs.microprice ?? null;
  if (lastObs.microprice !== undefined) {
    availableFeatures.push('microprice');
  }

  // Short-term trend (linear regression slope of last N prices)
  const trendWindow = Math.min(20, prices.length);
  const trendPrices = prices.slice(-trendWindow);
  const n = trendPrices.length;
  const xMean = (n - 1) / 2;
  const yMean = trendPrices.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (trendPrices[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  const shortTermTrend = slope / currentPrice;
  availableFeatures.push('shortTermTrend');

  // Mean reversion signal (z-score of current price vs recent mean)
  const meanPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const stdPrice = Math.sqrt(prices.reduce((sum, p) => sum + (p - meanPrice) ** 2, 0) / prices.length);
  const zScore = stdPrice > 0 ? (currentPrice - meanPrice) / stdPrice : 0;
  const meanReversionSignal = -zScore;
  availableFeatures.push('meanReversionSignal');

  // Liquidity score (based on volume and spread)
  const liquidityScore = Math.max(0, Math.min(1, 0.5 + (volumeChange * 0.3) - (bidAskSpread / currentPrice * 50)));
  availableFeatures.push('liquidityScore');

  // Data quality
  const lastTimestamp = obs[obs.length - 1].timestamp;
  const ageMs = (refTime ?? Date.now()) - lastTimestamp;
  let dataQuality: DataQuality = 'GOOD';
  if (ageMs > 5000) dataQuality = 'STALE';
  else if (ageMs > 2000) dataQuality = 'DEGRADED';
  if (observations.length < 10) dataQuality = 'DEGRADED';

  return {
    timestamp,
    asset,
    priceReturn,
    shortTermMomentum,
    acceleration,
    volatility,
    rollingVolatility,
    volumeChange,
    tradeImbalance,
    bidAskSpread,
    orderBookImbalance,
    microprice,
    shortTermTrend,
    meanReversionSignal,
    liquidityScore,
    price: currentPrice,
    dataQuality,
    availableFeatures,
  };
}
