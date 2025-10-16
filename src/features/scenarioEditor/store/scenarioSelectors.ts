// src/features/scenario/scenarioSelectors.ts

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/baseStore/store';
import type { Guid } from '@app/lib/types/Guid';
import type { NormalizedBranch, NormalizedStep, ScenarioMeta } from './scenarioSlice';
import type { StepRelationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepRelations/StepRelationDto';
import type { ScenarioDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Scenarios/ScenarioDto';
import { denormalizeScenario } from './scenarioNormalization';

// ============================================================================
// BASE SELECTORS
// ============================================================================

export const selectScenarioState = (state: RootState) => state.scenario;

export const selectActiveScenarioId = (state: RootState) => state.scenario.activeScenarioId;

export const selectScenarios = (state: RootState) => state.scenario.scenarios.entities;
export const selectScenarioIds = (state: RootState) => state.scenario.scenarios.ids as Guid[];

export const selectBranches = (state: RootState) => state.scenario.branches.entities;
export const selectBranchIds = (state: RootState) => state.scenario.branches.ids as Guid[];

export const selectSteps = (state: RootState) => state.scenario.steps.entities;
export const selectStepIds = (state: RootState) => state.scenario.steps.ids as Guid[];

export const selectRelations = (state: RootState) => state.scenario.relations.entities;
export const selectRelationIds = (state: RootState) => state.scenario.relations.ids as Guid[];

export const selectErrorLoadList = (state: RootState) => state.scenario.errorLoadList;
export const selectLastFetchedAt = (state: RootState) => state.scenario.lastFetchedAt;

// ============================================================================
// SCENARIO SELECTORS
// ============================================================================

/**
 * Получить мета-информацию сценария по ID
 */
export const selectScenarioById = createSelector(
    [selectScenarios, (_state: RootState, scenarioId: Guid) => scenarioId],
    (scenarios, scenarioId): ScenarioMeta | null => {
        const scenario = scenarios[scenarioId];
        return scenario ?? null;
    }
);

/**
 * Получить активный сценарий (мета)
 */
export const selectActiveScenario = createSelector(
    [selectScenarios, selectActiveScenarioId],
    (scenarios, activeId): ScenarioMeta | null => {
        if (!activeId) return null;
        const scenario = scenarios[activeId];
        return scenario ?? null;
    }
);

/**
 * Получить полную денормализованную структуру сценария
 */
export const selectDenormalizedScenario = createSelector(
    [
        selectScenarios,
        selectBranches,
        selectSteps,
        selectRelations,
        (_state: RootState, scenarioId: Guid) => scenarioId,
    ],
    (scenarios, branches, steps, relations, scenarioId): ScenarioDto | null => {
        return denormalizeScenario(scenarioId, scenarios, branches, steps, relations);
    }
);

/**
 * Получить активный денормализованный сценарий
 */
export const selectActiveDenormalizedScenario = createSelector(
    [selectScenarios, selectBranches, selectSteps, selectRelations, selectActiveScenarioId],
    (scenarios, branches, steps, relations, activeId): ScenarioDto | null => {
        if (!activeId) return null;
        return denormalizeScenario(activeId, scenarios, branches, steps, relations);
    }
);

/**
 * Список всех сценариев (мета)
 */
export const selectAllScenarios = createSelector([selectScenarios, selectScenarioIds], (scenarios, ids) => {
    return ids.map((id) => scenarios[id]).filter(Boolean) as ScenarioMeta[];
});

// ============================================================================
// BRANCH SELECTORS
// ============================================================================

/**
 * Получить ветку по ID
 */
export const selectBranchById = createSelector(
    [selectBranches, (_state: RootState, branchId: Guid) => branchId],
    (branches, branchId): NormalizedBranch | null => {
        const branch = branches[branchId];
        return branch ?? null;
    }
);

/**
 * Получить главную ветку сценария
 */
export const selectMainBranch = createSelector(
    [selectBranches, (_state: RootState, scenarioId: Guid) => scenarioId, selectScenarios],
    (branches, scenarioId, scenarios): NormalizedBranch | null => {
        const scenario = scenarios[scenarioId];
        if (!scenario) return null;

        const mainBranch = branches[scenario.mainBranchId];
        return mainBranch ?? null;
    }
);

/**
 * Получить все ветки сценария
 */
export const selectBranchesByScenarioId = createSelector(
    [selectBranches, (_state: RootState, scenarioId: Guid) => scenarioId],
    (branches, scenarioId): readonly NormalizedBranch[] => {
        return Object.values(branches)
            .filter((branch) => branch && branch.scenarioId === scenarioId)
            .filter(Boolean) as NormalizedBranch[];
    }
);

/**
 * Получить дочерние ветки для Parallel/Condition шага
 */
export const selectChildBranchesByStepId = createSelector(
    [selectBranches, (_state: RootState, stepId: Guid) => stepId],
    (branches, stepId): readonly NormalizedBranch[] => {
        return Object.values(branches)
            .filter((branch) => branch && branch.parentStepId === stepId)
            .filter(Boolean) as NormalizedBranch[];
    }
);

// ============================================================================
// STEP SELECTORS
// ============================================================================

/**
 * Получить шаг по ID
 */
export const selectStepById = createSelector(
    [selectSteps, (_state: RootState, stepId: Guid) => stepId],
    (steps, stepId): NormalizedStep | null => {
        const step = steps[stepId];
        return step ?? null;
    }
);

/**
 * Получить все шаги ветки (в порядке stepIds)
 */
export const selectStepsByBranchId = createSelector(
    [selectSteps, selectBranches, (_state: RootState, branchId: Guid) => branchId],
    (steps, branches, branchId): readonly NormalizedStep[] => {
        const branch = branches[branchId];
        if (!branch) return [];

        return branch.stepIds.map((id) => steps[id]).filter(Boolean) as NormalizedStep[];
    }
);

/**
 * Получить все шаги сценария
 */
export const selectStepsByScenarioId = createSelector(
    [selectSteps, selectBranches, (_state: RootState, scenarioId: Guid) => scenarioId],
    (steps, branches, scenarioId): readonly NormalizedStep[] => {
        const scenarioBranches = Object.values(branches).filter(
            (branch) => branch && branch.scenarioId === scenarioId
        ) as NormalizedBranch[];

        const stepIds = scenarioBranches.flatMap((branch) => branch.stepIds);

        return stepIds.map((id) => steps[id]).filter(Boolean) as NormalizedStep[];
    }
);

/**
 * Получить первый шаг ветки (точка входа)
 */
export const selectFirstStepOfBranch = createSelector(
    [selectSteps, selectBranches, (_state: RootState, branchId: Guid) => branchId],
    (steps, branches, branchId): NormalizedStep | null => {
        const branch = branches[branchId];
        if (!branch || branch.stepIds.length === 0) return null;

        const firstStepId = branch.stepIds[0];
        if (!firstStepId) return null;

        const step = steps[firstStepId];
        return step ?? null;
    }
);

// ============================================================================
// RELATION SELECTORS
// ============================================================================

/**
 * Получить relation по ID
 */
export const selectRelationById = createSelector(
    [selectRelations, (_state: RootState, relationId: Guid) => relationId],
    (relations, relationId): StepRelationDto | null => {
        const relation = relations[relationId];
        return relation ?? null;
    }
);

/**
 * Получить исходящие relations шага (child)
 */
export const selectChildRelationsByStepId = createSelector(
    [selectRelations, selectSteps, (_state: RootState, stepId: Guid) => stepId],
    (relations, steps, stepId): readonly StepRelationDto[] => {
        const step = steps[stepId];
        if (!step) return [];

        return step.childRelationIds.map((id) => relations[id]).filter(Boolean) as StepRelationDto[];
    }
);

/**
 * Получить входящие relations шага (parent)
 */
export const selectParentRelationsByStepId = createSelector(
    [selectRelations, selectSteps, (_state: RootState, stepId: Guid) => stepId],
    (relations, steps, stepId): readonly StepRelationDto[] => {
        const step = steps[stepId];
        if (!step) return [];

        return step.parentRelationIds.map((id) => relations[id]).filter(Boolean) as StepRelationDto[];
    }
);

/**
 * Получить дочерние шаги (по исходящим relations)
 */
export const selectChildSteps = createSelector(
    [selectSteps, selectRelations, (_state: RootState, stepId: Guid) => stepId],
    (steps, relations, stepId): readonly NormalizedStep[] => {
        const step = steps[stepId];
        if (!step) return [];

        const childRelations = step.childRelationIds
            .map((id) => relations[id])
            .filter(Boolean) as StepRelationDto[];

        return childRelations.map((r) => steps[r.childStepId]).filter(Boolean) as NormalizedStep[];
    }
);

/**
 * Получить родительские шаги (по входящим relations)
 */
export const selectParentSteps = createSelector(
    [selectSteps, selectRelations, (_state: RootState, stepId: Guid) => stepId],
    (steps, relations, stepId): readonly NormalizedStep[] => {
        const step = steps[stepId];
        if (!step) return [];

        const parentRelations = step.parentRelationIds
            .map((id) => relations[id])
            .filter(Boolean) as StepRelationDto[];

        return parentRelations.map((r) => steps[r.parentStepId]).filter(Boolean) as NormalizedStep[];
    }
);

/**
 * Проверить, есть ли исходящие relations у шага
 */
export const selectHasChildRelations = createSelector(
    [selectSteps, (_state: RootState, stepId: Guid) => stepId],
    (steps, stepId): boolean => {
        const step = steps[stepId];
        return step ? step.childRelationIds.length > 0 : false;
    }
);

/**
 * Проверить, есть ли входящие relations у шага
 */
export const selectHasParentRelations = createSelector(
    [selectSteps, (_state: RootState, stepId: Guid) => stepId],
    (steps, stepId): boolean => {
        const step = steps[stepId];
        return step ? step.parentRelationIds.length > 0 : false;
    }
);

// ============================================================================
// GRAPH NAVIGATION
// ============================================================================

/**
 * Получить путь от начального шага до целевого (BFS)
 */
export const selectPathBetweenSteps = createSelector(
    [selectSteps, selectRelations, (_: RootState, fromId: Guid, toId: Guid) => ({ fromId, toId })],
    (steps, relations, { fromId, toId }): readonly Guid[] | null => {
        if (fromId === toId) return [fromId];

        const visited = new Set<Guid>();
        const queue: Array<{ stepId: Guid; path: Guid[] }> = [{ stepId: fromId, path: [fromId] }];

        while (queue.length > 0) {
            const current = queue.shift();
            if (!current) continue;

            const { stepId, path } = current;

            if (stepId === toId) {
                return path;
            }

            if (visited.has(stepId)) continue;
            visited.add(stepId);

            const step = steps[stepId];
            if (!step) continue;

            const childRelations = step.childRelationIds
                .map((id) => relations[id])
                .filter(Boolean) as StepRelationDto[];

            for (const relation of childRelations) {
                if (!visited.has(relation.childStepId)) {
                    queue.push({
                        stepId: relation.childStepId,
                        path: [...path, relation.childStepId],
                    });
                }
            }
        }

        return null; // Путь не найден
    }
);

/**
 * Получить все достижимые шаги от начального
 */
export const selectReachableSteps = createSelector(
    [selectSteps, selectRelations, (_state: RootState, startId: Guid) => startId],
    (steps, relations, startId): readonly Guid[] => {
        const visited = new Set<Guid>();
        const queue: Guid[] = [startId];

        while (queue.length > 0) {
            const stepId = queue.shift();
            if (!stepId || visited.has(stepId)) continue;

            visited.add(stepId);

            const step = steps[stepId];
            if (!step) continue;

            const childRelations = step.childRelationIds
                .map((id) => relations[id])
                .filter(Boolean) as StepRelationDto[];

            for (const relation of childRelations) {
                if (!visited.has(relation.childStepId)) {
                    queue.push(relation.childStepId);
                }
            }
        }

        return Array.from(visited);
    }
);


// ============================================================================
// UI/LIST SELECTORS (для LeftPanel и подобных компонентов)
// ============================================================================

/**
 * Список всех сценариев с метаинформацией (аналог старого selectScenariosEntries)
 * Возвращает массив в порядке ids
 */
export const selectScenarioEntries = createSelector(
    [selectScenarioIds, selectScenarios],
    (ids, scenarios): readonly ScenarioMeta[] => {
        return ids.map((id) => scenarios[id]).filter(Boolean) as ScenarioMeta[];
    }
);

/**
 * Список сценариев для отображения в списке (только активные/доступные)
 */
export const selectScenariosList = createSelector([selectScenarioEntries], (entries) => {
    return entries.filter((entry) => entry.loadState !== 'error');
});

/**
 * Проверка, загружается ли хотя бы один сценарий
 */
export const selectIsAnyScenarioLoading = createSelector([selectScenarioEntries], (entries) => {
    return entries.some((entry) => entry.loadState === 'loading');
});

/**
 * Получить ошибку загрузки списка (старое название для обратной совместимости)
 */
export const selectScenariosListError = selectErrorLoadList;

/**
 * Получить список entries (старое название для обратной совместимости)
 */
export const selectScenariosEntries = selectScenarioEntries;