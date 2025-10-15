
import type { ScenarioStatus } from "@scenario/shared/contracts/server/types/Api.Shared/ScenarioStatus.ts";
import {type BranchDto} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto.ts";
import {Guid} from "@app/lib/types/Guid.ts";


export interface ScenarioDto {
    id: Guid;
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


export const ScenarioDto = {
    /**
     * Создать сценарий.
     * Если branch не передан — будет создана новая главная ветка.
     */
    create(
        p: {
            id: Guid;
            name: string;
            status: ScenarioStatus;
            description?: string | null;
            version?: number;
            branch: BranchDto;
            scenarioIdForNewBranch?: string; // если хочешь принудительно указать id для создаваемой ветки
        }
    ): ScenarioDto {
        const scenarioId: Guid = Guid.NewGuid();

        return {
            id: p.id ?? scenarioId,
            name: p.name,
            description: p.description ?? null,
            status: p.status,
            version: p.version ?? 1,
            branch: p.branch,
        };
    },
} as const;