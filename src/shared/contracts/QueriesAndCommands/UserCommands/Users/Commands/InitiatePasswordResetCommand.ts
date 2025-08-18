import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { InitiatePasswordResetRequest } from "@shared/contracts/Dtos/UserDtos/Users/InitiatePasswordResetRequest.ts";

export interface InitiatePasswordResetCommand {
    request: InitiatePasswordResetRequest;
}

export type InitiatePasswordResetCommandResponse = ApiResponse<boolean>;