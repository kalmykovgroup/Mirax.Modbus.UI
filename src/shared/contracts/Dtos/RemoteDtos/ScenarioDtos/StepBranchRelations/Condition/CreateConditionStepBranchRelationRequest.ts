// src/shared/contracts/Dtos/ScenarioDtos/StepBranchRelations/Condition/CreateConditionStepBranchRelationRequest.ts

import type {Guid} from "@app/lib/types/Guid.ts";

/** Создание связи ConditionStep → Branch */
export interface CreateConditionStepBranchRelationRequest {
    /** Guid? — при апдейте через Create можно передать существующий Id */
    id?: Guid | null;

    /** Целевая ветка */
    branchId: Guid;

    /** Родительский Condition-шаг */
    conditionStepId: Guid;

    /** null/empty => «дефолтная» ветка */
    conditionExpression?: string | null;

    /** Меньше => выше приоритет (по умолчанию 0) */
    conditionOrder?: number | null;
}

/** Фабрика с дефолтами */
export const createConditionStepBranchRelationRequest = (
    required: Pick<CreateConditionStepBranchRelationRequest, "branchId" | "conditionStepId">,
    init: Partial<Omit<CreateConditionStepBranchRelationRequest, "branchId" | "conditionStepId">> = {},
): CreateConditionStepBranchRelationRequest => ({
    id: null,
    conditionExpression: null,
    conditionOrder: 0,
    ...required,   // обязательные поля всегда есть
    ...init,       // и можно переопределить дефолты
});