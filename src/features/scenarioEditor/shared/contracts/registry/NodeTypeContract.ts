// src/features/scenarioEditor/shared/contracts/registry/NodeTypeContract.ts
import type { ComponentType } from 'react';
import type { FlowType } from '@scenario/core/ui/nodes/types/flowType.ts';
import type { NodeProps } from '@xyflow/react';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';
import type {Guid} from "@app/lib/types/Guid.ts";
import type {AnyScenarioCommand} from "@scenario/core/features/scenarioChangeCenter/scenarioCommands.ts";

export interface NodeTypeContract<TDto = unknown> {
    readonly type: FlowType;
    readonly displayName: string;
    readonly Component: ComponentType<NodeProps<FlowNode<TDto>>>;
    readonly mapFromDto: (dto: TDto, parentId?: string) => FlowNode<TDto>;
    readonly mapToDto: (node: FlowNode<TDto>) => TDto;
    readonly canHaveChildBranches?: boolean; // Может ли иметь дочерние ветки
    readonly getBranchLinkMode?: (dto: TDto) => 'parallel' | 'condition' | undefined; // Режим связи с веткой

    /**
     * Создать команду на изменение позиции (NODE MOVED)
     */
    createMoveCommand?(
        scenarioId: Guid,
        nodeId: Guid,
        previousState: TDto,
        newX: number,
        newY: number
    ): AnyScenarioCommand | null;

    /**
     * Создать команду на изменение размера ноды через NodeResizer (NODE RESIZED manual)
     */
    createResizeCommand?(
        scenarioId: Guid,
        nodeId: Guid,
        previousState: TDto,
        newWidth: number,
        newHeight: number
    ): AnyScenarioCommand | null;

    /**
     * Создать команду на автоматическое расширение ветки (BRANCH AUTO-EXPANDED)
     * Вызывается когда дочерний элемент расширяет родительскую ветку
     */
    createAutoExpandCommand?(
        scenarioId: Guid,
        branchId: Guid,
        previousState: TDto,
        newWidth: number,
        newHeight: number
    ): AnyScenarioCommand | null;

    /**
     * Создать команду при присоединении степа к ветке (STEP ATTACHED TO BRANCH)
     */
    createAttachToBranchCommand?(
        scenarioId: Guid,
        stepId: Guid,
        branchId: Guid,
        previousState: TDto,
        newX: number,
        newY: number
    ): AnyScenarioCommand | null;

    /**
     * Создать команду при отсоединении степа от ветки (STEP DETACHED FROM BRANCH)
     */
    createDetachFromBranchCommand?(
        scenarioId: Guid,
        stepId: Guid,
        previousState: TDto,
        newX: number,
        newY: number
    ): AnyScenarioCommand | null;

    /**
     * Создать команду при выборе ноды (NODE SELECTED)
     */
    createSelectCommand?(
        scenarioId: Guid,
        nodeId: Guid,
        previousState: TDto
    ): AnyScenarioCommand | null;

    /**
     * Создать команду при снятии выбора ноды (NODE DESELECTED)
     */
    createDeselectCommand?(
        scenarioId: Guid,
        nodeId: Guid,
        previousState: TDto
    ): AnyScenarioCommand | null;
}