 import type {LoginResponse} from "@shared/contracts/Dtos/UserDtos/Users/Login/LoginResponse.ts";

export interface LoginTokenResponse extends LoginResponse {
    token: string | null;
}