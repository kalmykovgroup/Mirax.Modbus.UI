import type { UserDto } from "@/features/user/shared/dtos/Users/UserDto.ts";
import type { ErrorFieldDto } from "@/features/user/shared/dtos/Users/ErrorFieldDto.ts";

export interface LoginResponse {
    user: UserDto | null;
    success: boolean;
    errors: ErrorFieldDto[];
}