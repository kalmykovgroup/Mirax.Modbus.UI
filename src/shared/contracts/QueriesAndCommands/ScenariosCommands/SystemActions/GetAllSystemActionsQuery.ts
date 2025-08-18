import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { GetAllSystemActionsRequest } from "@shared/contracts/Dtos/ScenarioDtos/SystemActions/GetAllSystemActionsRequest.ts";
import type { SystemActionDto } from "@shared/contracts/Dtos/ScenarioDtos/SystemActions/SystemActionDto.ts";

export interface GetAllSystemActionsQuery {
    request: GetAllSystemActionsRequest;
}

export type GetAllSystemActionsQueryResponse = ApiResponse<SystemActionDto[]>;