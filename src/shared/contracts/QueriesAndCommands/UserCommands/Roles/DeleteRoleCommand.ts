import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface DeleteRoleCommand {
    roleId: string; // Guid
}

export type DeleteRoleCommandResponse = ApiResponse<boolean>;