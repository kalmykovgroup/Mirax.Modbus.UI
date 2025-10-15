import type { BranchDto } from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto.ts";
import type { ScenarioStatus } from "@scenario/shared/contracts/server/types/Api.Shared/ScenarioStatus.ts";

export interface CreateScenarioRequest {
    /** Название сценария */
    name: string;
    /** Описание сценария (опционально) */
    description?: string | null;
    /** Статус сценария (Draft, Active, Archived) */
    status: ScenarioStatus;
    /** Версия сценария */
    version: number;
    /** Главная ветка сценария */
    branch: BranchDto;
}
