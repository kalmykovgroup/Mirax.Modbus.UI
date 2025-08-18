export interface UpdateBranchRequest {
    id: string;
    scenarioId: string;
    name: string;
    description: string;
    waitForCompletion: boolean;
    parallelStepId?: string | null;
    conditionStepId?: string | null;
    conditionExpression?: string | null;
    conditionOrder: number;
}
