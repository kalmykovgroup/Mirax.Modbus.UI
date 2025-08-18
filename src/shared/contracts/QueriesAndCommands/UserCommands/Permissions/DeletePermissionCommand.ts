import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface DeletePermissionCommand {
    permissionId: string; // Guid
}

export type DeletePermissionCommandResponse = ApiResponse<boolean>;