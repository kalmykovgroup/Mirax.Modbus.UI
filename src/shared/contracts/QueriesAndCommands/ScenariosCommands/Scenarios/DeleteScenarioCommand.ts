import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface DeleteScenarioCommand {
    scenarioId: string; // Guid
}

export type DeleteScenarioCommandResponse = ApiResponse<boolean>;
