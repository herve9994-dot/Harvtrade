import type { MarketObservation, DataMode, DataQuality } from '@/domain/types';
import { generateId } from '@/domain/config';

export interface MarketDataProvider {
  readonly name: string;
  readonly mode: DataMode;
  connect(asset: string): Promise<void>;
  disconnect(): void;
  subscribe(asset: string, callback: (obs: MarketObservation) => void): () => void;
  isConfigured(): boolean;
}

interface ProviderConfig {
  apiKey: string;
  apiEndpoint: string;
}

export class LiveMarketDataProvider implements MarketDataProvider {
  readonly name = 'Live Market Data';
  readonly mode: DataMode = 'LIVE';
  private config: ProviderConfig;
  private connected = false;
  private currentAsset = '';
  private ws: WebSocket | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private subscribers: Map<string, (obs: MarketObservation) => void> = new Map();

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.apiEndpoint);
  }

  async connect(_asset: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Live provider not configured: missing API key or endpoint');
    }
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  subscribe(asset: string, callback: (obs: MarketObservation) => void): () => void {
    const subId = generateId();
    this.subscribers.set(subId, callback);
    this.currentAsset = asset;

    // In a real implementation, this would connect to a WebSocket or polling API.
    // For now, it's a placeholder that will be connected when credentials are provided.
    // The actual polling/fetch logic would go here, calling callback() with each new observation.

    return () => {
      this.subscribers.delete(subId);
    };
  }

  private emit(obs: MarketObservation) {
    this.subscribers.forEach((cb) => cb(obs));
  }
}

export class SyntheticMarketDataProvider implements MarketDataProvider {
  readonly name = 'Synthetic Data (DEVELOPMENT)';
  readonly mode: DataMode = 'SYNTHETIC';
  private currentAsset = '';
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private subscribers: Map<string, (obs: MarketObservation) => void> = new Map();
  private prices: Map<string, number> = new Map();
  private lastPrices: Map<string, number> = new Map();
  private drift: Map<string, number> = new Map();
  private vol: Map<string, number> = new Map();
  private tick = 0;

  private basePrices: Record<string, number> = {
    'BTC/USD': 67000,
    'ETH/USD': 3500,
    'SOL/USD': 165,
    'EUR/USD': 1.085,
    'GBP/USD': 1.27,
    'SPX500/USD': 5400,
    'XAU/USD': 2350,
  };

  isConfigured(): boolean {
    return true;
  }

  async connect(asset: string): Promise<void> {
    this.currentAsset = asset;
    if (!this.prices.has(asset)) {
      const base = this.basePrices[asset] ?? 100;
      this.prices.set(asset, base);
      this.lastPrices.set(asset, base);
      this.drift.set(asset, 0);
      this.vol.set(asset, 0.0008);
    }
  }

  disconnect(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.subscribers.clear();
  }

  subscribe(asset: string, callback: (obs: MarketObservation) => void): () => void {
    const subId = generateId();
    this.subscribers.set(subId, callback);
    this.currentAsset = asset;

    if (!this.prices.has(asset)) {
      const base = this.basePrices[asset] ?? 100;
      this.prices.set(asset, base);
      this.lastPrices.set(asset, base);
      this.drift.set(asset, 0);
      this.vol.set(asset, 0.0008);
    }

    if (!this.intervalId) {
      this.intervalId = setInterval(() => this.tickFn(), 1000);
    }

    return () => {
      this.subscribers.delete(subId);
      if (this.subscribers.size === 0 && this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    };
  }

  private tickFn(): void {
    this.tick++;
    const asset = this.currentAsset;
    const price = this.prices.get(asset) ?? 100;
    const lastPrice = this.lastPrices.get(asset) ?? price;
    const currentDrift = this.drift.get(asset) ?? 0;
    const currentVol = this.vol.get(asset) ?? 0.0008;

    // Occasionally shift drift to create trends
    if (this.tick % 15 === 0) {
      this.drift.set(asset, (Math.random() - 0.5) * 0.0004);
    }

    // Occasionally shift volatility
    if (this.tick % 20 === 0) {
      this.vol.set(asset, 0.0003 + Math.random() * 0.0012);
    }

    // Geometric Brownian motion-like step
    const noise = this.gaussian() * currentVol;
    const newPrice = price * (1 + currentDrift + noise);
    this.lastPrices.set(asset, price);
    this.prices.set(asset, newPrice);

    const bid = newPrice * (1 - 0.0001);
    const ask = newPrice * (1 + 0.0001);
    const spread = ask - bid;
    const volume = 0.5 + Math.random() * 5;
    const tradeImbalance = Math.random() - 0.5;
    const orderBookImbalance = Math.random() - 0.5;
    const microprice = (bid * 0.5 + ask * 0.5);

    const obs: MarketObservation = {
      timestamp: Date.now(),
      asset,
      price: newPrice,
      bid,
      ask,
      spread,
      volume,
      tradeImbalance,
      orderBookImbalance,
      microprice,
      dataQuality: 'GOOD',
    };

    this.subscribers.forEach((cb) => cb(obs));
  }

  private gaussian(): number {
    // Box-Muller transform
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

export class NullMarketDataProvider implements MarketDataProvider {
  readonly name = 'No Provider';
  readonly mode: DataMode = 'NONE';

  isConfigured(): boolean {
    return false;
  }

  async connect(): Promise<void> {}

  disconnect(): void {}

  subscribe(_asset: string, _callback: (obs: MarketObservation) => void): () => void {
    return () => {};
  }
}

export function createProvider(config: {
  dataMode: DataMode;
  apiKey: string;
  apiEndpoint: string;
}): MarketDataProvider {
  switch (config.dataMode) {
    case 'SYNTHETIC':
      return new SyntheticMarketDataProvider();
    case 'LIVE':
      return new LiveMarketDataProvider({ apiKey: config.apiKey, apiEndpoint: config.apiEndpoint });
    default:
      return new NullMarketDataProvider();
  }
}
