// src/features/scenarioEditor/core/services/NodeUpdateService.ts
import type { AppDispatch } from '@/baseStore/store';
import type { Guid } from '@app/lib/types/Guid';
import type { FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode';
import { FlowType } from '@scenario/core/ui/nodes/types/flowType.ts';
import { updateStep, updateBranch } from '@scenario/store/scenarioSlice';

/**
 * Сервис для обновления нод.
 * Определяет тип ноды по FlowType и вызывает соответствующий экшен Redux.
 */
export class NodeUpdateService {

    private readonly dispatch: AppDispatch

    constructor(dispatch: AppDispatch) {
        this.dispatch = dispatch;
    }

    /**
     * Универсальный метод обновления ноды.
     * Нода сама передаёт свои изменения, сервис определяет тип и применяет их.
     */
    updateNodeData<T = unknown>(node: FlowNode<T>, changes: Record<string, unknown>): void {
        const nodeId = node.id as Guid;

        // Определяем тип ноды по FlowType
        if (node.type === FlowType.BranchNode) {
            this.dispatch(
                updateBranch({
                    branchId: nodeId,
                    changes: changes as any,
                })
            );
        } else {
            // Все остальные типы — это шаги
            this.dispatch(
                updateStep({
                    stepId: nodeId,
                    changes: changes as any,
                })
            );
        }
    }

    /**
     * Обновление позиции ноды.
     * Вызывается после окончания drag.
     */
    updateNodePosition(node: FlowNode, x: number, y: number): void {
        console.log('[NodeUpdateService] 📍 Updating position:', {
            nodeId: node.id,
            nodeType: node.type,
            position: { x, y },
        });

        this.updateNodeData(node, { x, y });
    }

    /**
     * Обновление размера ноды.
     * Вызывается после окончания resize.
     */
    updateNodeSize(node: FlowNode, width: number, height: number): void {
        console.log('[NodeUpdateService] 📐 Updating size:', {
            nodeId: node.id,
            nodeType: node.type,
            size: { width, height },
        });

        this.updateNodeData(node, { width, height });
    }

    /**
     * Пакетное обновление (позиция + размер одновременно).
     */
    updateNodePositionAndSize(
        node: FlowNode,
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        console.log('[NodeUpdateService] 📍📐 Updating position and size:', {
            nodeId: node.id,
            nodeType: node.type,
            position: { x, y },
            size: { width, height },
        });

        this.updateNodeData(node, { x, y, width, height });
    }
}