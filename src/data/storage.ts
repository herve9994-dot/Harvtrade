import type {
  AppConfig,
  Prediction,
  MarketObservation,
  PaperTrade,
  ModelEvaluation,
  Horizon,
} from '@/domain/types';
import { DEFAULT_CONFIG } from '@/domain/config';

const KEYS = {
  CONFIG: 'forecast_config',
  PREDICTIONS: 'forecast_predictions',
  OBSERVATIONS: 'forecast_observations',
  TRADES: 'forecast_trades',
  EVALUATIONS: 'forecast_evaluations',
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write failed', e);
  }
}

export const storage = {
  getConfig(): AppConfig {
    return { ...DEFAULT_CONFIG, ...safeGet<Partial<AppConfig>>(KEYS.CONFIG, {}) };
  },

  setConfig(config: AppConfig): void {
    safeSet(KEYS.CONFIG, config);
  },

  getPredictions(): Prediction[] {
    return safeGet<Prediction[]>(KEYS.PREDICTIONS, []);
  },

  savePredictions(predictions: Prediction[]): void {
    safeSet(KEYS.PREDICTIONS, predictions);
  },

  addPrediction(prediction: Prediction, maxStored: number): void {
    const existing = this.getPredictions();
    existing.unshift(prediction);
    const trimmed = existing.slice(0, maxStored);
    this.savePredictions(trimmed);
  },

  updatePrediction(updated: Prediction): void {
    const existing = this.getPredictions();
    const idx = existing.findIndex((p) => p.id === updated.id);
    if (idx >= 0) {
      existing[idx] = updated;
      this.savePredictions(existing);
    }
  },

  getObservations(): MarketObservation[] {
    return safeGet<MarketObservation[]>(KEYS.OBSERVATIONS, []);
  },

  saveObservations(observations: MarketObservation[]): void {
    safeSet(KEYS.OBSERVATIONS, observations);
  },

  addObservation(obs: MarketObservation, maxStored: number): void {
    const existing = this.getObservations();
    existing.push(obs);
    const trimmed = existing.slice(-maxStored);
    this.saveObservations(trimmed);
  },

  getTrades(): PaperTrade[] {
    return safeGet<PaperTrade[]>(KEYS.TRADES, []);
  },

  saveTrades(trades: PaperTrade[]): void {
    safeSet(KEYS.TRADES, trades);
  },

  addTrade(trade: PaperTrade): void {
    const existing = this.getTrades();
    existing.unshift(trade);
    this.saveTrades(existing);
  },

  updateTrade(updated: PaperTrade): void {
    const existing = this.getTrades();
    const idx = existing.findIndex((t) => t.id === updated.id);
    if (idx >= 0) {
      existing[idx] = updated;
      this.saveTrades(existing);
    }
  },

  getEvaluations(): ModelEvaluation[] {
    return safeGet<ModelEvaluation[]>(KEYS.EVALUATIONS, []);
  },

  saveEvaluations(evaluations: ModelEvaluation[]): void {
    safeSet(KEYS.EVALUATIONS, evaluations);
  },

  resetAll(): void {
    localStorage.removeItem(KEYS.PREDICTIONS);
    localStorage.removeItem(KEYS.OBSERVATIONS);
    localStorage.removeItem(KEYS.TRADES);
    localStorage.removeItem(KEYS.EVALUATIONS);
  },

  resetPredictions(): void {
    localStorage.removeItem(KEYS.PREDICTIONS);
    localStorage.removeItem(KEYS.TRADES);
    localStorage.removeItem(KEYS.EVALUATIONS);
  },
};

export function getHorizonPredictions(predictions: Prediction[], horizon: Horizon): Prediction[] {
  return predictions.filter((p) => p.horizon === horizon && p.resolved === true);
}
