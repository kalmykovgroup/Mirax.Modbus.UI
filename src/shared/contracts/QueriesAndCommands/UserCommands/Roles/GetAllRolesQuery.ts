import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { RoleDto } from "@shared/contracts/Dtos/UserDtos/Roles/RoleDto.ts";

export interface GetAllRolesQuery {}

export type GetAllRolesQueryResponse = ApiResponse<RoleDto[]>;