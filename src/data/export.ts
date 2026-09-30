import type { Prediction, PaperTrade } from '@/domain/types';

export function predictionsToCSV(predictions: Prediction[]): string {
  const headers = [
    'id', 'timestamp', 'asset', 'currentPrice', 'horizon',
    'upProbability', 'downProbability', 'expectedMovement',
    'confidence', 'confidenceLevel', 'signalQuality', 'direction',
    'modelAgreement', 'modelAgreementTotal', 'marketCondition',
    'latency', 'dataQuality',
    'outcomeTimestamp', 'actualPrice', 'actualDirection',
    'result', 'resolved',
  ];

  const rows = predictions.map((p) => [
    p.id,
    new Date(p.timestamp).toISOString(),
    p.asset,
    p.currentPrice.toString(),
    p.horizon.toString(),
    p.upProbability.toFixed(6),
    p.downProbability.toFixed(6),
    p.expectedMovement.toFixed(8),
    p.confidence.toFixed(6),
    p.confidenceLevel,
    p.signalQuality,
    p.direction,
    p.modelAgreement.toString(),
    p.modelAgreementTotal.toString(),
    p.marketCondition,
    p.latency.toString(),
    p.dataQuality,
    p.outcomeTimestamp ? new Date(p.outcomeTimestamp).toISOString() : '',
    p.actualPrice?.toString() ?? '',
    p.actualDirection ?? '',
    p.result ?? '',
    p.resolved?.toString() ?? 'false',
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function tradesToCSV(trades: PaperTrade[]): string {
  const headers = [
    'id', 'predictionId', 'timestamp', 'asset', 'direction',
    'stake', 'horizon', 'entryPrice', 'payoutPercentage',
    'status', 'exitPrice', 'pnl', 'resolvedAt',
  ];

  const rows = trades.map((t) => [
    t.id,
    t.predictionId,
    new Date(t.timestamp).toISOString(),
    t.asset,
    t.direction,
    t.stake.toString(),
    t.horizon.toString(),
    t.entryPrice.toString(),
    t.payoutPercentage.toString(),
    t.status,
    t.exitPrice?.toString() ?? '',
    t.pnl?.toString() ?? '',
    t.resolvedAt ? new Date(t.resolvedAt).toISOString() : '',
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function predictionsToJSON(predictions: Prediction[]): string {
  return JSON.stringify(predictions, null, 2);
}

export function tradesToJSON(trades: PaperTrade[]): string {
  return JSON.stringify(trades, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
