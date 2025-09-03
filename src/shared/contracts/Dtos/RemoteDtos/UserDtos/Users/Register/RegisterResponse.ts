import type { ErrorFieldDto } from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Users/ErrorFieldDto.ts";

export interface RegisterResponse {
    success: boolean;
    errors: ErrorFieldDto[];
}