import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { UserExistsRequest } from "@shared/contracts/Dtos/UserDtos/Users/UserExistsRequest.ts";

export interface UserExistsQuery {
    request: UserExistsRequest;
}

export type UserExistsQueryResponse = ApiResponse<boolean>;