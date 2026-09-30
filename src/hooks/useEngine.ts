import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  AppConfig,
  MarketObservation,
  Prediction,
  PaperTrade,
  DataMode,
} from '@/domain/types';
import { storage } from '@/data/storage';
import { createProvider, type MarketDataProvider } from '@/data/MarketDataProvider';
import { generateForecast, type ForecastResult } from '@/forecast/forecastEngine';
import { createPaperTrade, resolvePaperTrade, computePaperTradingState } from '@/papertrading/paperTradingEngine';
import { mlModel } from '@/models/mlModel';
import { classifyDirection } from '@/domain/config';

export interface EngineState {
  config: AppConfig;
  observations: MarketObservation[];
  currentPrice: number | null;
  dataStatus: string;
  provider: MarketDataProvider | null;
  predictions: Prediction[];
  currentPrediction: Prediction | null;
  forecastResult: ForecastResult | null;
  countdown: number;
  isPredicting: boolean;
  trades: PaperTrade[];
  paperTradingState: ReturnType<typeof computePaperTradingState>;
}

export function useEngine() {
  const [config, setConfig] = useState<AppConfig>(storage.getConfig());
  const [observations, setObservations] = useState<MarketObservation[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [dataStatus, setDataStatus] = useState<string>('Market data provider not configured.');
  const [predictions, setPredictions] = useState<Prediction[]>(storage.getPredictions());
  const [currentPrediction, setCurrentPrediction] = useState<Prediction | null>(null);
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [isPredicting, setIsPredicting] = useState(false);
  const [trades, setTrades] = useState<PaperTrade[]>(storage.getTrades());

  const providerRef = useRef<MarketDataProvider | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingPredictionRef = useRef<Prediction | null>(null);
  const observationsRef = useRef<MarketObservation[]>([]);
  const configRef = useRef<AppConfig>(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    observationsRef.current = observations;
  }, [observations]);

  // Update paper trading state
  const paperTradingState = computePaperTradingState(config.paperBalance, trades);

  // Connect to provider
  const connectProvider = useCallback(async (cfg: AppConfig) => {
    // Disconnect existing
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (providerRef.current) {
      providerRef.current.disconnect();
    }

    const provider = createProvider({ dataMode: cfg.dataMode, apiKey: cfg.apiKey, apiEndpoint: cfg.apiEndpoint });
    providerRef.current = provider;

    if (!provider.isConfigured()) {
      setDataStatus('Market data provider not configured.');
      setCurrentPrice(null);
      return;
    }

    try {
      await provider.connect(cfg.selectedAsset);
      setDataStatus(provider.mode === 'SYNTHETIC' ? 'SYNTHETIC DATA — Development mode' : 'Connected');

      const unsub = provider.subscribe(cfg.selectedAsset, (obs: MarketObservation) => {
        setObservations((prev) => {
          const next = [...prev, obs];
          return next.slice(-cfg.maxStoredObservations);
        });
        setCurrentPrice(obs.price);
        storage.addObservation(obs, cfg.maxStoredObservations);
      });
      unsubscribeRef.current = unsub;
    } catch (e) {
      setDataStatus(`Connection error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, []);

  // Reconnect when config changes
  useEffect(() => {
    connectProvider(config);
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.disconnect();
      }
    };
  }, [config.dataMode, config.selectedAsset, config.apiKey, config.apiEndpoint]);

  // Clean up countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const generatePrediction = useCallback(async (): Promise<Prediction | null> => {
    const cfg = configRef.current;
    const obs = observationsRef.current;

    if (obs.length < 5) return null;

    const result = generateForecast(obs, cfg, predictions);
    setForecastResult(result);

    if (!result.prediction) return null;

    const pred = result.prediction;
    setCurrentPrediction(pred);
    storage.addPrediction(pred, cfg.maxStoredPredictions);
    setPredictions(storage.getPredictions());

    // Auto paper trade
    if (cfg.autoTrade && pred.direction !== 'NO_SIGNAL') {
      const trade = createPaperTrade(pred, cfg);
      if (trade) {
        storage.addTrade(trade);
        setTrades(storage.getTrades());
      }
    }

    return pred;
  }, [predictions]);

  const startCountdown = useCallback((pred: Prediction) => {
    pendingPredictionRef.current = pred;
    const horizonMs = pred.horizon * 1000;
    const startTime = Date.now();

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    setCountdown(pred.horizon);

    countdownRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (horizonMs - elapsed) / 1000);
      setCountdown(remaining);

      if (remaining <= 0) {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }

        // Resolve prediction
        const cfg = configRef.current;
        const obs = observationsRef.current;
        const latestObs = obs[obs.length - 1];

        if (latestObs && pendingPredictionRef.current) {
          const pending = pendingPredictionRef.current;
          const actualPrice = latestObs.price;
          const movement = (actualPrice - pending.currentPrice) / pending.currentPrice;
          const actualDirection = classifyDirection(movement);
          const result = actualDirection === 'FLAT' ? 'NO_VALID_RESULT' as const
            : (pending.direction === actualDirection ? 'CORRECT' as const : 'INCORRECT' as const);

          const resolved: Prediction = {
            ...pending,
            outcomeTimestamp: latestObs.timestamp,
            actualPrice,
            actualDirection,
            result,
            resolved: true,
          };

          storage.updatePrediction(resolved);
          setPredictions(storage.getPredictions());
          setCurrentPrediction(resolved);
          pendingPredictionRef.current = null;

          // Train ML model
          if (actualDirection !== 'FLAT' && pending.features) {
            mlModel.train(pending.features, actualDirection);
          }

          // Resolve any open paper trades for this prediction
          const openTrades = storage.getTrades().filter(
            (t) => t.predictionId === pending.id && t.status === 'OPEN'
          );
          for (const trade of openTrades) {
            const resolved = resolvePaperTrade(trade, actualPrice, actualDirection);
            storage.updateTrade(resolved);
          }
          setTrades(storage.getTrades());
        }

        // Auto-predict next cycle
        if (configRef.current.autoPredict) {
          setTimeout(() => {
            generatePrediction().then((nextPred) => {
              if (nextPred) {
                startCountdown(nextPred);
              }
            });
          }, 500);
        }
      }
    }, 100);
  }, [generatePrediction]);

  const startForecastCycle = useCallback(async () => {
    if (isPredicting) return;
    setIsPredicting(true);
    const pred = await generatePrediction();
    if (pred) {
      startCountdown(pred);
    }
    setIsPredicting(false);
  }, [isPredicting, generatePrediction, startCountdown]);

  const stopForecastCycle = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(0);
    setCurrentPrediction(null);
  }, []);

  const updateConfig = useCallback((updates: Partial<AppConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      storage.setConfig(next);
      return next;
    });
  }, []);

  const setDataMode = useCallback((mode: DataMode) => {
    updateConfig({ dataMode: mode });
  }, [updateConfig]);

  const resetSimulation = useCallback(() => {
    storage.resetPredictions();
    setPredictions([]);
    setTrades([]);
    setCurrentPrediction(null);
    setForecastResult(null);
    setObservations([]);
    storage.saveObservations([]);
  }, []);

  const resetAllData = useCallback(() => {
    storage.resetAll();
    setPredictions([]);
    setTrades([]);
    setObservations([]);
    setCurrentPrediction(null);
    setForecastResult(null);
    setCurrentPrice(null);
  }, []);

  const manualTrade = useCallback(() => {
    if (!currentPrediction || currentPrediction.direction === 'NO_SIGNAL') return;
    const trade = createPaperTrade(currentPrediction, configRef.current);
    if (trade) {
      storage.addTrade(trade);
      setTrades(storage.getTrades());
    }
  }, [currentPrediction]);

  return {
    config,
    observations,
    currentPrice,
    dataStatus,
    predictions,
    currentPrediction,
    forecastResult,
    countdown,
    isPredicting,
    trades,
    paperTradingState,
    startForecastCycle,
    stopForecastCycle,
    updateConfig,
    setDataMode,
    resetSimulation,
    resetAllData,
    manualTrade,
  };
}
