import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '@/ui/theme';
import type { Horizon } from '@/domain/types';
import { HORIZONS } from '@/domain/config';

interface HorizonSelectorProps {
  selected: Horizon;
  onSelect: (h: Horizon) => void;
}

export function HorizonSelector({ selected, onSelect }: HorizonSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>HORIZON</Text>
      <View style={styles.buttonRow}>
        {HORIZONS.map((h) => (
          <TouchableOpacity
            key={h}
            style={[styles.button, selected === h && styles.buttonActive]}
            onPress={() => onSelect(h)}
          >
            <Text style={[styles.buttonText, selected === h && styles.buttonTextActive]}>
              {h}s
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.xs,
    color: theme.textMuted,
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[500],
  },
  buttonText: {
    fontFamily: theme.fonts.semibold,
    fontSize: theme.fontSize.sm,
    color: theme.textSecondary,
  },
  buttonTextActive: {
    color: '#ffffff',
  },
});
