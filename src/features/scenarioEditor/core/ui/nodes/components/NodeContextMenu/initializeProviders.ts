// src/features/scenarioEditor/core/ui/nodes/shared/NodeContextMenu/initializeProviders.ts

import { FlowType } from '@scenario/core/types/flowType.ts';
import { NodeContextMenuRegistry } from './NodeContextMenuRegistry.ts';
import { BaseNodeContextMenuProvider } from './providers/BaseNodeContextMenuProvider.ts';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode.ts';

/**
 * Инициализирует провайдеры контекстного меню для всех типов нод
 */
export function initializeNodeContextMenuProviders(onDelete: (node: FlowNode) => void): void {
    // Создаем базовый провайдер с обработчиком удаления
    const createProvider = () => new BaseNodeContextMenuProvider(onDelete);

    // Регистрируем провайдер для каждого типа ноды
    // Пока все используют базовый провайдер (только кнопка "Удалить")
    // В будущем можно создать специализированные провайдеры для каждого типа
    NodeContextMenuRegistry.register(FlowType.Delay, createProvider());
    NodeContextMenuRegistry.register(FlowType.ActivityModbus, createProvider());
    NodeContextMenuRegistry.register(FlowType.ActivitySystem, createProvider());
    NodeContextMenuRegistry.register(FlowType.Signal, createProvider());
    NodeContextMenuRegistry.register(FlowType.Jump, createProvider());
    NodeContextMenuRegistry.register(FlowType.Parallel, createProvider());
    NodeContextMenuRegistry.register(FlowType.Condition, createProvider());
    NodeContextMenuRegistry.register(FlowType.BranchNode, createProvider());
}
