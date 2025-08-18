import type { BranchDto } from "@shared/contracts/Dtos/ScenarioDtos/Branches/BranchDto.ts";
import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";


export interface GetBranchesByStepQuery {
    parallelStepId: string; // Guid
}

export type GetBranchesByStepQueryResponse = ApiResponse<BranchDto[]>;
