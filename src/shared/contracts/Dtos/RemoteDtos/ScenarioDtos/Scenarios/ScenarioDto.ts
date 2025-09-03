
import type { ScenarioStatus } from "@shared/contracts/Types/Api.Shared/ScenarioStatus.ts";
import {type BranchDto} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/Branch/BranchDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

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

// ——— фабрика ———
const genId = () => (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

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
        const scenarioId = genId();



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