import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { GetUserByEmailRequest } from "@shared/contracts/Dtos/UserDtos/Users/GetUserByEmailRequest.ts";
import type { UserDto } from "@shared/contracts/Dtos/UserDtos/Users/UserDto.ts";

export interface GetUserByEmailQuery {
    email: string;
    request: GetUserByEmailRequest;
}

export type GetUserByEmailQueryResponse = ApiResponse<UserDto>;