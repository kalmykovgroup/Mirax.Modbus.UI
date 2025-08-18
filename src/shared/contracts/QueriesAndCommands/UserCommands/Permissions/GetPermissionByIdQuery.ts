import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { PermissionDto } from "@shared/contracts/Dtos/UserDtos/Permissions/PermissionDto.ts";

export interface GetPermissionByIdQuery {
    permissionId: string; // Guid
}

export type GetPermissionByIdQueryResponse = ApiResponse<PermissionDto>;