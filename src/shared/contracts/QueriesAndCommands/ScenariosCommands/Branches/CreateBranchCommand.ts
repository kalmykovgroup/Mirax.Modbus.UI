import type { CreateBranchRequest } from "@shared/contracts/Dtos/ScenarioDtos/Branch/CreateBranchRequest.ts";
import type { BranchDto } from "@shared/contracts/Dtos/ScenarioDtos/Branch/BranchDto.ts";
import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface CreateBranchCommand {
    request: CreateBranchRequest;
}

export type CreateBranchCommandResponse = ApiResponse<BranchDto>;
