import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { theme } from '@/ui/theme';
import { useEngine } from '@/hooks/useEngine';
import { ASSETS } from '@/domain/config';
import type { DataMode, Horizon } from '@/domain/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { RotateCcw, Key, Database, Shield, Download } from 'lucide-react-native';
import { predictionsToCSV, predictionsToJSON, downloadFile } from '@/data/export';

export default function SettingsScreen() {
  const engine = useEngine();
  const [apiKeyInput, setApiKeyInput] = useState(engine.config.apiKey);
  const [apiEndpointInput, setApiEndpointInput] = useState(engine.config.apiEndpoint);

  const handleResetAll = () => {
    Alert.alert(
      'Reset All Data',
      'This will delete all predictions, trades, observations, and analytics. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => engine.resetAllData() },
      ]
    );
  };

  const handleResetSim = () => {
    Alert.alert(
      'Reset Simulation',
      'This will clear all predictions and paper trades but keep your configuration.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => engine.resetSimulation() },
      ]
    );
  };

  const handleExportAllCSV = () => {
    const csv = predictionsToCSV(engine.predictions);
    downloadFile(csv, `all_predictions_${Date.now()}.csv`, 'text/csv');
  };

  const handleExportAllJSON = () => {
    const json = predictionsToJSON(engine.predictions);
    downloadFile(json, `all_predictions_${Date.now()}.json`, 'application/json');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100, gap: theme.spacing.md }}>
        <Text style={styles.title}>Settings</Text>

        {/* Data Provider */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>MARKET DATA PROVIDER</Text>
          <Text style={styles.sectionDesc}>
            Select a data source. Synthetic mode generates fake prices for development. Live mode requires an API key.
          </Text>
          {(['NONE', 'SYNTHETIC', 'LIVE'] as DataMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.optionRow, engine.config.dataMode === mode && styles.optionRowActive]}
              onPress={() => engine.setDataMode(mode)}
            >
              <Text style={[styles.optionText, engine.config.dataMode === mode && styles.optionTextActive]}>
                {mode === 'NONE' ? 'Not configured' : mode === 'SYNTHETIC' ? 'Synthetic (Development)' : 'Live API'}
              </Text>
              <View style={[styles.radio, engine.config.dataMode === mode && styles.radioActive]} />
            </TouchableOpacity>
          ))}

          {/* Live API config */}
          {engine.config.dataMode === 'LIVE' && (
            <View style={styles.apiConfig}>
              <View style={styles.inputRow}>
                <Key size={14} color={theme.textMuted} strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  placeholder="API Key"
                  placeholderTextColor={theme.textMuted}
                  value={apiKeyInput}
                  onChangeText={setApiKeyInput}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputRow}>
                <Database size={14} color={theme.textMuted} strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  placeholder="API Endpoint URL"
                  placeholderTextColor={theme.textMuted}
                  value={apiEndpointInput}
                  onChangeText={setApiEndpointInput}
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => engine.updateConfig({ apiKey: apiKeyInput, apiEndpoint: apiEndpointInput })}
              >
                <Text style={styles.saveBtnText}>Save Credentials</Text>
              </TouchableOpacity>
              <Text style={styles.securityNote}>
                API keys are stored locally on your device only. They are never sent to any server except the data provider you configure. Never commit your keys to version control.
              </Text>
            </View>
          )}
        </View>

        {/* Asset selection */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>SELECTED ASSET</Text>
          <View style={styles.assetGrid}>
            {ASSETS.map((asset) => (
              <TouchableOpacity
                key={asset}
                style={[styles.assetChip, engine.config.selectedAsset === asset && styles.assetChipActive]}
                onPress={() => engine.updateConfig({ selectedAsset: asset })}
              >
                <Text style={[styles.assetChipText, engine.config.selectedAsset === asset && styles.assetChipTextActive]}>
                  {asset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Prediction settings */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PREDICTION SETTINGS</Text>
          <Text style={styles.fieldLabel}>Horizon</Text>
          <View style={styles.horizonRow}>
            {[2, 5, 10, 15].map((h) => (
              <TouchableOpacity
                key={h}
                style={[styles.horizonBtn, engine.config.selectedHorizon === h && styles.horizonBtnActive]}
                onPress={() => engine.updateConfig({ selectedHorizon: h as Horizon })}
              >
                <Text style={[styles.horizonBtnText, engine.config.selectedHorizon === h && styles.horizonBtnTextActive]}>
                  {h}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => engine.updateConfig({ autoPredict: !engine.config.autoPredict })}
          >
            <Text style={styles.toggleLabel}>Auto-predict cycle</Text>
            <View style={[styles.toggle, engine.config.autoPredict && styles.toggleOn]}>
              <View style={[styles.toggleKnob, engine.config.autoPredict && styles.toggleKnobOn]} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => engine.updateConfig({ autoTrade: !engine.config.autoTrade })}
          >
            <Text style={styles.toggleLabel}>Auto paper trade on signal</Text>
            <View style={[styles.toggle, engine.config.autoTrade && styles.toggleOn]}>
              <View style={[styles.toggleKnob, engine.config.autoTrade && styles.toggleKnobOn]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Paper trading settings */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PAPER TRADING</Text>
          <Text style={styles.fieldLabel}>Default Stake ($)</Text>
          <TextInput
            style={styles.textInput}
            value={engine.config.defaultStake.toString()}
            onChangeText={(v) => engine.updateConfig({ defaultStake: parseFloat(v) || 0 })}
            keyboardType="numeric"
          />
          <Text style={styles.fieldLabel}>Payout Percentage (%)</Text>
          <TextInput
            style={styles.textInput}
            value={engine.config.defaultPayoutPercentage.toString()}
            onChangeText={(v) => engine.updateConfig({ defaultPayoutPercentage: parseFloat(v) || 0 })}
            keyboardType="numeric"
          />
          <Text style={styles.fieldLabel}>Starting Balance ($)</Text>
          <TextInput
            style={styles.textInput}
            value={engine.config.paperBalance.toString()}
            onChangeText={(v) => engine.updateConfig({ paperBalance: parseFloat(v) || 0 })}
            keyboardType="numeric"
          />
        </View>

        {/* Data export */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>EXPORT DATA</Text>
          <View style={styles.exportRow}>
            <TouchableOpacity style={styles.exportBtn} onPress={handleExportAllCSV}>
              <Download size={14} color={theme.colors.primary[400]} strokeWidth={2} />
              <Text style={styles.exportText}>Predictions CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={handleExportAllJSON}>
              <Download size={14} color={theme.colors.primary[400]} strokeWidth={2} />
              <Text style={styles.exportText}>Predictions JSON</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy / security */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PRIVACY & SECURITY</Text>
          <View style={styles.privacyRow}>
            <Shield size={14} color={theme.colors.accent[400]} strokeWidth={2} />
            <Text style={styles.privacyText}>
              All data is stored locally on your device. No data is sent to any external server. API keys are stored in local storage and never logged.
            </Text>
          </View>
        </View>

        {/* Reset */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>RESET</Text>
          <TouchableOpacity style={styles.resetBtn} onPress={handleResetSim}>
            <RotateCcw size={14} color={theme.noSignal} strokeWidth={2} />
            <Text style={styles.resetBtnText}>Reset Simulation Data</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.resetBtn, { borderColor: theme.down }]} onPress={handleResetAll}>
            <RotateCcw size={14} color={theme.down} strokeWidth={2} />
            <Text style={[styles.resetBtnText, { color: theme.down }]}>Reset ALL Data</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          This is a private research tool for paper trading only. No real-money trading is implemented. Historical performance does not guarantee future results.
        </Text>
      </ScrollView>
    </SafeAreaView>
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
  sectionDesc: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.textSecondary,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.bgElevated,
  },
  optionRowActive: {
    backgroundColor: theme.colors.primary[600],
  },
  optionText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.sm,
    color: theme.textSecondary,
  },
  optionTextActive: {
    color: '#fff',
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.borderLight,
  },
  radioActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  apiConfig: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  input: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: theme.textPrimary,
    paddingVertical: 10,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary[600],
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.sm,
    color: '#fff',
  },
  securityNote: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: theme.textMuted,
  },
  assetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  assetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.bgElevated,
    borderWidth: 1,
    borderColor: theme.border,
  },
  assetChipActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[500],
  },
  assetChipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: theme.textSecondary,
  },
  assetChipTextActive: {
    color: '#fff',
  },
  fieldLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.textMuted,
  },
  horizonRow: {
    flexDirection: 'row',
    gap: 6,
  },
  horizonBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    backgroundColor: theme.bgElevated,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  horizonBtnActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[500],
  },
  horizonBtnText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 12,
    color: theme.textSecondary,
  },
  horizonBtnTextActive: {
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: theme.textPrimary,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.neutral[700],
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: {
    backgroundColor: theme.up,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  textInput: {
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: theme.textPrimary,
    borderWidth: 1,
    borderColor: theme.border,
  },
  exportRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.bgElevated,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  exportText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.primary[400],
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  privacyText: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.textSecondary,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.bgElevated,
    borderWidth: 1,
    borderColor: theme.noSignal,
    justifyContent: 'center',
  },
  resetBtnText: {
    fontFamily: theme.fonts.bold,
    fontSize: 12,
    color: theme.noSignal,
  },
  disclaimer: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: theme.textMuted,
    textAlign: 'center',
  },
});
