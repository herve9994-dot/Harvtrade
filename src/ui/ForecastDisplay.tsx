import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/ui/theme';
import type { Prediction, DeepAnalysis, Horizon } from '@/domain/types';
import { formatPercentage, formatSignedPercentage, formatPrice } from '@/domain/config';
import { ArrowUp, ArrowDown, Minus, AlertTriangle, Activity, Zap } from 'lucide-react-native';

interface ForecastDisplayProps {
  prediction: Prediction | null;
  deepAnalysis: DeepAnalysis | null;
  countdown: number;
  currentPrice: number | null;
  asset: string;
  reason: string;
}

export function ForecastDisplay({
  prediction,
  deepAnalysis,
  countdown,
  currentPrice,
  asset,
  reason,
}: ForecastDisplayProps) {
  if (!prediction) {
    return (
      <View style={styles.container}>
        <View style={styles.noSignalCard}>
          <AlertTriangle size={32} color={theme.noSignal} strokeWidth={2} />
          <Text style={styles.noSignalTitle}>NO SIGNAL</Text>
          <Text style={styles.noSignalReason}>{reason}</Text>
        </View>
      </View>
    );
  }

  const isUp = prediction.direction === 'UP';
  const isNoSignal = prediction.direction === 'NO_SIGNAL';
  const directionColor = isNoSignal ? theme.noSignal : isUp ? theme.up : theme.down;

  return (
    <View style={styles.container}>
      {/* Price + Asset */}
      <View style={styles.priceRow}>
        <View>
          <Text style={styles.label}>CURRENT PRICE</Text>
          <Text style={styles.priceValue}>
            {currentPrice ? formatPrice(currentPrice, asset) : '—'}
          </Text>
        </View>
        <View style={styles.assetBadge}>
          <Text style={styles.assetText}>{asset}</Text>
        </View>
      </View>

      {/* Signal Quality Badge */}
      <View style={styles.signalQualityRow}>
        <View style={[styles.signalBadge, { backgroundColor: getSignalColor(prediction.signalQuality) }]}>
          <Text style={styles.signalBadgeText}>{prediction.signalQuality.replace('_', ' ')}</Text>
        </View>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceLabel}>CONFIDENCE</Text>
          <Text style={styles.confidenceValue}>{formatPercentage(prediction.confidence)}</Text>
        </View>
      </View>

      {/* UP / DOWN Forecast */}
      <View style={styles.probRow}>
        <View style={[styles.probCard, isUp && { borderColor: theme.up, borderWidth: 2 }]}>
          <ArrowUp size={20} color={theme.up} strokeWidth={2.5} />
          <Text style={styles.probLabel}>UP</Text>
          <Text style={[styles.probValue, { color: theme.up }]}>
            {formatPercentage(prediction.upProbability)}
          </Text>
        </View>

        <View style={[styles.probCard, !isUp && !isNoSignal && { borderColor: theme.down, borderWidth: 2 }]}>
          <ArrowDown size={20} color={theme.down} strokeWidth={2.5} />
          <Text style={styles.probLabel}>DOWN</Text>
          <Text style={[styles.probValue, { color: theme.down }]}>
            {formatPercentage(prediction.downProbability)}
          </Text>
        </View>
      </View>

      {/* Signal + Expected Movement */}
      <View style={styles.signalRow}>
        <View style={styles.signalBox}>
          <Text style={styles.label}>SIGNAL</Text>
          <View style={styles.signalDirection}>
            {isNoSignal ? (
              <Minus size={16} color={theme.noSignal} strokeWidth={2.5} />
            ) : isUp ? (
              <ArrowUp size={16} color={theme.up} strokeWidth={2.5} />
            ) : (
              <ArrowDown size={16} color={theme.down} strokeWidth={2.5} />
            )}
            <Text style={[styles.signalText, { color: directionColor }]}>
              {prediction.direction}
            </Text>
          </View>
        </View>
        <View style={styles.signalBox}>
          <Text style={styles.label}>EXPECTED MOVE</Text>
          <Text style={[styles.expectedMoveText, { color: prediction.expectedMovement >= 0 ? theme.up : theme.down }]}>
            {formatSignedPercentage(prediction.expectedMovement / (currentPrice || 1))}
          </Text>
        </View>
      </View>

      {/* Model Agreement */}
      <View style={styles.agreementRow}>
        <Text style={styles.label}>MODEL AGREEMENT</Text>
        <Text style={styles.agreementText}>
          {prediction.modelAgreement} / {prediction.modelAgreementTotal} models agree
        </Text>
      </View>

      {/* Countdown */}
      {countdown > 0 && (
        <View style={styles.countdownContainer}>
          <Text style={styles.label}>COUNTDOWN</Text>
          <Text style={styles.countdownValue}>{countdown.toFixed(1)}s</Text>
          <View style={styles.countdownBar}>
            <View
              style={[
                styles.countdownFill,
                {
                  width: `${(countdown / prediction.horizon) * 100}%`,
                  backgroundColor: directionColor,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Resolved result */}
      {prediction.resolved && (
        <View style={[styles.resultCard, { borderColor: getResultColor(prediction.result) }]}>
          <Text style={styles.label}>ACTUAL</Text>
          <Text style={[styles.resultDirection, { color: getResultColor(prediction.result) }]}>
            {prediction.actualDirection} — {prediction.result}
          </Text>
          {prediction.actualPrice && (
            <Text style={styles.resultPrice}>
              {formatPrice(prediction.actualPrice, asset)}
            </Text>
          )}
        </View>
      )}

      {/* Multi-horizon view */}
      {prediction.multiHorizonView && prediction.multiHorizonView.length > 1 && (
        <View style={styles.multiHorizonCard}>
          <Text style={styles.label}>MULTI-HORIZON VIEW</Text>
          <View style={styles.multiHorizonRow}>
            {prediction.multiHorizonView.map((mh) => (
              <View key={mh.horizon} style={styles.horizonChip}>
                <Text style={styles.horizonLabel}>{mh.horizon}s</Text>
                <Text
                  style={[
                    styles.horizonProb,
                    { color: mh.direction === 'UP' ? theme.up : mh.direction === 'DOWN' ? theme.down : theme.noSignal },
                  ]}
                >
                  {formatPercentage(mh.upProbability)}
                </Text>
                {mh.conflict && (
                  <Zap size={10} color={theme.noSignal} strokeWidth={2} />
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Deep Analysis */}
      {deepAnalysis && (
        <View style={styles.analysisCard}>
          <Text style={styles.analysisTitle}>DEEP ANALYSIS</Text>
          <View style={styles.analysisGrid}>
            <AnalysisItem label="Momentum" value={deepAnalysis.momentum} />
            <AnalysisItem label="Trend" value={deepAnalysis.shortTermTrend} />
            <AnalysisItem label="Volatility" value={deepAnalysis.volatility} />
            <AnalysisItem label="Liquidity" value={deepAnalysis.liquidity} />
            <AnalysisItem label="Order Flow" value={deepAnalysis.orderFlow} />
            <AnalysisItem label="Models" value={deepAnalysis.modelAgreement} />
            <AnalysisItem label="Data Quality" value={deepAnalysis.dataQuality} />
            <AnalysisItem label="Decision" value={deepAnalysis.finalDecision} highlight />
          </View>
        </View>
      )}

      {/* Model outputs */}
      <View style={styles.modelsCard}>
        <Text style={styles.analysisTitle}>MODEL OUTPUTS</Text>
        {prediction.modelOutputs.map((m, i) => (
          <View key={i} style={styles.modelRow}>
            <View style={styles.modelHeader}>
              <Text style={styles.modelName}>{m.modelName}</Text>
              <Text style={styles.modelProb}>
                UP {formatPercentage(m.upProbability)}
              </Text>
            </View>
            <Text style={styles.modelExplanation}>{m.explanation}</Text>
          </View>
        ))}
        <View style={[styles.modelRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
          <View style={styles.modelHeader}>
            <Text style={[styles.modelName, { fontFamily: theme.fonts.bold }]}>
              {prediction.ensembleOutput.modelName}
            </Text>
            <Text style={[styles.modelProb, { fontFamily: theme.fonts.bold }]}>
              UP {formatPercentage(prediction.ensembleOutput.upProbability)}
            </Text>
          </View>
          <Text style={styles.modelExplanation}>{prediction.ensembleOutput.explanation}</Text>
        </View>
      </View>
    </View>
  );
}

function AnalysisItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const color = getAnalysisColor(value);
  return (
    <View style={styles.analysisItem}>
      <Text style={styles.analysisLabel}>{label}</Text>
      <Text style={[styles.analysisValue, highlight && { fontFamily: theme.fonts.bold, fontSize: theme.fontSize.sm }, { color }]}>
        {value}
      </Text>
    </View>
  );
}

function getSignalColor(sq: string): string {
  switch (sq) {
    case 'STRONG': return theme.strong;
    case 'MODERATE': return theme.moderate;
    case 'WEAK': return theme.weak;
    default: return theme.noSignal;
  }
}

function getResultColor(result?: string): string {
  switch (result) {
    case 'CORRECT': return theme.up;
    case 'INCORRECT': return theme.down;
    default: return theme.noSignal;
  }
}

function getAnalysisColor(value: string): string {
  const positive = ['POSITIVE', 'UP', 'BULLISH', 'STRONG', 'GOOD', 'HIGH'];
  const negative = ['NEGATIVE', 'DOWN', 'BEARISH', 'WEAK', 'STALE', 'DEGRADED'];
  if (positive.includes(value)) return theme.up;
  if (negative.includes(value)) return value === 'STALE' || value === 'DEGRADED' ? theme.noSignal : theme.down;
  return theme.textSecondary;
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  noSignalCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.noSignal,
  },
  noSignalTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xl,
    color: theme.noSignal,
  },
  noSignalReason: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  label: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.xs,
    color: theme.textMuted,
    letterSpacing: 1,
  },
  priceValue: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xxl,
    color: theme.textPrimary,
  },
  assetBadge: {
    backgroundColor: theme.bgElevated,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.md,
  },
  assetText: {
    fontFamily: theme.fonts.semibold,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary[300],
  },
  signalQualityRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  signalBadge: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  signalBadgeText: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.sm,
    color: '#ffffff',
    letterSpacing: 1,
  },
  confidenceBadge: {
    flex: 1,
    backgroundColor: theme.bgCard,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  confidenceLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.xs,
    color: theme.textMuted,
  },
  confidenceValue: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.md,
    color: theme.textPrimary,
  },
  probRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  probCard: {
    flex: 1,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  probLabel: {
    fontFamily: theme.fonts.semibold,
    fontSize: theme.fontSize.sm,
    color: theme.textSecondary,
  },
  probValue: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xl,
  },
  signalRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  signalBox: {
    flex: 1,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 4,
  },
  signalDirection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signalText: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.md,
  },
  expectedMoveText: {
    fontFamily: theme.fonts.semibold,
    fontSize: theme.fontSize.md,
  },
  agreementRow: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  agreementText: {
    fontFamily: theme.fonts.semibold,
    fontSize: theme.fontSize.sm,
    color: theme.textPrimary,
  },
  countdownContainer: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 4,
  },
  countdownValue: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xxxl,
    color: theme.textPrimary,
    textAlign: 'center',
  },
  countdownBar: {
    height: 4,
    backgroundColor: theme.bgElevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  countdownFill: {
    height: '100%',
    borderRadius: 2,
  },
  resultCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 2,
    gap: 4,
  },
  resultDirection: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.lg,
  },
  resultPrice: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: theme.textSecondary,
  },
  multiHorizonCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
    gap: theme.spacing.xs,
  },
  multiHorizonRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  horizonChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.bgElevated,
  },
  horizonLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: theme.textMuted,
  },
  horizonProb: {
    fontFamily: theme.fonts.semibold,
    fontSize: theme.fontSize.sm,
  },
  analysisCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    gap: theme.spacing.sm,
  },
  analysisTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: theme.fontSize.sm,
    color: theme.textPrimary,
    letterSpacing: 1,
  },
  analysisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  analysisItem: {
    width: '48%',
  },
  analysisLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: theme.textMuted,
  },
  analysisValue: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.sm,
  },
  modelsCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    gap: theme.spacing.sm,
  },
  modelRow: {
    paddingVertical: theme.spacing.xs,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modelName: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.sm,
    color: theme.textPrimary,
  },
  modelProb: {
    fontFamily: theme.fonts.semibold,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary[300],
  },
  modelExplanation: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.xs,
    color: theme.textSecondary,
    marginTop: 2,
  },
});
