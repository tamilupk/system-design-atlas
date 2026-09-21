import type { StepComponentMap } from '@/types/lesson';
import { RequirementsStep } from './RequirementsStep';
import { ApiDataStep } from './ApiDataStep';
import { BaselineStep } from './BaselineStep';
import { IdGenerationStep } from './IdGenerationStep';
import { CacheStep } from './CacheStep';
import { ScalingStep } from './ScalingStep';
import { ReliabilityStep } from './ReliabilityStep';
import { TradeoffsStep } from './TradeoffsStep';
import { RecapStep } from './RecapStep';

export const urlShortenerSteps: StepComponentMap = {
  'requirements': RequirementsStep,
  'api-data': ApiDataStep,
  'baseline': BaselineStep,
  'id-generation': IdGenerationStep,
  'cache': CacheStep,
  'scaling': ScalingStep,
  'reliability': ReliabilityStep,
  'tradeoffs': TradeoffsStep,
  'recap': RecapStep,
};

export const stepComponents = urlShortenerSteps;
