// src/shared/contracts/Dtos/ScenarioDtos/StepBranchRelations/Parallel/UpdateParallelStepBranchRelationRequest.ts

import type {Guid} from "@app/lib/types/Guid.ts";

/** Обновление связи ParallelStep → Branch */
export interface UpdateParallelStepBranchRelationRequest {
    /** Новая целевая ветка */
    branchId: Guid;
}
