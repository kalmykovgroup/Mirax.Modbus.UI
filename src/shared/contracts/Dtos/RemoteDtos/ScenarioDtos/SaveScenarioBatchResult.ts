import type {Guid} from "@app/lib/types/Guid.ts";
import type {ScenarioOperationResult} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/ScenarioOperationResult.ts";

/** Ответ контроллера по батчу */
export interface SaveScenarioBatchResult {
    scenarioId: Guid
    results: ScenarioOperationResult[]
}