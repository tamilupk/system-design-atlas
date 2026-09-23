import { PresenceStep } from './PresenceStep';
import { FanoutStep } from './FanoutStep';
import { OperationsStep } from './OperationsStep';
import type { StepComponentMap } from '@/types/lesson';
import { RequirementsStep } from './RequirementsStep';
import { ProtocolStep } from './ProtocolStep';
import { BaselineStep } from './BaselineStep';
import { OrderingStep } from './OrderingStep';
import { RecoveryStep } from './RecoveryStep';
import { ScalingStep } from './ScalingStep';
import { ResilienceStep } from './ResilienceStep';
import { TradeoffsStep } from './TradeoffsStep';
import { RecapStep } from './RecapStep';

export const stepComponents: StepComponentMap = {
  'presence-receipts': PresenceStep,
  'hot-room-fanout': FanoutStep,
  operations: OperationsStep,
  'requirements': RequirementsStep,
  'api-data': ProtocolStep,
  'baseline': BaselineStep,
  'ordering': OrderingStep,
  'reconnect': RecoveryStep,
  'scaling': ScalingStep,
  'resilience': ResilienceStep,
  'tradeoffs': TradeoffsStep,
  'recap': RecapStep,
};
