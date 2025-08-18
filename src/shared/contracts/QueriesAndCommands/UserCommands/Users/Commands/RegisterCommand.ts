import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { RegisterRequest } from "@shared/contracts/Dtos/UserDtos/Users/Register/RegisterRequest.ts";
import type { RegisterResponse } from "@shared/contracts/Dtos/UserDtos/Users/Register/RegisterResponse.ts";

export interface RegisterCommand {
    request: RegisterRequest;
}

export type RegisterCommandResponse = ApiResponse<RegisterResponse>;