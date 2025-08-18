import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { GetByIdSystemActionsRequest } from "@shared/contracts/Dtos/ScenarioDtos/SystemActions/GetByIdSystemActionsRequest.ts";
import type { SystemActionDto } from "@shared/contracts/Dtos/ScenarioDtos/SystemActions/SystemActionDto.ts";

export interface GetByIdSystemActionsQuery {
    id: string; // Guid
    request: GetByIdSystemActionsRequest;
}

export type GetByIdSystemActionsQueryResponse = ApiResponse<SystemActionDto>;