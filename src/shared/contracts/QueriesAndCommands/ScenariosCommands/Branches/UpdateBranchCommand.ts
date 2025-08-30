import type { UpdateBranchRequest } from "@shared/contracts/Dtos/ScenarioDtos/Branch/UpdateBranchRequest.ts";
import type { BranchDto } from "@shared/contracts/Dtos/ScenarioDtos/Branch/BranchDto.ts";
import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface UpdateBranchCommand {
    request: UpdateBranchRequest;
}

export type UpdateBranchCommandResponse = ApiResponse<BranchDto>;
