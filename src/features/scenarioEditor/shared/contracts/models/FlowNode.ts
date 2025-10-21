// src/features/scenarioEditor/shared/contracts/models/FlowNode.ts
import type { CSSProperties } from 'react';
import type { FlowType } from '../types/FlowType';
import type { FlowNodeData } from './FlowNodeData';

export interface Position {
    readonly x: number;
    readonly y: number;
}

export interface FlowNode<TDto = unknown> {
    readonly id: string;
    readonly type: FlowType;
    readonly position: Position;
    readonly data: FlowNodeData<TDto>;
    readonly parentId?: string | undefined;
    readonly extent?: 'parent' | undefined;
    readonly expandParent?: boolean | undefined;
    readonly style?: CSSProperties | undefined;
    readonly selected?: boolean | undefined;
    readonly dragging?: boolean | undefined;
    readonly width?: number | undefined;
    readonly height?: number | undefined;
}

export interface FlowEdge<TData = unknown> {
    readonly id: string;
    readonly source: string;
    readonly target: string;
    readonly sourceHandle?: string | null | undefined;
    readonly targetHandle?: string | null | undefined;
    readonly type?: string | undefined;
    readonly data?: TData | undefined;
}