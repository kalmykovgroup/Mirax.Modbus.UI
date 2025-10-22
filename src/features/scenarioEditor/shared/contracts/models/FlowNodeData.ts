// src/features/scenarioEditor/shared/contracts/models/FlowNodeData.ts

import type { ConnectContext } from './ConnectContext';
import type { BaseNodeDto } from '@scenario/shared/contracts/registry/NodeTypeContract';

/**
 * Базовые поля данных ноды
 * T extends BaseNodeDto — гарантирует, что object всегда объект с id
 */
interface FlowNodeDataBase<T extends BaseNodeDto = BaseNodeDto> {
    readonly object: T;
    readonly connectContext?: ConnectContext | undefined;
    readonly x: number;
    readonly y: number;
    readonly isDropTarget?: boolean | undefined;
    readonly __persisted?: boolean | undefined;
}

/**
 * FlowNodeData с расширением Record<string, unknown> для ReactFlow
 */
export type FlowNodeData<T extends BaseNodeDto = BaseNodeDto> = FlowNodeDataBase<T> &
    Record<string, unknown>;