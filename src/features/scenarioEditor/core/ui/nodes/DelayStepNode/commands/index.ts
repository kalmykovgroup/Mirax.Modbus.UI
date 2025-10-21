// src/features/scenarioEditor/nodes/delayStep/commands/index.ts

import { commandRegistry } from '@scenario/shared/contracts/registry/CommandRegistry';
import {
    DelayStepCreateCommandHandler,
    DelayStepUpdateCommandHandler,
    DelayStepDeleteCommandHandler,
} from './DelayStepCommandHandler';

// Регистрируем обработчики при импорте модуля
commandRegistry.register(DelayStepCreateCommandHandler);
commandRegistry.register(DelayStepUpdateCommandHandler);
commandRegistry.register(DelayStepDeleteCommandHandler);

export {
    DelayStepCreateCommandHandler,
    DelayStepUpdateCommandHandler,
    DelayStepDeleteCommandHandler,
};