// src/features/scenarioEditor/core/ui/nodes/shared/NodeContextMenu/NodeContextMenuRegistry.ts

import type { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { NodeContextMenuProvider } from './types';

/**
 * Реестр провайдеров контекстного меню для разных типов нод
 */
class NodeContextMenuRegistryClass {
    private providers = new Map<FlowType, NodeContextMenuProvider>();

    /**
     * Регистрирует провайдер для типа ноды
     */
    register(type: FlowType, provider: NodeContextMenuProvider): void {
        this.providers.set(type, provider);
    }

    /**
     * Получает провайдер для типа ноды
     */
    get(type: FlowType): NodeContextMenuProvider | undefined {
        return this.providers.get(type);
    }

    /**
     * Проверяет, зарегистрирован ли провайдер для типа
     */
    has(type: FlowType): boolean {
        return this.providers.has(type);
    }
}

export const NodeContextMenuRegistry = new NodeContextMenuRegistryClass();
