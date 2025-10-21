// src/features/scenarioEditor/nodes/parallelStep/commands/index.ts

import { commandRegistry } from '@scenario/shared/contracts/registry/CommandRegistry';
import {
    ParallelStepCreateCommandHandler,
    ParallelStepUpdateCommandHandler,
    ParallelStepDeleteCommandHandler,
    ParallelStepMoveCommandHandler,
} from './ParallelStepCommandHandler';

commandRegistry.register(ParallelStepCreateCommandHandler);
commandRegistry.register(ParallelStepUpdateCommandHandler);
commandRegistry.register(ParallelStepDeleteCommandHandler);
commandRegistry.register(ParallelStepMoveCommandHandler);