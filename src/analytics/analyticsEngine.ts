import type { Prediction, Horizon, PredictionQuality, ModelEvaluation } from '@/domain/types';

export function computePredictionQuality(
  predictions: Prediction[],
  horizon: Horizon
): PredictionQuality {
  const horizonPredictions = predictions.filter((p) => p.horizon === horizon && p.resolved === true);

  const total = horizonPredictions.length;
  const correct = horizonPredictions.filter((p) => p.result === 'CORRECT').length;
  const incorrect = horizonPredictions.filter((p) => p.result === 'INCORRECT').length;
  const noSignal = horizonPredictions.filter((p) => p.result === 'NO_VALID_RESULT' || p.direction === 'NO_SIGNAL').length;

  const validPredictions = horizonPredictions.filter((p) => p.result === 'CORRECT' || p.result === 'INCORRECT');
  const directionalAccuracy = validPredictions.length > 0 ? correct / validPredictions.length : 0;

  // Precision/Recall
  const upPredictions = validPredictions.filter((p) => p.direction === 'UP');
  const upCorrect = upPredictions.filter((p) => p.result === 'CORRECT').length;
  const actualUps = validPredictions.filter((p) => p.actualDirection === 'UP');
  const precision = upPredictions.length > 0 ? upCorrect / upPredictions.length : 0;
  const recall = actualUps.length > 0 ? upCorrect / actualUps.length : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // Brier score
  const brierScore = validPredictions.length > 0
    ? validPredictions.reduce((sum, p) => {
        const predicted = p.direction === 'UP' ? p.upProbability : 1 - p.upProbability;
        const actual = p.actualDirection === 'UP' ? 1 : 0;
        return sum + (predicted - actual) ** 2;
      }, 0) / validPredictions.length
    : 0;

  // Calibration
  const avgConfidence = validPredictions.length > 0
    ? validPredictions.reduce((sum, p) => sum + p.confidence, 0) / validPredictions.length
    : 0;
  const calibration = Math.abs(avgConfidence - directionalAccuracy);

  // Streaks
  const sorted = [...validPredictions].sort((a, b) => a.timestamp - b.timestamp);
  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxDrawdown = 0;
  let peakPnl = 0;
  let runningPnl = 0;
  let simPnl = 0;

  for (const p of sorted) {
    const pnl = p.result === 'CORRECT' ? 1 : -1;
    simPnl += pnl;
    runningPnl += pnl;
    if (p.result === 'CORRECT') {
      currentWinStreak++;
      currentLossStreak = 0;
      consecutiveWins = Math.max(consecutiveWins, currentWinStreak);
    } else {
      currentLossStreak++;
      currentWinStreak = 0;
      consecutiveLosses = Math.max(consecutiveLosses, currentLossStreak);
    }
    peakPnl = Math.max(peakPnl, runningPnl);
    maxDrawdown = Math.max(maxDrawdown, peakPnl - runningPnl);
  }

  return {
    horizon,
    totalPredictions: total,
    correctPredictions: correct,
    incorrectPredictions: incorrect,
    noSignalPredictions: noSignal,
    directionalAccuracy,
    precision,
    recall,
    f1Score,
    calibration,
    averageConfidence: avgConfidence,
    brierScore,
    consecutiveWins,
    consecutiveLosses,
    maxDrawdown,
    simulatedPnl: simPnl,
  };
}

export function computeAllHorizonQuality(predictions: Prediction[], horizons: Horizon[]): PredictionQuality[] {
  return horizons.map((h) => computePredictionQuality(predictions, h));
}

export function computeModelEvaluations(predictions: Prediction[]): ModelEvaluation[] {
  const evaluations: Map<string, ModelEvaluation> = new Map();

  for (const pred of predictions) {
    if (!pred.resolved || pred.result === 'NO_VALID_RESULT') continue;

    for (const modelOutput of pred.modelOutputs) {
      const key = `${modelOutput.modelType}-${pred.asset}-${pred.horizon}-${pred.marketCondition}`;
      const existing = evaluations.get(key);
      const modelDirection = modelOutput.upProbability > 0.5 ? 'UP' : 'DOWN';
      const isCorrect = modelDirection === pred.actualDirection;

      if (existing) {
        existing.totalPredictions++;
        if (isCorrect) existing.correct++;
        existing.accuracy = existing.correct / existing.totalPredictions;
      } else {
        evaluations.set(key, {
          modelType: modelOutput.modelType,
          asset: pred.asset,
          horizon: pred.horizon,
          marketCondition: pred.marketCondition,
          totalPredictions: 1,
          correct: isCorrect ? 1 : 0,
          accuracy: isCorrect ? 1 : 0,
          weight: 1,
        });
      }
    }
  }

  return Array.from(evaluations.values());
}

export function computeOverallStats(predictions: Prediction[]) {
  const resolved = predictions.filter((p) => p.resolved === true);
  const valid = resolved.filter((p) => p.result === 'CORRECT' || p.result === 'INCORRECT');
  const correct = valid.filter((p) => p.result === 'CORRECT').length;
  const total = valid.length;
  const accuracy = total > 0 ? correct / total : 0;

  const noSignal = resolved.filter((p) => p.direction === 'NO_SIGNAL' || p.result === 'NO_VALID_RESULT').length;

  // Performance by confidence
  const byConfidence: Record<string, { total: number; correct: number }> = {};
  for (const p of valid) {
    const level = p.confidenceLevel;
    if (!byConfidence[level]) byConfidence[level] = { total: 0, correct: 0 };
    byConfidence[level].total++;
    if (p.result === 'CORRECT') byConfidence[level].correct++;
  }

  // Performance by asset
  const byAsset: Record<string, { total: number; correct: number }> = {};
  for (const p of valid) {
    if (!byAsset[p.asset]) byAsset[p.asset] = { total: 0, correct: 0 };
    byAsset[p.asset].total++;
    if (p.result === 'CORRECT') byAsset[p.asset].correct++;
  }

  // Performance by market condition
  const byCondition: Record<string, { total: number; correct: number }> = {};
  for (const p of valid) {
    if (!byCondition[p.marketCondition]) byCondition[p.marketCondition] = { total: 0, correct: 0 };
    byCondition[p.marketCondition].total++;
    if (p.result === 'CORRECT') byCondition[p.marketCondition].correct++;
  }

  return {
    totalPredictions: resolved.length,
    validPredictions: total,
    correct,
    accuracy,
    noSignalCount: noSignal,
    byConfidence,
    byAsset,
    byCondition,
  };
}
