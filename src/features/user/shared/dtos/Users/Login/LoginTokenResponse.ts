 import type {LoginResponse} from "@/features/user/shared/dtos/Users/Login/LoginResponse.ts";

export interface LoginTokenResponse extends LoginResponse {
    token: string | null;
}