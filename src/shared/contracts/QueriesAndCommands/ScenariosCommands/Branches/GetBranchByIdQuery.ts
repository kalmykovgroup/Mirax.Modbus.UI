import type { BranchDto } from "@shared/contracts/Dtos/ScenarioDtos/Branches/BranchDto.ts";
import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface GetBranchByIdQuery {
    branchId: string; // Guid
}

export type GetBranchByIdQueryResponse = ApiResponse<BranchDto>;
