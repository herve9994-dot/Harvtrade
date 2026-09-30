import type { AppConfig, Horizon } from '@/domain/types';

export const ASSETS = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'EUR/USD', 'GBP/USD', 'SPX500/USD', 'XAU/USD'];

export const HORIZONS: Horizon[] = [2, 5, 10, 15];

export const DEFAULT_CONFIG: AppConfig = {
  dataMode: 'NONE',
  selectedAsset: 'BTC/USD',
  availableAssets: ASSETS,
  selectedHorizon: 10,
  availableHorizons: HORIZONS,
  autoPredict: true,
  autoTrade: false,
  paperBalance: 10000,
  defaultStake: 100,
  defaultPayoutPercentage: 87,
  confidenceThresholds: {
    high: 70,
    moderate: 55,
  },
  signalQualityThresholds: {
    strong: 65,
    moderate: 58,
    weak: 52,
  },
  noSignalConditions: {
    maxSpread: 0.05,
    minDataQuality: 'DEGRADED',
    maxModelDisagreement: 0.25,
    minDataPoints: 20,
    maxVolatility: 0.005,
  },
  modelWeights: {
    statistical: 0.5,
    ml: 0.5,
    ensemble: 1.0,
  },
  multiHorizonConflictThreshold: 0.15,
  apiKey: '',
  apiEndpoint: '',
  maxStoredObservations: 10000,
  maxStoredPredictions: 5000,
};

export const FLAT_THRESHOLD = 0.0001;

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function classifyDirection(movement: number, threshold = FLAT_THRESHOLD): 'UP' | 'DOWN' | 'FLAT' {
  if (movement > threshold) return 'UP';
  if (movement < -threshold) return 'DOWN';
  return 'FLAT';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function formatPrice(price: number, asset: string): string {
  if (asset.includes('BTC')) return price.toFixed(2);
  if (asset.includes('ETH')) return price.toFixed(2);
  if (asset.includes('XAU')) return price.toFixed(2);
  if (asset.includes('EUR') || asset.includes('GBP')) return price.toFixed(5);
  return price.toFixed(2);
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatSignedPercentage(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(3)}%`;
}

export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString('en-US', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
