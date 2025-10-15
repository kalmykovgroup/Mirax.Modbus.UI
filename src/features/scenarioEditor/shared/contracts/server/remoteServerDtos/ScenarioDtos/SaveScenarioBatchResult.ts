import type {Guid} from "@app/lib/types/Guid.ts";
import type {ScenarioOperationResult} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/ScenarioOperationResult.ts";

/** Ответ контроллера по батчу */
export interface SaveScenarioBatchResult {
    scenarioId: Guid
    results: ScenarioOperationResult[]
}