import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface DeleteUserRoleCommand {
    id: string; // Guid
}

export type DeleteUserRoleCommandResponse = ApiResponse<boolean>;