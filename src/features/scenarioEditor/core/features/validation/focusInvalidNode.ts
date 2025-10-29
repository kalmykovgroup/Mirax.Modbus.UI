// src/features/scenarioEditor/core/features/validation/focusInvalidNode.ts

import type { ReactFlowInstance } from '@xyflow/react';
import type { Guid } from '@app/lib/types/Guid';

/**
 * Фокусирует камеру на невалидной ноде и выделяет её
 * @param rf - ReactFlow instance
 * @param nodeId - ID ноды для фокусировки
 * @param duration - Длительность анимации в мс (по умолчанию 800)
 */
export function focusOnInvalidNode(
    rf: ReactFlowInstance,
    nodeId: Guid,
    duration: number = 800
): void {
    // Получаем ноду
    const node = rf.getNode(nodeId);

    if (!node) {
        console.warn(`[focusOnInvalidNode] Node ${nodeId} not found`);
        return;
    }

    // Выделяем ноду
    rf.setNodes((nodes) =>
        nodes.map((n) => ({
            ...n,
            selected: n.id === nodeId,
        }))
    );

    // Фокусируем камеру на ноде с анимацией
    rf.fitView({
        nodes: [node],
        duration,
        padding: 0.5, // Отступ вокруг ноды (50% от viewport)
        maxZoom: 1.5, // Максимальный зум
        minZoom: 0.5, // Минимальный зум
    });

    console.log(`[focusOnInvalidNode] Focused on node: ${nodeId}`);
}

/**
 * Фокусирует на первой невалидной ноде из списка
 * @param rf - ReactFlow instance
 * @param invalidNodeIds - Массив ID невалидных нод
 * @param duration - Длительность анимации в мс
 */
export function focusOnFirstInvalidNode(
    rf: ReactFlowInstance,
    invalidNodeIds: Guid[],
    duration: number = 800
): void {
    if (invalidNodeIds.length === 0) {
        console.warn('[focusOnFirstInvalidNode] No invalid nodes to focus on');
        return;
    }

    // Используем non-null assertion, так как мы уже проверили что массив не пустой
    const firstInvalidNodeId = invalidNodeIds[0]!;
    focusOnInvalidNode(rf, firstInvalidNodeId, duration);
}
