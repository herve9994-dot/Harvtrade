import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '@/ui/theme';
import { useEngine } from '@/hooks/useEngine';
import { computeAllHorizonQuality, computeOverallStats } from '@/analytics/analyticsEngine';
import { formatPercentage } from '@/domain/config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HORIZONS } from '@/domain/config';

export default function AnalyticsScreen() {
  const engine = useEngine();
  const predictions = engine.predictions;
  const qualities = computeAllHorizonQuality(predictions, HORIZONS as unknown as number[] as any);
  const overall = computeOverallStats(predictions);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100, gap: theme.spacing.md }}>
        <Text style={styles.title}>Analytics</Text>

        {/* Overall stats */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>OVERALL PERFORMANCE</Text>
          <View style={styles.statsGrid}>
            <StatBox label="Total Predictions" value={overall.totalPredictions.toString()} />
            <StatBox label="Valid Predictions" value={overall.validPredictions.toString()} />
            <StatBox label="Correct" value={overall.correct.toString()} color={theme.up} />
            <StatBox label="Accuracy" value={formatPercentage(overall.accuracy)} color={overall.accuracy > 0.5 ? theme.up : theme.down} />
            <StatBox label="No Signal" value={overall.noSignalCount.toString()} color={theme.noSignal} />
          </View>
        </View>

        {/* Per-horizon quality */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PERFORMANCE BY HORIZON</Text>
          {qualities.map((q) => (
            <View key={q.horizon} style={styles.horizonBlock}>
              <Text style={styles.horizonTitle}>{q.horizon}s Horizon</Text>
              <View style={styles.statsGrid}>
                <StatBox label="Total" value={q.totalPredictions.toString()} small />
                <StatBox label="Correct" value={q.correctPredictions.toString()} small color={theme.up} />
                <StatBox label="Incorrect" value={q.incorrectPredictions.toString()} small color={theme.down} />
                <StatBox label="Accuracy" value={formatPercentage(q.directionalAccuracy)} small />
                <StatBox label="Precision" value={formatPercentage(q.precision)} small />
                <StatBox label="Recall" value={formatPercentage(q.recall)} small />
                <StatBox label="F1" value={q.f1Score.toFixed(3)} small />
                <StatBox label="Brier" value={q.brierScore.toFixed(4)} small />
                <StatBox label="Calibration" value={q.calibration.toFixed(4)} small />
                <StatBox label="Avg Confidence" value={formatPercentage(q.averageConfidence)} small />
                <StatBox label="Max Win Streak" value={q.consecutiveWins.toString()} small color={theme.up} />
                <StatBox label="Max Loss Streak" value={q.consecutiveLosses.toString()} small color={theme.down} />
              </View>
            </View>
          ))}
        </View>

        {/* By confidence */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PERFORMANCE BY CONFIDENCE</Text>
          {Object.entries(overall.byConfidence).map(([level, data]) => (
            <View key={level} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{level}</Text>
              <Text style={styles.breakdownValue}>
                {data.correct}/{data.total} ({formatPercentage(data.correct / data.total)})
              </Text>
            </View>
          ))}
          {Object.keys(overall.byConfidence).length === 0 && (
            <Text style={styles.emptyText}>No data yet.</Text>
          )}
        </View>

        {/* By asset */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PERFORMANCE BY ASSET</Text>
          {Object.entries(overall.byAsset).map(([asset, data]) => (
            <View key={asset} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{asset}</Text>
              <Text style={styles.breakdownValue}>
                {data.correct}/{data.total} ({formatPercentage(data.correct / data.total)})
              </Text>
            </View>
          ))}
          {Object.keys(overall.byAsset).length === 0 && (
            <Text style={styles.emptyText}>No data yet.</Text>
          )}
        </View>

        {/* By market condition */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PERFORMANCE BY MARKET CONDITION</Text>
          {Object.entries(overall.byCondition).map(([cond, data]) => (
            <View key={cond} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{cond.replace('_', ' ')}</Text>
              <Text style={styles.breakdownValue}>
                {data.correct}/{data.total} ({formatPercentage(data.correct / data.total)})
              </Text>
            </View>
          ))}
          {Object.keys(overall.byCondition).length === 0 && (
            <Text style={styles.emptyText}>No data yet.</Text>
          )}
        </View>

        <Text style={styles.disclaimer}>
          All statistics are based on recorded predictions and actual outcomes. Synthetic data is never mixed with real performance.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color, small }: { label: string; value: string; color?: string; small?: boolean }) {
  return (
    <View style={[small ? styles.smallStatBox : styles.statBox]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, small && { fontSize: theme.fontSize.sm }, color && { color }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1, padding: theme.spacing.md },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xl,
    color: theme.textPrimary,
  },
  card: {
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statBox: {
    width: '48%',
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  smallStatBox: {
    width: '31%',
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 1,
  },
  statLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 9,
    color: theme.textMuted,
    textAlign: 'center',
  },
  statValue: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.md,
    color: theme.textPrimary,
  },
  horizonBlock: {
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  horizonTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary[300],
    marginBottom: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: theme.textSecondary,
  },
  breakdownValue: {
    fontFamily: theme.fonts.semibold,
    fontSize: theme.fontSize.sm,
    color: theme.textPrimary,
  },
  emptyText: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: theme.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  disclaimer: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: theme.textMuted,
    textAlign: 'center',
  },
});
