import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { LoginRequest } from "@shared/contracts/Dtos/UserDtos/Users/Login/LoginRequest.ts";
import type { LoginTokenResponse } from "@shared/contracts/Dtos/UserDtos/Users/Login/LoginTokenResponse.ts";

export interface LoginCommand {
    request: LoginRequest;
}

export type LoginCommandResponse = ApiResponse<LoginTokenResponse>;