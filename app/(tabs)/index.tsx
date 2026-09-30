import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '@/ui/theme';
import { useEngine } from '@/hooks/useEngine';
import { PriceChart } from '@/ui/PriceChart';
import { ForecastDisplay } from '@/ui/ForecastDisplay';
import { HorizonSelector } from '@/ui/HorizonSelector';
import { ControlBar } from '@/ui/ControlBar';
import type { Horizon } from '@/domain/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle } from 'lucide-react-native';

export default function ForecastScreen() {
  const engine = useEngine();

  const handleHorizonSelect = (h: Horizon) => {
    engine.updateConfig({ selectedHorizon: h });
  };

  const handleToggleAutoPredict = () => {
    if (engine.config.autoPredict) {
      engine.stopForecastCycle();
      engine.updateConfig({ autoPredict: false });
    } else {
      engine.startForecastCycle();
      engine.updateConfig({ autoPredict: true });
    }
  };

  const isSynthetic = engine.config.dataMode === 'SYNTHETIC';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Data status banner */}
        <View style={[styles.statusBanner, isSynthetic && styles.syntheticBanner]}>
          <Text style={styles.statusText}>{engine.dataStatus}</Text>
          {isSynthetic && (
            <View style={styles.syntheticTag}>
              <Text style={styles.syntheticTagText}>SYNTHETIC DATA</Text>
            </View>
          )}
        </View>

        {/* Provider not configured warning */}
        {engine.config.dataMode === 'NONE' && (
          <View style={styles.warningCard}>
            <AlertCircle size={20} color={theme.noSignal} strokeWidth={2} />
            <Text style={styles.warningText}>
              No market data provider configured. Go to Settings to select Synthetic mode for development or configure a live data provider.
            </Text>
          </View>
        )}

        {/* Chart */}
        <PriceChart
          observations={engine.observations}
          predictions={engine.predictions}
          asset={engine.config.selectedAsset}
          forecastDirection={engine.currentPrediction?.direction}
          forecastConfidence={engine.currentPrediction?.confidence}
        />

        {/* Horizon selector */}
        <HorizonSelector
          selected={engine.config.selectedHorizon}
          onSelect={handleHorizonSelect}
        />

        {/* Control bar */}
        <ControlBar
          autoPredict={engine.config.autoPredict}
          onToggleAutoPredict={handleToggleAutoPredict}
          onManualTrade={engine.manualTrade}
          canTrade={!!engine.currentPrediction && engine.currentPrediction.direction !== 'NO_SIGNAL'}
          paperBalance={engine.paperTradingState.balance}
        />

        {/* Forecast display */}
        <ForecastDisplay
          prediction={engine.currentPrediction}
          deepAnalysis={engine.forecastResult?.deepAnalysis ?? null}
          countdown={engine.countdown}
          currentPrice={engine.currentPrice}
          asset={engine.config.selectedAsset}
          reason={engine.forecastResult?.reason ?? 'Waiting for data...'}
        />

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Historical performance does not guarantee future results. This is a research tool for paper trading only.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    paddingBottom: 100,
  },
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  syntheticBanner: {
    borderColor: theme.noSignal,
  },
  statusText: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.xs,
    color: theme.textSecondary,
  },
  syntheticTag: {
    backgroundColor: theme.noSignal,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  syntheticTagText: {
    fontFamily: theme.fonts.bold,
    fontSize: 9,
    color: '#fff',
    letterSpacing: 1,
  },
  warningCard: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.noSignal,
  },
  warningText: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: theme.textSecondary,
  },
  disclaimer: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});
