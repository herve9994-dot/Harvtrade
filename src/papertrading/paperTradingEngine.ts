import type { PaperTrade, Prediction, AppConfig, Direction } from '@/domain/types';
import { generateId, clamp } from '@/domain/config';

export interface PaperTradingState {
  balance: number;
  openTrades: PaperTrade[];
  resolvedTrades: PaperTrade[];
  totalPnl: number;
  winRate: number;
  wins: number;
  losses: number;
  currentStreak: number;
  streakType: 'WIN' | 'LOSS' | 'NONE';
  maxDrawdown: number;
  peakBalance: number;
}

export function createPaperTrade(
  prediction: Prediction,
  config: AppConfig
): PaperTrade | null {
  if (prediction.direction === 'NO_SIGNAL') return null;
  if (prediction.signalQuality === 'NO_SIGNAL') return null;
  if (config.paperBalance < config.defaultStake) return null;

  const trade: PaperTrade = {
    id: generateId(),
    predictionId: prediction.id,
    timestamp: prediction.timestamp,
    asset: prediction.asset,
    direction: prediction.direction as Direction,
    stake: config.defaultStake,
    horizon: prediction.horizon,
    entryPrice: prediction.currentPrice,
    payoutPercentage: config.defaultPayoutPercentage,
    status: 'OPEN',
  };

  return trade;
}

export function resolvePaperTrade(
  trade: PaperTrade,
  actualPrice: number,
  actualDirection: Direction
): PaperTrade {
  if (actualDirection === 'FLAT') {
    return {
      ...trade,
      status: 'NO_VALID_RESULT',
      exitPrice: actualPrice,
      pnl: 0,
      resolvedAt: Date.now(),
    };
  }

  const won = trade.direction === actualDirection;
  const pnl = won
    ? trade.stake * (trade.payoutPercentage / 100)
    : -trade.stake;

  return {
    ...trade,
    status: won ? 'WON' : 'LOST',
    exitPrice: actualPrice,
    pnl,
    resolvedAt: Date.now(),
  };
}

export function computePaperTradingState(
  balance: number,
  allTrades: PaperTrade[]
): PaperTradingState {
  const openTrades = allTrades.filter((t) => t.status === 'OPEN');
  const resolvedTrades = allTrades.filter((t) => t.status === 'WON' || t.status === 'LOST');

  const wins = resolvedTrades.filter((t) => t.status === 'WON').length;
  const losses = resolvedTrades.filter((t) => t.status === 'LOST').length;
  const totalPnl = resolvedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const winRate = resolvedTrades.length > 0 ? wins / resolvedTrades.length : 0;

  // Compute streak from most recent resolved trades
  const sorted = [...resolvedTrades].sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0));
  let currentStreak = 0;
  let streakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';
  if (sorted.length > 0) {
    streakType = sorted[0].status === 'WON' ? 'WIN' : 'LOSS';
    for (const t of sorted) {
      if (t.status === (streakType === 'WIN' ? 'WON' : 'LOST')) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Compute drawdown
  let runningBalance = balance;
  let peakBalance = balance;
  let maxDrawdown = 0;
  const chronological = [...resolvedTrades].sort((a, b) => (a.resolvedAt ?? 0) - (b.resolvedAt ?? 0));
  for (const t of chronological) {
    runningBalance += t.pnl ?? 0;
    peakBalance = Math.max(peakBalance, runningBalance);
    maxDrawdown = Math.max(maxDrawdown, peakBalance - runningBalance);
  }

  return {
    balance: balance + totalPnl,
    openTrades,
    resolvedTrades,
    totalPnl,
    winRate,
    wins,
    losses,
    currentStreak,
    streakType,
    maxDrawdown,
    peakBalance,
  };
}

export function computeBinaryOptionAnalysis(
  winRate: number,
  payoutPercentage: number,
  stake: number,
  predictionCount: number
): {
  payoutPercentage: number;
  stake: number;
  breakEvenWinRate: number;
  currentWinRate: number;
  expectedValue: number;
  profitable: boolean;
  predictionCount: number;
} {
  // Break-even: winRate * payout = (1 - winRate) * stake
  // winRate * (stake * payout/100) = (1 - winRate) * stake
  // winRate * payout/100 = 1 - winRate
  // winRate * (payout/100 + 1) = 1
  // winRate = 1 / (1 + payout/100)
  const breakEvenWinRate = 1 / (1 + payoutPercentage / 100);
  const expectedValue = winRate * stake * (payoutPercentage / 100) - (1 - winRate) * stake;
  const profitable = winRate > breakEvenWinRate;

  return {
    payoutPercentage,
    stake,
    breakEvenWinRate,
    currentWinRate: winRate,
    expectedValue,
    profitable,
    predictionCount,
  };
}
