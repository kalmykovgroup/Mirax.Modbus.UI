import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { UpdateRoleRequest } from "@shared/contracts/Dtos/UserDtos/Roles/UpdateRoleRequest.ts";
import type { RoleDto } from "@shared/contracts/Dtos/UserDtos/Roles/RoleDto.ts";

export interface UpdateRoleCommand {
    request: UpdateRoleRequest;
}

export type UpdateRoleCommandResponse = ApiResponse<RoleDto>;