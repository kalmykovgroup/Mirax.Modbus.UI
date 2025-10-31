// src/features/scenarioEditor/core/ui/nodes/shared/NodeContextMenu/types.ts

import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode.ts';
import type { LucideIcon } from 'lucide-react';

/**
 * Действие контекстного меню ноды
 */
export interface NodeContextMenuAction {
    /** Уникальный идентификатор действия */
    id: string;

    /** Отображаемая метка */
    label: string;

    /** Иконка действия (из lucide-react) */
    icon?: LucideIcon;

    /** Обработчик клика */
    onClick: (node: FlowNode) => void;

    /** Является ли действие деструктивным (красный цвет) */
    destructive?: boolean;

    /** Disabled состояние */
    disabled?: boolean;

    /** Tooltip при disabled */
    disabledTooltip?: string;
}

/**
 * Контракт провайдера действий контекстного меню для конкретного типа ноды
 */
export interface NodeContextMenuProvider {
    /** Получить список действий для ноды */
    getActions(node: FlowNode): NodeContextMenuAction[];
}

/**
 * Позиция меню
 */
export interface MenuPosition {
    x: number;
    y: number;
}
