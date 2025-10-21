// src/features/scenarioEditor/shared/contracts/models/FlowNodeData.ts
import type { ConnectContext } from './ConnectContext';

/**
 * Базовые поля данных ноды
 */
interface FlowNodeDataBase<T = unknown> {
    readonly object: T;
    readonly connectContext?: ConnectContext | undefined;
    readonly x: number;
    readonly y: number;
    readonly isDropTarget?: boolean | undefined;
    readonly __persisted?: boolean | undefined;
}

/**
 * FlowNodeData с расширением Record<string, unknown> для ReactFlow.
 *
 * Используем intersection (&) вместо extends, чтобы обойти проблемы
 * с exactOptionalPropertyTypes: true.
 */
export type FlowNodeData<T = unknown> = FlowNodeDataBase<T> & Record<string, unknown>;