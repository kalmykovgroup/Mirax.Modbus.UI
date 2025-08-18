import type { BranchDto } from "@shared/contracts/Dtos/ScenarioDtos/Branches/BranchDto.ts";
import type { ScenarioStatus } from "@shared/contracts/Types/ScenarioStatus.ts";

export interface ScenarioDto {
    id: string;
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
