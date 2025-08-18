import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { UpdateSystemActionRequest } from "@shared/contracts/Dtos/ScenarioDtos/SystemActions/UpdateSystemActionRequest.ts";
import type { SystemActionDto } from "@shared/contracts/Dtos/ScenarioDtos/SystemActions/SystemActionDto.ts";

export interface UpdateSystemActionCommand {
    request: UpdateSystemActionRequest;
}

export type UpdateSystemActionCommandResponse = ApiResponse<SystemActionDto>;