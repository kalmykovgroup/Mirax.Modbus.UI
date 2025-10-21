// src/features/scenarioEditor/core/features/scenarioChangeCenter/registerAllCommands.ts

// Импортируем все обработчики для регистрации
import '@scenario/core/ui/nodes/DelayStepNode/commands';
import '@scenario/core/ui/nodes/branchNode/commands';
import '@scenario/core/ui/nodes/jumpStep/commands';
import '@scenario/core/ui/nodes/signalStep/commands';
import '@scenario/core/ui/nodes/parallelStep/commands';
import '@scenario/core/ui/nodes/conditionStep/commands';
import '@scenario/core/ui/nodes/activitySystem/commands';
import '@scenario/core/ui/nodes/activityModbus/commands';
import '@scenario/core/features/scenarioChangeCenter/relations/commands';

// Этот файл просто импортирует все обработчики для их регистрации
console.log('[CommandRegistry] All command handlers registered');