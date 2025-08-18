import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { CreateUserRequest } from "@shared/contracts/Dtos/UserDtos/Users/CreateUserRequest.ts";
import type { UserDto } from "@shared/contracts/Dtos/UserDtos/Users/UserDto.ts";

export interface CreateUserCommand {
    request: CreateUserRequest;
}

export type CreateUserCommandResponse = ApiResponse<UserDto>;