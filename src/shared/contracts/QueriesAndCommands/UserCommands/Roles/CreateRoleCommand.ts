import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { CreateRoleRequest } from "@shared/contracts/Dtos/UserDtos/Roles/CreateRoleRequest.ts";
import type { RoleDto } from "@shared/contracts/Dtos/UserDtos/Roles/RoleDto.ts";

export interface CreateRoleCommand {
    request: CreateRoleRequest;
}

export type CreateRoleCommandResponse = ApiResponse<RoleDto>;