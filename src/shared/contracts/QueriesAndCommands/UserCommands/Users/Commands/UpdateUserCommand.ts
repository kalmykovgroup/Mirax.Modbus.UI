import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { UpdateUserRequest } from "@shared/contracts/Dtos/UserDtos/Users/UpdateUserRequest.ts";
import type { UserDto } from "@shared/contracts/Dtos/UserDtos/Users/UserDto.ts";

export interface UpdateUserCommand {
    request: UpdateUserRequest;
}

export type UpdateUserCommandResponse = ApiResponse<UserDto>;