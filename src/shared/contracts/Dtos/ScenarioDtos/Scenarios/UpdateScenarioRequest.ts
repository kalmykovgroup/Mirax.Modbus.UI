import type { ScenarioStatus } from "@shared/contracts/Types/ScenarioStatus.ts";

export interface UpdateScenarioRequest {
    id: string;
    /** Название сценария */
    name: string;
    /** Описание сценария (опционально) */
    description?: string | null;
    /** Статус сценария (Draft, Active, Archived) */
    status: ScenarioStatus;
    /** Версия сценария */
    version: number;
}
