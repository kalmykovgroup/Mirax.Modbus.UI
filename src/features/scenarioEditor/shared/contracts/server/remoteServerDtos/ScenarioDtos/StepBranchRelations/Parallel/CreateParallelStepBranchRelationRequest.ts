// src/shared/contracts/Dtos/ScenarioDtos/StepBranchRelations/Parallel/CreateParallelStepBranchRelationRequest.ts

import type {Guid} from "@app/lib/types/Guid.ts";

/** Создание связи ParallelStep → Branch */
export interface CreateParallelStepBranchRelationRequest {
    /** Guid? — опционально для апдейта через Create */
    id?: Guid | null;

    /** Целевая ветка */
    branchId: Guid;

    /** Родительский Parallel-шаг */
    parallelStepId: Guid;

    sourceHandle: string;
    targetHandle: string;
}

/** Фабрика с дефолтами (на случай удобного конструирования) */
export const createParallelStepBranchRelationRequest = (
    required: Pick<CreateParallelStepBranchRelationRequest, "branchId" | "parallelStepId">,
    init: Partial<Omit<CreateParallelStepBranchRelationRequest, "branchId" | "parallelStepId">> = {},
    sourceHandle: string, targetHandle: string
): CreateParallelStepBranchRelationRequest => ({
    id: null,
    sourceHandle,
    targetHandle,
    ...required,
    ...init,
});