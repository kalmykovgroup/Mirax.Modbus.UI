import type {StepBaseDto} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts";

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
