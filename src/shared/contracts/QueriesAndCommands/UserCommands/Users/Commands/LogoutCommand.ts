import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface LogoutCommand {}

export type LogoutCommandResponse = ApiResponse<boolean>;