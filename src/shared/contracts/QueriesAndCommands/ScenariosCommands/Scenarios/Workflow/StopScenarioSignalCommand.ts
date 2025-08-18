import type { StopScenarioSignalRequest } from "@shared/contracts/Dtos/ScenarioDtos/Scenarios/Workflow/StopScenarioSignalRequest.ts";
import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface StopScenarioSignalCommand {
    request: StopScenarioSignalRequest;
}

export type StopScenarioSignalCommandResponse = ApiResponse<object>;