import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { CreateSystemActionRequest } from "@shared/contracts/Dtos/ScenarioDtos/SystemActions/CreateSystemActionRequest.ts";
import type { SystemActionDto } from "@shared/contracts/Dtos/ScenarioDtos/SystemActions/SystemActionDto.ts";

export interface CreateSystemActionCommand {
    request: CreateSystemActionRequest;
}

export type CreateSystemActionCommandResponse = ApiResponse<SystemActionDto>;