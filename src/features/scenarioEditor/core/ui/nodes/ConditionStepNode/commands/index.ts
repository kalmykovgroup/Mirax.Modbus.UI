// src/features/scenarioEditor/nodes/conditionStep/commands/index.ts

import { commandRegistry } from '@scenario/shared/contracts/registry/CommandRegistry';
import {
    ConditionStepCreateCommandHandler,
    ConditionStepUpdateCommandHandler,
    ConditionStepDeleteCommandHandler,
    ConditionStepMoveCommandHandler,
} from './ConditionStepCommandHandler';

commandRegistry.register(ConditionStepCreateCommandHandler);
commandRegistry.register(ConditionStepUpdateCommandHandler);
commandRegistry.register(ConditionStepDeleteCommandHandler);
commandRegistry.register(ConditionStepMoveCommandHandler);