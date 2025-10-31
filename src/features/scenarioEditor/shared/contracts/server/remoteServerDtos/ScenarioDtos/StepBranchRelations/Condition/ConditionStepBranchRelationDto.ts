// src/shared/contracts/Dtos/ScenarioDtos/StepBranchRelations/Condition/ConditionStepBranchRelationDto.ts

import type {Guid} from "@app/lib/types/Guid.ts";
import EdgePathType from "@scenario/core/types/EdgePathType";

export interface ConditionStepBranchRelationDto {
    id: Guid;

    /** Ветка-цель для перехода. */
    branchId: Guid;

    /** Condition-шаг (родитель). */
    conditionStepId: Guid;

    /** null/empty => "дефолтная" ветка */
    conditionExpression?: string | null;

    /** Меньше => выше приоритет. */
    conditionOrder: number;

    sourceHandle: string;
    targetHandle: string;

    /** Тип визуального пути связи */
    edgePathType: EdgePathType;
}
