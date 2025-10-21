// src/features/scenarioEditor/nodes/activityModbus/commands/index.ts

import { commandRegistry } from '@scenario/shared/contracts/registry/CommandRegistry';
import {
    ActivityModbusCreateCommandHandler,
    ActivityModbusUpdateCommandHandler,
    ActivityModbusDeleteCommandHandler,
    ActivityModbusMoveCommandHandler,
} from './ModbusActivityCommandHandler';

commandRegistry.register(ActivityModbusCreateCommandHandler);
commandRegistry.register(ActivityModbusUpdateCommandHandler);
commandRegistry.register(ActivityModbusDeleteCommandHandler);
commandRegistry.register(ActivityModbusMoveCommandHandler);