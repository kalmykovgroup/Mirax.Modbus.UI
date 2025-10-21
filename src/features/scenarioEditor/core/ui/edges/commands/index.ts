// src/features/scenarioEditor/core/features/scenarioChangeCenter/relations/commands/index.ts

import { commandRegistry } from '@scenario/shared/contracts/registry/CommandRegistry';
import {
    RelationCreateCommandHandler,
    RelationUpdateCommandHandler,
    RelationDeleteCommandHandler,
} from './RelationCommandHandler';

commandRegistry.register(RelationCreateCommandHandler);
commandRegistry.register(RelationUpdateCommandHandler);
commandRegistry.register(RelationDeleteCommandHandler);