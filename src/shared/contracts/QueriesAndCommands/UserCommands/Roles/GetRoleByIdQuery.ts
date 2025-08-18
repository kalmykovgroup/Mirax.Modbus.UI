import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { RoleDto } from "@shared/contracts/Dtos/UserDtos/Roles/RoleDto.ts";

export interface GetRoleByIdQuery {
    roleId: string; // Guid
}

export type GetRoleByIdQueryResponse = ApiResponse<RoleDto>;