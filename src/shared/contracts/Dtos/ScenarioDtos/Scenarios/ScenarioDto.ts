
import type { ScenarioStatus } from "@shared/contracts/Types/ScenarioStatus.ts";
import {type BranchDto} from "@shared/contracts/Dtos/ScenarioDtos/Branch/BranchDto.ts";

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

// ——— фабрика ———
const genId = () => (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

export const ScenarioDto = {
    /**
     * Создать сценарий.
     * Если branch не передан — будет создана новая главная ветка.
     */
    create(
        p: {
            id: string;
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