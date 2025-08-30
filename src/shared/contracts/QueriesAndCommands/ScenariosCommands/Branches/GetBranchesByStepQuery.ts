import type { BranchDto } from "@shared/contracts/Dtos/ScenarioDtos/Branch/BranchDto.ts";
import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";


export interface GetBranchesByStepQuery {
    parallelStepId: string; // Guid
}

export type GetBranchesByStepQueryResponse = ApiResponse<BranchDto[]>;
