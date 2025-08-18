import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { GetUserByIdRequest } from "@shared/contracts/Dtos/UserDtos/Users/GetUserByIdRequest.ts";
import type { UserDto } from "@shared/contracts/Dtos/UserDtos/Users/UserDto.ts";

export interface GetUserByIdQuery {
    id: string; // Guid
    request: GetUserByIdRequest;
}

export type GetUserByIdQueryResponse = ApiResponse<UserDto>;