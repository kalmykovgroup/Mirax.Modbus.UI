import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { GetAllUsersRequest } from "@shared/contracts/Dtos/UserDtos/Users/GetAllUsersRequest.ts";
import type { UserDto } from "@shared/contracts/Dtos/UserDtos/Users/UserDto.ts";

export interface GetAllUsersQuery {
    request: GetAllUsersRequest;
}

export type GetAllUsersQueryResponse = ApiResponse<UserDto[]>;