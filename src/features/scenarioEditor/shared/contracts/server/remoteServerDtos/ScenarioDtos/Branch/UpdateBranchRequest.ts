import type {Guid} from "@app/lib/types/Guid.ts";

export interface UpdateBranchRequest {
    id: Guid;
    scenarioId: string;
    name: string;
    description: string;
    waitForCompletion: boolean;
    parallelStepId?: string | null;
    conditionStepId?: string | null;
    conditionExpression?: string | null;
    conditionOrder: number;
}
