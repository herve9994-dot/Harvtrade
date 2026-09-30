// Core domain types for the 10-Second Forecast Engine

export type Horizon = 2 | 5 | 10 | 15;

export type Direction = 'UP' | 'DOWN' | 'FLAT';

export type SignalQuality = 'STRONG' | 'MODERATE' | 'WEAK' | 'NO_SIGNAL';

export type ConfidenceLevel = 'HIGH' | 'MODERATE' | 'LOW';

export type DataQuality = 'GOOD' | 'DEGRADED' | 'STALE' | 'UNAVAILABLE';

export type MarketCondition = 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'VOLATILE' | 'CALM' | 'UNKNOWN';

export type DataMode = 'LIVE' | 'SYNTHETIC' | 'NONE';

export interface MarketObservation {
  timestamp: number;
  asset: string;
  price: number;
  bid?: number;
  ask?: number;
  spread?: number;
  volume?: number;
  tradeImbalance?: number;
  orderBookImbalance?: number;
  microprice?: number;
  dataQuality: DataQuality;
}

export interface MarketFeatures {
  timestamp: number;
  asset: string;
  priceReturn: number;
  shortTermMomentum: number;
  acceleration: number;
  volatility: number;
  rollingVolatility: number;
  volumeChange: number;
  tradeImbalance: number;
  bidAskSpread: number;
  orderBookImbalance: number | null;
  microprice: number | null;
  shortTermTrend: number;
  meanReversionSignal: number;
  liquidityScore: number;
  price: number;
  dataQuality: DataQuality;
  availableFeatures: string[];
}

export interface ModelOutput {
  modelName: string;
  modelType: 'STATISTICAL' | 'ML' | 'LLM' | 'ENSEMBLE';
  upProbability: number;
  downProbability: number;
  expectedMovement: number;
  confidence: number;
  contribution: number;
  features: string[];
  explanation: string;
}

export interface Prediction {
  id: string;
  timestamp: number;
  asset: string;
  currentPrice: number;
  horizon: Horizon;
  upProbability: number;
  downProbability: number;
  expectedMovement: number;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  signalQuality: SignalQuality;
  direction: Direction | 'NO_SIGNAL';
  modelOutputs: ModelOutput[];
  ensembleOutput: ModelOutput;
  features: MarketFeatures;
  modelAgreement: number;
  modelAgreementTotal: number;
  marketCondition: MarketCondition;
  latency: number;
  dataQuality: DataQuality;
  multiHorizonView?: MultiHorizonView[];
  // Outcome fields (filled after horizon elapses)
  outcomeTimestamp?: number;
  actualPrice?: number;
  actualDirection?: Direction;
  result?: 'CORRECT' | 'INCORRECT' | 'NO_VALID_RESULT';
  resolved?: boolean;
}

export interface MultiHorizonView {
  horizon: Horizon;
  upProbability: number;
  downProbability: number;
  signalQuality: SignalQuality;
  direction: Direction | 'NO_SIGNAL';
  conflict: boolean;
}

export interface PaperTrade {
  id: string;
  predictionId: string;
  timestamp: number;
  asset: string;
  direction: Direction;
  stake: number;
  horizon: Horizon;
  entryPrice: number;
  payoutPercentage: number;
  status: 'OPEN' | 'WON' | 'LOST' | 'NO_VALID_RESULT';
  exitPrice?: number;
  pnl?: number;
  resolvedAt?: number;
}

export interface PredictionQuality {
  horizon: Horizon;
  totalPredictions: number;
  correctPredictions: number;
  incorrectPredictions: number;
  noSignalPredictions: number;
  directionalAccuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  calibration: number;
  averageConfidence: number;
  brierScore: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  maxDrawdown: number;
  simulatedPnl: number;
}

export interface BacktestResult {
  horizon: Horizon;
  asset: string;
  totalPredictions: number;
  correct: number;
  incorrect: number;
  noSignal: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  brierScore: number;
  confusionMatrix: { upCorrect: number; upIncorrect: number; downCorrect: number; downIncorrect: number };
  averagePredictedProbability: number;
  calibration: number;
  maxLosingStreak: number;
  maxWinningStreak: number;
  simulatedPnl: number;
  maxDrawdown: number;
  sharpeLike: number;
  performanceByConfidence: Record<string, { total: number; correct: number }>;
  performanceByMarketCondition: Record<string, { total: number; correct: number }>;
  falsePositiveRate: number;
  directionalHitRate: number;
}

export interface BinaryOptionConfig {
  payoutPercentage: number;
  stake: number;
  horizon: Horizon;
}

export interface BinaryOptionAnalysis {
  payoutPercentage: number;
  stake: number;
  breakEvenWinRate: number;
  currentWinRate: number;
  expectedValue: number;
  profitable: boolean;
  predictionCount: number;
}

export interface DeepAnalysis {
  momentum: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  shortTermTrend: 'UP' | 'SIDEWAYS' | 'DOWN';
  volatility: 'LOW' | 'MEDIUM' | 'HIGH';
  liquidity: 'LOW' | 'MEDIUM' | 'HIGH';
  orderFlow: 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'UNAVAILABLE';
  modelAgreement: 'STRONG' | 'MIXED' | 'WEAK';
  dataQuality: 'GOOD' | 'DEGRADED' | 'STALE';
  finalDecision: Direction | 'NO_SIGNAL';
  explanation: string;
}

export interface AppConfig {
  dataMode: DataMode;
  selectedAsset: string;
  availableAssets: string[];
  selectedHorizon: Horizon;
  availableHorizons: Horizon[];
  autoPredict: boolean;
  autoTrade: boolean;
  paperBalance: number;
  defaultStake: number;
  defaultPayoutPercentage: number;
  confidenceThresholds: {
    high: number;
    moderate: number;
  };
  signalQualityThresholds: {
    strong: number;
    moderate: number;
    weak: number;
  };
  noSignalConditions: {
    maxSpread: number;
    minDataQuality: DataQuality;
    maxModelDisagreement: number;
    minDataPoints: number;
    maxVolatility: number;
  };
  modelWeights: {
    statistical: number;
    ml: number;
    ensemble: number;
  };
  multiHorizonConflictThreshold: number;
  apiKey: string;
  apiEndpoint: string;
  maxStoredObservations: number;
  maxStoredPredictions: number;
}

export interface ModelEvaluation {
  modelType: string;
  asset: string;
  horizon: Horizon;
  marketCondition: MarketCondition;
  totalPredictions: number;
  correct: number;
  accuracy: number;
  weight: number;
}

export interface ChartPoint {
  timestamp: number;
  price: number;
  isPrediction?: boolean;
  predictionDirection?: Direction | 'NO_SIGNAL';
  predictionCorrect?: boolean;
}
