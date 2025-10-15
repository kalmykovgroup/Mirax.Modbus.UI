import type {Guid} from "@app/lib/types/Guid.ts";
import type {ScenarioOperationDto} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/ScenarioOperationDto.ts";

/** Запрос на применение пачки изменений */
export interface ScenarioBatchOperationsRequest {
    scenarioId: Guid
    operations: ScenarioOperationDto[]
}