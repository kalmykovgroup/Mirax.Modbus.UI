import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface DeleteBranchCommand {
    branchId: string; // Guid
}

export type DeleteBranchCommandResponse = ApiResponse<boolean>;
