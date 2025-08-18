import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface DeleteUserCommand {
    id: string; // Guid
}

export type DeleteUserCommandResponse = ApiResponse<boolean>;