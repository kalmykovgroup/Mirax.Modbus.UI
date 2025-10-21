// src/features/scenarioEditor/nodes/activitySystem/commands/index.ts

import { commandRegistry } from '@scenario/shared/contracts/registry/CommandRegistry';
import {
    ActivitySystemCreateCommandHandler,
    ActivitySystemUpdateCommandHandler,
    ActivitySystemDeleteCommandHandler,
    ActivitySystemMoveCommandHandler,
} from './ActivitySystemCommandHandler';

commandRegistry.register(ActivitySystemCreateCommandHandler);
commandRegistry.register(ActivitySystemUpdateCommandHandler);
commandRegistry.register(ActivitySystemDeleteCommandHandler);
commandRegistry.register(ActivitySystemMoveCommandHandler);