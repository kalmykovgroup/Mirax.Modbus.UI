import type { ScenarioStatus } from "@scenario/shared/contracts/server/types/Api.Shared/ScenarioStatus.ts";
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
