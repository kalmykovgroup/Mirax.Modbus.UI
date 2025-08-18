import type { CreateScenarioRequest } from "@shared/contracts/Dtos/ScenarioDtos/Scenarios/CreateScenarioRequest.ts";
import type { ScenarioDto } from "@shared/contracts/Dtos/ScenarioDtos/Scenarios/ScenarioDto.ts";
import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface CreateScenarioCommand {
    request: CreateScenarioRequest;
}

export type CreateScenarioCommandResponse = ApiResponse<ScenarioDto>;
