import type { StepComponentMap } from '@/types/lesson';
import { RequirementsStep } from './RequirementsStep';
import { ApiDataStep } from './ApiDataStep';
import { BaselineStep } from './BaselineStep';
import { SeatContentionStep } from './SeatContentionStep';
import { HoldExpiryStep } from './HoldExpiryStep';
import { PaymentsStep } from './PaymentsStep';
import { ReconciliationStep } from './ReconciliationStep';
import { AvailabilityStep } from './AvailabilityStep';
import { AdmissionStep } from './AdmissionStep';
import { PartitioningStep } from './PartitioningStep';
import { RegionalFailureStep } from './RegionalFailureStep';
import { OperationsStep } from './OperationsStep';
import { TradeoffsStep } from './TradeoffsStep';
import { RecapStep } from './RecapStep';

export const stepComponents: StepComponentMap = {
  'requirements': RequirementsStep,
  'api-data': ApiDataStep,
  'baseline': BaselineStep,
  'seat-contention': SeatContentionStep,
  'hold-expiry': HoldExpiryStep,
  'payments': PaymentsStep,
  'reconciliation': ReconciliationStep,
  'availability': AvailabilityStep,
  'admission': AdmissionStep,
  'partitioning': PartitioningStep,
  'regional-failure': RegionalFailureStep,
  'operations': OperationsStep,
  'tradeoffs': TradeoffsStep,
  'recap': RecapStep,
};
