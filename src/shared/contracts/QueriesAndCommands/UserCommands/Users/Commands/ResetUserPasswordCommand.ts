import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { ResetUserPasswordResponse } from "@shared/contracts/Dtos/UserDtos/Users/ResetPassword/ResetUserPasswordResponse.ts";
import type {ResetUserPasswordRequest} from "@shared/contracts/Dtos/UserDtos/Users/ResetUserPasswordRequest.ts";

export interface ResetUserPasswordCommand {
    request: ResetUserPasswordRequest;
}

export type ResetUserPasswordCommandResponse = ApiResponse<ResetUserPasswordResponse>;