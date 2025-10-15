import type { ErrorFieldDto } from "@/features/user/shared/dtos/Users/ErrorFieldDto.ts";

export interface RegisterResponse {
    success: boolean;
    errors: ErrorFieldDto[];
}