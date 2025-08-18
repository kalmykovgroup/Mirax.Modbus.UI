import type { UpdateScenarioRequest } from "@shared/contracts/Dtos/ScenarioDtos/Scenarios/UpdateScenarioRequest.ts";
import type { ScenarioDto } from "@shared/contracts/Dtos/ScenarioDtos/Scenarios/ScenarioDto.ts";
import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface UpdateScenarioCommand {
    request: UpdateScenarioRequest;
}

export type UpdateScenarioCommandResponse = ApiResponse<ScenarioDto>;
