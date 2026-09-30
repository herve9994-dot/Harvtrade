import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/ui/theme';
import { Play, Square, Wallet, RotateCcw } from 'lucide-react-native';

interface ControlBarProps {
  autoPredict: boolean;
  onToggleAutoPredict: () => void;
  onManualTrade: () => void;
  canTrade: boolean;
  paperBalance: number;
}

export function ControlBar({
  autoPredict,
  onToggleAutoPredict,
  onManualTrade,
  canTrade,
  paperBalance,
}: ControlBarProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, autoPredict ? styles.stopButton : styles.startButton]}
        onPress={onToggleAutoPredict}
      >
        {autoPredict ? (
          <>
            <Square size={16} color="#fff" strokeWidth={2.5} />
            <Text style={styles.buttonText}>STOP</Text>
          </>
        ) : (
          <>
            <Play size={16} color="#fff" strokeWidth={2.5} />
            <Text style={styles.buttonText}>START</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.tradeButton, !canTrade && styles.disabledButton]}
        onPress={onManualTrade}
        disabled={!canTrade}
      >
        <Wallet size={16} color="#fff" strokeWidth={2} />
        <Text style={styles.buttonText}>TRADE</Text>
      </TouchableOpacity>

      <View style={styles.balanceBox}>
        <Text style={styles.balanceLabel}>BALANCE</Text>
        <Text style={styles.balanceValue}>${paperBalance.toFixed(2)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    minWidth: 80,
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: theme.up,
  },
  stopButton: {
    backgroundColor: theme.down,
  },
  tradeButton: {
    backgroundColor: theme.colors.primary[600],
  },
  disabledButton: {
    backgroundColor: theme.colors.neutral[700],
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.sm,
    color: '#ffffff',
  },
  balanceBox: {
    flex: 1,
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: theme.textMuted,
  },
  balanceValue: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.md,
    color: theme.colors.accent[400],
  },
});
