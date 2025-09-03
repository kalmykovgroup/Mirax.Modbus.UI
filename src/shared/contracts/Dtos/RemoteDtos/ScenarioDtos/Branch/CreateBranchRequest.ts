import type {StepBaseDto} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/Steps/StepBaseDto.ts";

export interface CreateBranchRequest {
    scenarioId: string;
    name: string;
    description: string;
    waitForCompletion: boolean;
    parallelStepId?: string | null;
    conditionStepId?: string | null;
    conditionExpression?: string | null;
    conditionOrder: number;
    steps: StepBaseDto[];
}
