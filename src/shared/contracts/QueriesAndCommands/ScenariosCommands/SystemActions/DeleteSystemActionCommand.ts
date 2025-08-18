import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface DeleteSystemActionCommand {
    id: string; // Guid
}

export type DeleteSystemActionCommandResponse = ApiResponse<boolean>;