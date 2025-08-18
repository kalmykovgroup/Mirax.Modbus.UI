import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { CreateUserRoleRequest } from "@shared/contracts/Dtos/UserDtos/UserRoles/CreateUserRoleRequest.ts";
import type { UserRoleDto } from "@shared/contracts/Dtos/UserDtos/UserRoles/UserRoleDto.ts";

export interface CreateUserRoleCommand {
    request: CreateUserRoleRequest;
}

export type CreateUserRoleCommandResponse = ApiResponse<UserRoleDto>;