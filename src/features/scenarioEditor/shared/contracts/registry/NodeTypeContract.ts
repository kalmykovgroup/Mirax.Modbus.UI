// src/features/scenarioEditor/shared/contracts/registry/NodeTypeContract.ts
import type { ComponentType } from 'react';
import type { FlowType } from '../types/FlowType';

import type { FlowNodeData } from '../models/FlowNodeData';
import type { NodeProps, Node as ReactFlowNode } from '@xyflow/react';

/**
 * Базовый контракт для каждого типа ноды.
 *
 * @template TDto - Тип DTO с сервера (бизнес-объект)
 */
export interface NodeTypeContract<TDto = unknown> {
    readonly type: FlowType;
    readonly dbTypeId?: number | undefined;
    readonly displayName: string;
    readonly description?: string | undefined;

    /**
     * Компонент для рендера ноды.
     * Используем ReactFlowNode (не DOM Node) с any для обхода ковариантности.
     */
    readonly Component: ComponentType<NodeProps<ReactFlowNode<FlowNodeData<any>>>>;

    readonly SettingsComponent?: ComponentType<NodeSettingsProps<TDto>> | undefined;
    readonly validate?: ((data: FlowNodeData<TDto>) => boolean) | undefined;
    readonly mapFromDto: (dto: TDto, parentId?: string | undefined) => NodeMappingResult<TDto>;
    readonly mapToDto: (data: FlowNodeData<TDto>, nodeId: string) => TDto;
    readonly handles?: NodeHandlesConfig | undefined;
    readonly canHaveChildren?: boolean | undefined;
    readonly defaultStyle?: Record<string, string | number> | undefined;
    readonly extent?: 'parent' | undefined;
    readonly expandParent?: boolean | undefined;
}

export interface NodeSettingsProps<TDto = unknown> {
    readonly nodeId: string;
    readonly data: FlowNodeData<TDto>;
    readonly onUpdate: (updated: FlowNodeData<TDto>) => void;
    readonly onClose: () => void;
}

export interface NodeMappingResult<TDto = unknown> {
    readonly id: string;
    readonly position: { readonly x: number; readonly y: number };
    readonly data: FlowNodeData<TDto>;
    readonly style?: Record<string, unknown> | undefined;
    readonly parentId?: string | undefined;
    readonly extent?: 'parent' | undefined;
    readonly expandParent?: boolean | undefined;
}

export interface NodeHandlesConfig {
    readonly sources?: ReadonlyArray<{
        readonly id: string;
        readonly label?: string | undefined;
    }> | undefined;
    readonly targets?: ReadonlyArray<{
        readonly id: string;
        readonly label?: string | undefined;
    }> | undefined;
}