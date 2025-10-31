// src/features/scenarioEditor/core/ui/nodes/shared/NodeContextMenu/providers/BaseNodeContextMenuProvider.ts

import { Trash2 } from 'lucide-react';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode.ts';
import type { NodeContextMenuAction, NodeContextMenuProvider } from '../types.ts';

/**
 * Базовый провайдер контекстного меню с общими действиями
 */
export class BaseNodeContextMenuProvider implements NodeContextMenuProvider {
    /**
     * Обработчик удаления ноды (должен быть установлен извне)
     */
    protected onDelete?: (node: FlowNode) => void;

    constructor(onDelete?: (node: FlowNode) => void) {
        this.onDelete = onDelete;
    }

    /**
     * Устанавливает обработчик удаления
     */
    setDeleteHandler(handler: (node: FlowNode) => void): void {
        this.onDelete = handler;
    }

    /**
     * Получает действие удаления
     */
    protected getDeleteAction(node: FlowNode): NodeContextMenuAction {
        return {
            id: 'delete',
            label: 'Удалить',
            icon: Trash2,
            onClick: (node: FlowNode) => {
                if (this.onDelete) {
                    this.onDelete(node);
                }
            },
            destructive: true,
        };
    }

    /**
     * Получает базовые действия (только удаление)
     */
    getActions(node: FlowNode): NodeContextMenuAction[] {
        return [this.getDeleteAction(node)];
    }
}
