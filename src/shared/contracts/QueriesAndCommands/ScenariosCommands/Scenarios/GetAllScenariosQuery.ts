import type { GetAllScenariosRequest } from "@shared/contracts/Dtos/ScenarioDtos/Scenarios/GetAllScenariosRequest.ts";
import type { ScenarioDto } from "@shared/contracts/Dtos/ScenarioDtos/Scenarios/ScenarioDto.ts";
import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface GetAllScenariosQuery {
    request: GetAllScenariosRequest;
}

export type GetAllScenariosQueryResponse = ApiResponse<ScenarioDto[]>;
