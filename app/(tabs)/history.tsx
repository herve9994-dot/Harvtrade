import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '@/ui/theme';
import { storage } from '@/data/storage';
import { useEngine } from '@/hooks/useEngine';
import { formatTime, formatPrice, formatPercentage } from '@/domain/config';
import { ArrowUp, ArrowDown, Minus, Download, Filter } from 'lucide-react-native';
import { useState, useMemo } from 'react';
import type { Horizon } from '@/domain/types';
import { predictionsToCSV, predictionsToJSON, downloadFile } from '@/data/export';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HistoryScreen() {
  const engine = useEngine();
  const [filterHorizon, setFilterHorizon] = useState<Horizon | 0>(0);

  const filtered = useMemo(() => {
    const all = storage.getPredictions();
    if (filterHorizon === 0) return all;
    return all.filter((p) => p.horizon === filterHorizon);
  }, [engine.predictions, filterHorizon]);

  const handleExportCSV = () => {
    const csv = predictionsToCSV(filtered);
    downloadFile(csv, `predictions_${Date.now()}.csv`, 'text/csv');
  };

  const handleExportJSON = () => {
    const json = predictionsToJSON(filtered);
    downloadFile(json, `predictions_${Date.now()}.json`, 'application/json');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Prediction History</Text>
        <View style={styles.exportRow}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
            <Download size={14} color={theme.colors.primary[400]} strokeWidth={2} />
            <Text style={styles.exportText}>CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportJSON}>
            <Download size={14} color={theme.colors.primary[400]} strokeWidth={2} />
            <Text style={styles.exportText}>JSON</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filterHorizon === 0 && styles.filterChipActive]}
          onPress={() => setFilterHorizon(0)}
        >
          <Text style={[styles.filterText, filterHorizon === 0 && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {[2, 5, 10, 15].map((h) => (
          <TouchableOpacity
            key={h}
            style={[styles.filterChip, filterHorizon === h && styles.filterChipActive]}
            onPress={() => setFilterHorizon(h as Horizon)}
          >
            <Text style={[styles.filterText, filterHorizon === h && styles.filterTextActive]}>{h}s</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100, gap: 8 }}>
        {filtered.length === 0 && (
          <Text style={styles.emptyText}>No predictions recorded yet.</Text>
        )}
        {filtered.map((p) => {
          const isUp = p.direction === 'UP';
          const isNoSignal = p.direction === 'NO_SIGNAL';
          const dirColor = isNoSignal ? theme.noSignal : isUp ? theme.up : theme.down;
          const resultColor = p.result === 'CORRECT' ? theme.up : p.result === 'INCORRECT' ? theme.down : theme.noSignal;

          return (
            <View key={p.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTime}>{formatTime(p.timestamp)}</Text>
                <Text style={styles.cardAsset}>{p.asset}</Text>
                <Text style={styles.cardHorizon}>{p.horizon}s</Text>
              </View>
              <View style={styles.cardMid}>
                <View style={styles.dirRow}>
                  {isNoSignal ? (
                    <Minus size={14} color={theme.noSignal} strokeWidth={2.5} />
                  ) : isUp ? (
                    <ArrowUp size={14} color={theme.up} strokeWidth={2.5} />
                  ) : (
                    <ArrowDown size={14} color={theme.down} strokeWidth={2.5} />
                  )}
                  <Text style={[styles.dirText, { color: dirColor }]}>
                    {isNoSignal ? 'NO SIGNAL' : `${p.direction} ${formatPercentage(isUp ? p.upProbability : p.downProbability)}`}
                  </Text>
                </View>
                <Text style={styles.priceText}>{formatPrice(p.currentPrice, p.asset)}</Text>
              </View>
              {p.resolved && (
                <View style={styles.cardBottom}>
                  <Text style={styles.actualLabel}>Actual: </Text>
                  <Text style={[styles.actualText, { color: resultColor }]}>
                    {p.actualDirection} — {p.result}
                  </Text>
                  {p.actualPrice && (
                    <Text style={styles.actualPrice}> → {formatPrice(p.actualPrice, p.asset)}</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xl,
    color: theme.textPrimary,
  },
  exportRow: {
    flexDirection: 'row',
    gap: 8,
  },
  exportBtn: {
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
  exportText: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: theme.colors.primary[400],
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[500],
  },
  filterText: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: theme.textSecondary,
  },
  filterTextActive: {
    color: '#fff',
  },
  scroll: { flex: 1, paddingHorizontal: theme.spacing.md },
  card: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardTop: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  cardTime: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.textMuted,
  },
  cardAsset: {
    fontFamily: theme.fonts.semibold,
    fontSize: 12,
    color: theme.colors.primary[300],
  },
  cardHorizon: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: theme.textMuted,
    backgroundColor: theme.bgElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardMid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  dirRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dirText: {
    fontFamily: theme.fonts.semibold,
    fontSize: theme.fontSize.sm,
  },
  priceText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.textSecondary,
  },
  cardBottom: {
    flexDirection: 'row',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  actualLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.textMuted,
  },
  actualText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 11,
  },
  actualPrice: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.textSecondary,
  },
  emptyText: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
});
