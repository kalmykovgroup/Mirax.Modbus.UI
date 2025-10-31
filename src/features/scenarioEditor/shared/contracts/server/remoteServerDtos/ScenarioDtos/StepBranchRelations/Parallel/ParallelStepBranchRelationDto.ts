// src/shared/contracts/Dtos/ScenarioDtos/StepBranchRelations/Parallel/ParallelStepBranchRelationDto.ts

import type {Guid} from "@app/lib/types/Guid.ts";
import EdgePathType from "@scenario/core/types/EdgePathType";

export interface ParallelStepBranchRelationDto {
    id: Guid;
    /** Ветка, запускаемая параллельным шагом. */
    branchId: Guid;
    /** Параллельный шаг (родитель). */
    parallelStepId: Guid;

    sourceHandle: string;
    targetHandle: string;

    /** Тип визуального пути связи */
    edgePathType: EdgePathType;
}
