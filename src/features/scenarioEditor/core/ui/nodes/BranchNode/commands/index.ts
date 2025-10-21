// src/features/scenarioEditor/nodes/branchNode/commands/index.ts

import { commandRegistry } from '@scenario/shared/contracts/registry/CommandRegistry';
import {
    BranchCreateCommandHandler,
    BranchUpdateCommandHandler,
    BranchDeleteCommandHandler,
    BranchResizeCommandHandler,
} from './BranchCommandHandler';

commandRegistry.register(BranchCreateCommandHandler);
commandRegistry.register(BranchUpdateCommandHandler);
commandRegistry.register(BranchDeleteCommandHandler);
commandRegistry.register(BranchResizeCommandHandler);

export {
    BranchCreateCommandHandler,
    BranchUpdateCommandHandler,
    BranchDeleteCommandHandler,
    BranchResizeCommandHandler,
};