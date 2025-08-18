import type { GetScenarioByIdRequest } from "@shared/contracts/Dtos/ScenarioDtos/Scenarios/GetScenarioByIdRequest.ts";
import type { ScenarioDto } from "@shared/contracts/Dtos/ScenarioDtos/Scenarios/ScenarioDto.ts";
import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface GetScenarioByIdQuery {
    scenarioId: string; // Guid
    request: GetScenarioByIdRequest;
}

export type GetScenarioByIdQueryResponse = ApiResponse<ScenarioDto>;
