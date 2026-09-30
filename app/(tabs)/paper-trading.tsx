import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '@/ui/theme';
import { useEngine } from '@/hooks/useEngine';
import { formatTime, formatPrice } from '@/domain/config';
import { computeBinaryOptionAnalysis } from '@/papertrading/paperTradingEngine';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, RotateCcw, Download } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tradesToCSV, tradesToJSON, downloadFile } from '@/data/export';

export default function PaperTradingScreen() {
  const engine = useEngine();
  const state = engine.paperTradingState;

  const boAnalysis = computeBinaryOptionAnalysis(
    state.winRate,
    engine.config.defaultPayoutPercentage,
    engine.config.defaultStake,
    state.wins + state.losses,
  );

  const handleExportCSV = () => {
    const csv = tradesToCSV(engine.trades);
    downloadFile(csv, `trades_${Date.now()}.csv`, 'text/csv');
  };

  const handleExportJSON = () => {
    const json = tradesToJSON(engine.trades);
    downloadFile(json, `trades_${Date.now()}.json`, 'application/json');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100, gap: theme.spacing.md }}>
        <View style={styles.header}>
          <Text style={styles.title}>Paper Trading</Text>
          <TouchableOpacity onPress={engine.resetSimulation}>
            <View style={styles.resetBtn}>
              <RotateCcw size={14} color={theme.noSignal} strokeWidth={2} />
              <Text style={styles.resetText}>RESET</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>VIRTUAL BALANCE</Text>
          <Text style={styles.balanceValue}>${state.balance.toFixed(2)}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>P/L</Text>
              <Text style={[styles.statValue, { color: state.totalPnl >= 0 ? theme.up : theme.down }]}>
                {state.totalPnl >= 0 ? '+' : ''}${state.totalPnl.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>WIN RATE</Text>
              <Text style={styles.statValue}>{(state.winRate * 100).toFixed(1)}%</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>DRAWDOWN</Text>
              <Text style={[styles.statValue, { color: theme.down }]}>${state.maxDrawdown.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>WINS</Text>
              <Text style={[styles.statValue, { color: theme.up }]}>{state.wins}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>LOSSES</Text>
              <Text style={[styles.statValue, { color: theme.down }]}>{state.losses}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>STREAK</Text>
              <Text style={[styles.statValue, { color: state.streakType === 'WIN' ? theme.up : state.streakType === 'LOSS' ? theme.down : theme.textMuted }]}>
                {state.currentStreak > 0 ? `${state.streakType === 'WIN' ? 'W' : 'L'}${state.currentStreak}` : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Binary option analysis */}
        <View style={styles.boCard}>
          <Text style={styles.sectionTitle}>BINARY OPTION RESEARCH</Text>
          <View style={styles.boRow}>
            <View style={styles.boItem}>
              <Text style={styles.boLabel}>PAYOUT</Text>
              <Text style={styles.boValue}>{boAnalysis.payoutPercentage}%</Text>
            </View>
            <View style={styles.boItem}>
              <Text style={styles.boLabel}>STAKE</Text>
              <Text style={styles.boValue}>${boAnalysis.stake}</Text>
            </View>
            <View style={styles.boItem}>
              <Text style={styles.boLabel}>BREAK-EVEN</Text>
              <Text style={[styles.boValue, { color: theme.noSignal }]}>
                {(boAnalysis.breakEvenWinRate * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
          <View style={styles.boRow}>
            <View style={styles.boItem}>
              <Text style={styles.boLabel}>YOUR WIN RATE</Text>
              <Text style={[styles.boValue, { color: boAnalysis.profitable ? theme.up : theme.down }]}>
                {(boAnalysis.currentWinRate * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.boItem}>
              <Text style={styles.boLabel}>EV / TRADE</Text>
              <Text style={[styles.boValue, { color: boAnalysis.expectedValue >= 0 ? theme.up : theme.down }]}>
                {boAnalysis.expectedValue >= 0 ? '+' : ''}${boAnalysis.expectedValue.toFixed(2)}
              </Text>
            </View>
            <View style={styles.boItem}>
              <Text style={styles.boLabel}>STATUS</Text>
              <Text style={[styles.boValue, { color: boAnalysis.profitable ? theme.up : theme.down }]}>
                {boAnalysis.profitable ? 'PROFITABLE' : 'NOT PROFITABLE'}
              </Text>
            </View>
          </View>
          <Text style={styles.boWarning}>
            Historical performance does not guarantee future results. This is research only — no real-money trading.
          </Text>
        </View>

        {/* Export */}
        <View style={styles.exportRow}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
            <Download size={14} color={theme.colors.primary[400]} strokeWidth={2} />
            <Text style={styles.exportText}>Export CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportJSON}>
            <Download size={14} color={theme.colors.primary[400]} strokeWidth={2} />
            <Text style={styles.exportText}>Export JSON</Text>
          </TouchableOpacity>
        </View>

        {/* Open trades */}
        {state.openTrades.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>OPEN TRADES</Text>
            {state.openTrades.map((t) => (
              <View key={t.id} style={styles.tradeCard}>
                <View style={styles.tradeTop}>
                  <Text style={styles.tradeTime}>{formatTime(t.timestamp)}</Text>
                  <Text style={styles.tradeAsset}>{t.asset}</Text>
                  <Text style={styles.tradeHorizon}>{t.horizon}s</Text>
                </View>
                <View style={styles.tradeMid}>
                  {t.direction === 'UP' ? (
                    <ArrowUp size={14} color={theme.up} strokeWidth={2.5} />
                  ) : (
                    <ArrowDown size={14} color={theme.down} strokeWidth={2.5} />
                  )}
                  <Text style={[styles.tradeDir, { color: t.direction === 'UP' ? theme.up : theme.down }]}>
                    {t.direction}
                  </Text>
                  <Text style={styles.tradeStake}>${t.stake}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Resolved trades */}
        <View>
          <Text style={styles.sectionTitle}>RESOLVED TRADES</Text>
          {state.resolvedTrades.length === 0 && (
            <Text style={styles.emptyText}>No resolved trades yet.</Text>
          )}
          {state.resolvedTrades.slice(0, 50).map((t) => (
            <View key={t.id} style={styles.tradeCard}>
              <View style={styles.tradeTop}>
                <Text style={styles.tradeTime}>{formatTime(t.resolvedAt ?? t.timestamp)}</Text>
                <Text style={styles.tradeAsset}>{t.asset}</Text>
                <Text style={styles.tradeHorizon}>{t.horizon}s</Text>
              </View>
              <View style={styles.tradeMid}>
                {t.direction === 'UP' ? (
                  <TrendingUp size={14} color={t.status === 'WON' ? theme.up : theme.down} strokeWidth={2} />
                ) : (
                  <TrendingDown size={14} color={t.status === 'WON' ? theme.up : theme.down} strokeWidth={2} />
                )}
                <Text style={[styles.tradeDir, { color: t.status === 'WON' ? theme.up : t.status === 'LOST' ? theme.down : theme.noSignal }]}>
                  {t.direction} — {t.status}
                </Text>
                <Text style={[styles.tradePnl, { color: (t.pnl ?? 0) >= 0 ? theme.up : theme.down }]}>
                  {(t.pnl ?? 0) >= 0 ? '+' : ''}${(t.pnl ?? 0).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1, padding: theme.spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xl,
    color: theme.textPrimary,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.bgCard,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  resetText: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: theme.noSignal,
  },
  balanceCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.border,
    gap: theme.spacing.sm,
  },
  balanceLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.xs,
    color: theme.textMuted,
    letterSpacing: 1,
  },
  balanceValue: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xxxl,
    color: theme.colors.accent[400],
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 9,
    color: theme.textMuted,
    letterSpacing: 0.5,
  },
  statValue: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.md,
    color: theme.textPrimary,
  },
  boCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: theme.fontSize.sm,
    color: theme.textPrimary,
    letterSpacing: 1,
  },
  boRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  boItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  boLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 9,
    color: theme.textMuted,
    letterSpacing: 0.5,
  },
  boValue: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.sm,
    color: theme.textPrimary,
  },
  boWarning: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: theme.noSignal,
    textAlign: 'center',
    marginTop: 4,
  },
  exportRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.bgCard,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  exportText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.primary[400],
  },
  tradeCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 6,
  },
  tradeTop: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  tradeTime: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.textMuted,
  },
  tradeAsset: {
    fontFamily: theme.fonts.semibold,
    fontSize: 12,
    color: theme.colors.primary[300],
  },
  tradeHorizon: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: theme.textMuted,
    backgroundColor: theme.bgElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tradeMid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  tradeDir: {
    fontFamily: theme.fonts.semibold,
    fontSize: theme.fontSize.sm,
    flex: 1,
  },
  tradeStake: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.textSecondary,
  },
  tradePnl: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.sm,
  },
  emptyText: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: 20,
  },
});
