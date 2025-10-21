// src/features/scenarioEditor/shared/contracts/registry/NodeTypeContract.ts
import type { ComponentType } from 'react';
import type { FlowType } from '@scenario/core/ui/nodes/types/flowType.ts';
import type { NodeProps } from '@xyflow/react';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';

export interface NodeTypeContract<TDto = unknown> {
    readonly type: FlowType;
    readonly displayName: string;
    readonly Component: ComponentType<NodeProps<FlowNode<TDto>>>;
    readonly mapFromDto: (dto: TDto, parentId?: string) => FlowNode<TDto>;
    readonly mapToDto: (node: FlowNode<TDto>) => TDto;
    readonly canHaveChildBranches?: boolean; // Может ли иметь дочерние ветки
    readonly getBranchLinkMode?: (dto: TDto) => 'parallel' | 'condition' | undefined; // Режим связи с веткой
}