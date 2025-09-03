import type { ScenarioStatus } from "@shared/contracts/Types/Api.Shared/ScenarioStatus.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

export interface UpdateScenarioRequest {
    id: Guid;
    /** Название сценария */
    name: string;
    /** Описание сценария (опционально) */
    description?: string | null;
    /** Статус сценария (Draft, Active, Archived) */
    status: ScenarioStatus;
    /** Версия сценария */
    version: number;
}
