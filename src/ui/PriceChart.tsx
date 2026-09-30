import { useEffect, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { theme } from '@/ui/theme';
import type { MarketObservation, Prediction, ChartPoint } from '@/domain/types';
import { formatPrice } from '@/domain/config';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

interface PriceChartProps {
  observations: MarketObservation[];
  predictions: Prediction[];
  asset: string;
  height?: number;
  forecastDirection?: string;
  forecastConfidence?: number;
}

export function PriceChart({
  observations,
  predictions,
  asset,
  height = 200,
  forecastDirection,
  forecastConfidence,
}: PriceChartProps) {
  const chartPoints: ChartPoint[] = observations.slice(-80).map((o) => ({
    timestamp: o.timestamp,
    price: o.price,
  }));

  // Mark predictions on the chart
  const predictionMap = new Map(predictions.slice(-20).map((p) => [p.timestamp, p]));
  for (const p of predictions.slice(-20)) {
    const matchingObs = observations.find((o) => Math.abs(o.timestamp - p.timestamp) < 2000);
    if (matchingObs) {
      const idx = chartPoints.findIndex((cp) => cp.timestamp === matchingObs.timestamp);
      if (idx >= 0) {
        chartPoints[idx] = {
          ...chartPoints[idx],
          isPrediction: true,
          predictionDirection: p.direction,
          predictionCorrect: p.result === 'CORRECT',
        };
      }
    }
  }

  if (chartPoints.length < 2) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.emptyText}>Waiting for price data...</Text>
      </View>
    );
  }

  const prices = chartPoints.map((p) => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;
  const padding = priceRange * 0.1;
  const chartMin = minPrice - padding;
  const chartMax = maxPrice + padding;
  const chartRange = chartMax - chartMin;

  const width = 320; // Approximate chart width
  const pointSpacing = chartPoints.length > 1 ? width / (chartPoints.length - 1) : 0;

  // Build SVG path
  const pathPoints = chartPoints.map((p, i) => {
    const x = i * pointSpacing;
    const y = height - ((p.price - chartMin) / chartRange) * (height - 40) - 20;
    return { x, y, ...p };
  });

  const pathD = pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  // Trend direction
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const isUp = lastPrice > firstPrice;
  const lineColor = isUp ? theme.up : theme.down;

  // Forecast zone
  const lastPoint = pathPoints[pathPoints.length - 1];
  const forecastY = lastPoint.y;
  const forecastEndX = lastPoint.x + 40;

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.header}>
        <Text style={styles.assetText}>{asset}</Text>
        <View style={styles.trendRow}>
          {isUp ? (
            <TrendingUp size={14} color={theme.up} strokeWidth={2} />
          ) : (
            <TrendingDown size={14} color={theme.down} strokeWidth={2} />
          )}
          <Text style={[styles.trendText, { color: isUp ? theme.up : theme.down }]}>
            {formatPrice(lastPrice, asset)}
          </Text>
        </View>
      </View>

      {/* SVG Chart */}
      <View style={styles.chartArea}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <View
            key={ratio}
            style={[styles.gridLine, { top: ratio * (height - 40) + 20 }]}
          />
        ))}

        {/* Price line using SVG */}
        <View style={styles.svgContainer}>
          {pathPoints.map((p, i) => {
            if (i === 0) return null;
            const prev = pathPoints[i - 1];
            return (
              <View
                key={i}
                style={[
                  styles.lineSegment,
                  {
                    left: prev.x,
                    top: Math.min(prev.y, p.y),
                    width: Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2),
                    transform: [
                      {
                        rotate: `${Math.atan2(p.y - prev.y, p.x - prev.x) * (180 / Math.PI)}deg`,
                      },
                    ],
                    borderColor: lineColor,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Prediction markers */}
        {pathPoints.filter((p) => p.isPrediction).map((p, i) => (
          <View
            key={`pred-${i}`}
            style={[
              styles.predictionMarker,
              {
                left: p.x - 5,
                top: p.y - 5,
                backgroundColor:
                  p.predictionCorrect === true ? theme.up :
                  p.predictionCorrect === false ? theme.down :
                  theme.noSignal,
              },
            ]}
          />
        ))}

        {/* Current price dot */}
        {lastPoint && (
          <View
            style={[styles.currentDot, { left: lastPoint.x - 4, top: lastPoint.y - 4 }]}
          />
        )}

        {/* Forecast direction indicator */}
        {forecastDirection && forecastDirection !== 'NO_SIGNAL' && (
          <View
            style={[
              styles.forecastZone,
              {
                left: lastPoint.x,
                top: lastPoint.y - 20,
              },
            ]}
          >
            {forecastDirection === 'UP' ? (
              <TrendingUp size={16} color={theme.up} strokeWidth={2.5} />
            ) : (
              <TrendingDown size={16} color={theme.down} strokeWidth={2.5} />
            )}
          </View>
        )}
      </View>

      {/* Price scale */}
      <View style={styles.scaleRow}>
        <Text style={styles.scaleText}>{formatPrice(chartMax, asset)}</Text>
        <Text style={styles.scaleText}>{formatPrice(chartMin, asset)}</Text>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.up }]} />
          <Text style={styles.legendText}>Observed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.noSignal }]} />
          <Text style={styles.legendText}>Prediction</Text>
        </View>
        {forecastDirection && forecastDirection !== 'NO_SIGNAL' && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.primary[500] }]} />
            <Text style={styles.legendText}>Forecast</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  assetText: {
    fontFamily: theme.fonts.semibold,
    fontSize: theme.fontSize.sm,
    color: theme.textPrimary,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontFamily: theme.fonts.semibold,
    fontSize: theme.fontSize.sm,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  svgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lineSegment: {
    position: 'absolute',
    height: 0,
    borderWidth: 1.5,
    transformOrigin: 'left center',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.border,
    opacity: 0.5,
  },
  predictionMarker: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.bgCard,
  },
  currentDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary[500],
    borderWidth: 2,
    borderColor: theme.bgCard,
  },
  forecastZone: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.bgElevated,
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xs,
    marginTop: 2,
  },
  scaleText: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: theme.textMuted,
  },
  legendRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: theme.textSecondary,
  },
  emptyText: {
    color: theme.textMuted,
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
    marginTop: 40,
  },
});
