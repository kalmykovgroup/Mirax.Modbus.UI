// src/shared/contracts/Dtos/ScenarioDtos/StepBranchRelations/Condition/UpdateConditionStepBranchRelationRequest.ts

import type {Guid} from "@app/lib/types/Guid.ts";

/** Обновление связи ConditionStep → Branch */
export interface UpdateConditionStepBranchRelationRequest {
    /** Целевая ветка */
    branchId: Guid;

    /** Пустая строка трактуется как «дефолтная» ветка */
    conditionExpression: string;

    /** Меньше => выше приоритет */
    conditionOrder: number;
}
