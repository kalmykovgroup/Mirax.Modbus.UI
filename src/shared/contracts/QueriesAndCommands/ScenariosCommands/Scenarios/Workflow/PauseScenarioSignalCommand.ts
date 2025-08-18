import type { PauseScenarioSignalRequest } from "@shared/contracts/Dtos/ScenarioDtos/Scenarios/Workflow/PauseScenarioSignalRequest.ts";
import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface PauseScenarioSignalCommand {
    request: PauseScenarioSignalRequest;
}

export type PauseScenarioSignalCommandResponse = ApiResponse<object>;