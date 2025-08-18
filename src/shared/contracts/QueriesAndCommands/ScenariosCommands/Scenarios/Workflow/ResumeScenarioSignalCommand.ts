import type { ResumeScenarioSignalRequest } from "@shared/contracts/Dtos/ScenarioDtos/Scenarios/Workflow/ResumeScenarioSignalRequest.ts";
import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface ResumeScenarioSignalCommand {
    request: ResumeScenarioSignalRequest;
}

export type ResumeScenarioSignalCommandResponse = ApiResponse<object>;