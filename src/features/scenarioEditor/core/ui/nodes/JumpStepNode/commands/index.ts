// src/features/scenarioEditor/nodes/jumpStep/commands/index.ts

import { commandRegistry } from '@scenario/shared/contracts/registry/CommandRegistry';
import {
    JumpStepCreateCommandHandler,
    JumpStepUpdateCommandHandler,
    JumpStepDeleteCommandHandler,
    JumpStepMoveCommandHandler,
} from './JumpStepCommandHandler';

commandRegistry.register(JumpStepCreateCommandHandler);
commandRegistry.register(JumpStepUpdateCommandHandler);
commandRegistry.register(JumpStepDeleteCommandHandler);
commandRegistry.register(JumpStepMoveCommandHandler);