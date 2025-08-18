import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { CreatePermissionRequest } from "@shared/contracts/Dtos/UserDtos/Permissions/CreatePermissionRequest.ts";
import type { PermissionDto } from "@shared/contracts/Dtos/UserDtos/Permissions/PermissionDto.ts";

export interface CreatePermissionCommand {
    request: CreatePermissionRequest;
}

export type CreatePermissionCommandResponse = ApiResponse<PermissionDto>;