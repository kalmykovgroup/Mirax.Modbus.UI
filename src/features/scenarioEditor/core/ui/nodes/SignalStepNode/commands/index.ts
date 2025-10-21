// src/features/scenarioEditor/nodes/signalStep/commands/index.ts

import { commandRegistry } from '@scenario/shared/contracts/registry/CommandRegistry';
import {
    SignalStepCreateCommandHandler,
    SignalStepUpdateCommandHandler,
    SignalStepDeleteCommandHandler,
    SignalStepMoveCommandHandler,
} from './SignalStepCommandHandler';

commandRegistry.register(SignalStepCreateCommandHandler);
commandRegistry.register(SignalStepUpdateCommandHandler);
commandRegistry.register(SignalStepDeleteCommandHandler);
commandRegistry.register(SignalStepMoveCommandHandler);