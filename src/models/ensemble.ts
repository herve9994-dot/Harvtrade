import type { MarketFeatures, ModelOutput, AppConfig, Direction } from '@/domain/types';
import { statisticalModel } from '@/models/statisticalModel';
import { mlModel } from '@/models/mlModel';
import { clamp } from '@/domain/config';

export function generateModelOutputs(
  features: MarketFeatures,
  config: AppConfig
): ModelOutput[] {
  const outputs: ModelOutput[] = [];

  const stat = statisticalModel(features);
  stat.contribution = config.modelWeights.statistical;
  outputs.push(stat);

  const ml = mlModel.predict(features);
  ml.contribution = config.modelWeights.ml;
  outputs.push(ml);

  return outputs;
}

export function combineEnsemble(
  modelOutputs: ModelOutput[],
  config: AppConfig
): ModelOutput {
  const totalWeight = modelOutputs.reduce((sum, m) => sum + m.contribution, 0);
  if (totalWeight === 0) {
    return {
      modelName: 'Ensemble',
      modelType: 'ENSEMBLE',
      upProbability: 0.5,
      downProbability: 0.5,
      expectedMovement: 0,
      confidence: 0,
      contribution: 1,
      features: [],
      explanation: 'No model outputs available',
    };
  }

  let upProb = 0;
  let downProb = 0;
  let expectedMovement = 0;
  let confidence = 0;

  for (const output of modelOutputs) {
    const weight = output.contribution / totalWeight;
    upProb += output.upProbability * weight;
    downProb += output.downProbability * weight;
    expectedMovement += output.expectedMovement * weight;
    confidence += output.confidence * weight;
  }

  upProb = clamp(upProb, 0.01, 0.99);
  downProb = 1 - upProb;

  const agreement = computeModelAgreement(modelOutputs);

  const explanationParts: string[] = [];
  explanationParts.push(`Ensemble of ${modelOutputs.length} models`);
  explanationParts.push(`Agreement: ${agreement}/${modelOutputs.length}`);
  if (agreement < modelOutputs.length) {
    explanationParts.push('Models disagree — reduced confidence');
  }

  return {
    modelName: 'Ensemble',
    modelType: 'ENSEMBLE',
    upProbability: upProb,
    downProbability: downProb,
    expectedMovement,
    confidence,
    contribution: config.modelWeights.ensemble,
    features: modelOutputs.flatMap((m) => m.features).filter((v, i, a) => a.indexOf(v) === i),
    explanation: explanationParts.join('; '),
  };
}

export function computeModelAgreement(modelOutputs: ModelOutput[]): number {
  if (modelOutputs.length === 0) return 0;
  const upCount = modelOutputs.filter((m) => m.upProbability > 0.5).length;
  const downCount = modelOutputs.length - upCount;
  return Math.max(upCount, downCount);
}

export function computeModelDisagreement(modelOutputs: ModelOutput[]): number {
  if (modelOutputs.length <= 1) return 0;
  const probs = modelOutputs.map((m) => m.upProbability);
  const mean = probs.reduce((a, b) => a + b, 0) / probs.length;
  const variance = probs.reduce((sum, p) => sum + (p - mean) ** 2, 0) / probs.length;
  return Math.sqrt(variance);
}
