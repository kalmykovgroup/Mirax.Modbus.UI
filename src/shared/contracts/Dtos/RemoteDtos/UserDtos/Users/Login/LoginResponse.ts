import type { UserDto } from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Users/UserDto.ts";
import type { ErrorFieldDto } from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Users/ErrorFieldDto.ts";

export interface LoginResponse {
    user: UserDto | null;
    success: boolean;
    errors: ErrorFieldDto[];
}