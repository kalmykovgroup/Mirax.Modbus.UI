// src/features/scenario/scenarioSlice.ts

import {
    createSlice,
    createEntityAdapter,
    type PayloadAction,
    type EntityState,
} from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import sessionStorage from 'redux-persist/lib/storage/session';

import { scenarioApi } from '@/features/scenarioEditor/shared/api/scenarioApi.ts';
import { extractErr } from '@app/lib/types/extractErr.ts';
import type { Guid } from '@app/lib/types/Guid.ts';
import { ScenarioLoadOptions } from '@scenario/shared/contracts/server/types/Api.Shared/RepositoryOptions/ScenarioLoadOptions.ts';
import type { AppDispatch, RootState } from '@/baseStore/store.ts';
import type { ScenarioDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Scenarios/ScenarioDto.ts';
import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto.ts';
import type { AnyStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts';
import type { StepRelationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepRelations/StepRelationDto.ts';

import { normalizeScenario } from './scenarioNormalization';

// ============================================================================
// ENUMS & TYPES
// ============================================================================

export enum ScenarioLoadState {
    None = 'none',
    Loading = 'loading',
    Full = 'full',
    Error = 'error',
}

/**
 * Метаинформация о сценарии (без вложенных данных)
 */
export interface ScenarioMeta {
    readonly id: Guid;
    readonly name: string;
    readonly description?: string | null;
    readonly status: string;
    readonly version: number;
    readonly mainBranchId: Guid; // Ссылка на главную ветку
    readonly loadState: ScenarioLoadState;
    readonly lastFetchedAt?: number | null;
    readonly error?: string | null;
}

/**
 * Нормализованная ветка с метаинформацией о связях
 */
export interface NormalizedBranch extends Omit<BranchDto, 'steps'> {
    readonly scenarioId: Guid;
    readonly stepIds: readonly Guid[]; // Порядок важен!
    readonly parentStepId?: Guid | null; // Для вложенных веток (parallel/condition)
}

/**
 * Нормализованный шаг (без вложенных массивов)
 */
export interface NormalizedStep extends Omit<AnyStepDto, 'childRelations' | 'parentRelations'> {
    readonly branchId: Guid;
    readonly childRelationIds: readonly Guid[];
    readonly parentRelationIds: readonly Guid[];
}

// ============================================================================
// ENTITY ADAPTERS
// ============================================================================

const scenariosAdapter = createEntityAdapter<ScenarioMeta>({
    selectId: (scenario) => scenario.id,
});

const branchesAdapter = createEntityAdapter<NormalizedBranch>({
    selectId: (branch) => branch.id,
});

const stepsAdapter = createEntityAdapter<NormalizedStep>({
    selectId: (step) => step.id,
});

const relationsAdapter = createEntityAdapter<StepRelationDto>({
    selectId: (relation) => relation.id,
});

// ============================================================================
// STATE
// ============================================================================

export interface ScenarioState {
    readonly scenarios: EntityState<ScenarioMeta, Guid>;
    readonly branches: EntityState<NormalizedBranch, Guid>;
    readonly steps: EntityState<NormalizedStep, Guid>;
    readonly relations: EntityState<StepRelationDto, Guid>;
    readonly activeScenarioId: Guid | null;
    readonly errorLoadList?: string | null;
    readonly lastFetchedAt: number | null;
}

const initialState: ScenarioState = {
    scenarios: scenariosAdapter.getInitialState(),
    branches: branchesAdapter.getInitialState(),
    steps: stepsAdapter.getInitialState(),
    relations: relationsAdapter.getInitialState(),
    activeScenarioId: null,
    errorLoadList: null,
    lastFetchedAt: null,
};

// ============================================================================
// THUNKS
// ============================================================================

export const refreshScenariosList =
    (forceRefetch = true) =>
        async (dispatch: AppDispatch) => {
            try {
                const list = await dispatch(
                    scenarioApi.endpoints.getAllScenarios.initiate(undefined, {
                        forceRefetch,
                        subscribe: false,
                    })
                ).unwrap();

                dispatch(scenariosSlice.actions.replaceScenariosList(list ?? []));
                return list ?? [];
            } catch (e) {
                const msg = extractErr(e);
                dispatch(scenariosSlice.actions.setErrorLoadList(msg));
                throw new Error(msg);
            }
        };

export const refreshScenarioById =
    (id: Guid, forceRefetch = false) =>
        async (dispatch: AppDispatch, getState: () => RootState) => {
            try {
                if (!forceRefetch) {
                    const scenario = getState().scenario.scenarios.entities[id];
                    if (scenario && scenario.loadState === ScenarioLoadState.Full) {
                        return scenario;
                    }
                }

                dispatch(scenariosSlice.actions.markScenarioLoading(id));

                const arg = {
                    id,
                    query: { scenarioLoadOption: ScenarioLoadOptions.LoadRecursiveSteps },
                } as const;

                const dto = await dispatch(
                    scenarioApi.endpoints.getScenarioById.initiate(arg, {
                        forceRefetch: true,
                        subscribe: false,
                    })
                ).unwrap();

                if (dto) {
                    dispatch(scenariosSlice.actions.upsertScenarioFull(dto));
                }
                return dto;
            } catch (e) {
                const msg = extractErr(e);
                dispatch(scenariosSlice.actions.setErrorLoadList(msg));
                dispatch(scenariosSlice.actions.setScenarioError({ id, error: msg }));
                throw new Error(msg);
            }
        };

// ============================================================================
// SLICE
// ============================================================================

const scenariosSlice = createSlice({
    name: 'scenario',
    initialState,
    reducers: {
        // ───────────────────────────────────────────────────────────────────
        // SCENARIO ACTIONS
        // ───────────────────────────────────────────────────────────────────

        setActiveScenarioId(state, action: PayloadAction<Guid | null>) {
            state.activeScenarioId = action.payload;
        },

        setErrorLoadList(state, action: PayloadAction<string | null>) {
            state.errorLoadList = action.payload;
        },

        markScenarioLoading(state, action: PayloadAction<Guid>) {
            const id = action.payload;
            const scenario = state.scenarios.entities[id];
            if (scenario) {
                scenariosAdapter.updateOne(state.scenarios, {
                    id,
                    changes: {
                        loadState: ScenarioLoadState.Loading,
                        error: null,
                    },
                });
            }
        },

        setScenarioError(state, action: PayloadAction<{ id: Guid; error: string }>) {
            const { id, error } = action.payload;
            const scenario = state.scenarios.entities[id];
            if (scenario) {
                scenariosAdapter.updateOne(state.scenarios, {
                    id,
                    changes: {
                        loadState: ScenarioLoadState.Error,
                        error,
                    },
                });
            }
        },

        /**
         * Заменить список сценариев (shallow, без деталей)
         */
        replaceScenariosList(state, action: PayloadAction<ScenarioDto[]>) {
            const now = Date.now();
            const list = action.payload ?? [];

            const metas: ScenarioMeta[] = list.map((s) => ({
                id: s.id,
                name: s.name,
                description: s.description ?? null,
                status: s.status,
                version: s.version,
                mainBranchId: s.branch.id,
                loadState: ScenarioLoadState.None,
                lastFetchedAt: now,
                error: null,
            }));

            scenariosAdapter.setAll(state.scenarios, metas);
            state.lastFetchedAt = now;
        },

        /**
         * Upsert полного сценария с нормализацией
         */
        upsertScenarioFull(state, action: PayloadAction<ScenarioDto>) {
            const dto = action.payload;
            const now = Date.now();

            // Нормализуем вложенную структуру
            const normalized = normalizeScenario(dto);

            // Обновляем все срезы
            scenariosAdapter.upsertOne(state.scenarios, {
                id: dto.id,
                name: dto.name,
                description: dto.description ?? null,
                status: dto.status,
                version: dto.version,
                mainBranchId: dto.branch.id,
                loadState: ScenarioLoadState.Full,
                lastFetchedAt: now,
                error: null,
            });

            branchesAdapter.upsertMany(state.branches, normalized.branches);
            stepsAdapter.upsertMany(state.steps, normalized.steps);
            relationsAdapter.upsertMany(state.relations, normalized.relations);
        },

        clearScenarios(state) {
            scenariosAdapter.removeAll(state.scenarios);
            branchesAdapter.removeAll(state.branches);
            stepsAdapter.removeAll(state.steps);
            relationsAdapter.removeAll(state.relations);
            state.activeScenarioId = null;
            state.errorLoadList = null;
            state.lastFetchedAt = null;
        },

        removeScenarioLocal(state, action: PayloadAction<Guid>) {
            const id = action.payload;

            // Удаляем связанные данные
            const scenario = state.scenarios.entities[id];
            if (scenario) {
                const mainBranch = state.branches.entities[scenario.mainBranchId];
                if (mainBranch) {
                    // Удаляем все ветки сценария
                    const branchIds = Object.values(state.branches.entities)
                        .filter((b) => b && b.scenarioId === id)
                        .map((b) => b!.id);

                    branchesAdapter.removeMany(state.branches, branchIds);

                    // Удаляем все шаги из этих веток
                    const stepIds = Object.values(state.steps.entities)
                        .filter((s) => s && branchIds.includes(s.branchId))
                        .map((s) => s!.id);

                    stepsAdapter.removeMany(state.steps, stepIds);

                    // Удаляем relations этих шагов
                    const relationIds = Object.values(state.relations.entities)
                        .filter((r) => r && (stepIds.includes(r.parentStepId) || stepIds.includes(r.childStepId)))
                        .map((r) => r!.id);

                    relationsAdapter.removeMany(state.relations, relationIds);
                }

                scenariosAdapter.removeOne(state.scenarios, id);
            }

            if (state.activeScenarioId === id) {
                state.activeScenarioId = null;
            }
        },

        // ───────────────────────────────────────────────────────────────────
        // BRANCH ACTIONS
        // ───────────────────────────────────────────────────────────────────

        addBranch(
            state,
            action: PayloadAction<{ scenarioId: Guid; branch: BranchDto; parentStepId?: Guid | null }>
        ) {
            const { scenarioId, branch, parentStepId } = action.payload;

            const normalized: NormalizedBranch = {
                ...branch,
                scenarioId,
                stepIds: branch.steps.map((s) => s.id),
                parentStepId: parentStepId ?? null,
            };

            branchesAdapter.addOne(state.branches, normalized);

            // Добавляем шаги
            for (const step of branch.steps) {
                const normalizedStep: NormalizedStep = {
                    ...step,
                    branchId: branch.id,
                    childRelationIds: step.childRelations.map((r) => r.id),
                    parentRelationIds: step.parentRelations.map((r) => r.id),
                };
                stepsAdapter.addOne(state.steps, normalizedStep);

                // Добавляем relations
                relationsAdapter.addMany(state.relations, [
                    ...step.childRelations,
                    ...step.parentRelations,
                ]);
            }
        },

        updateBranch(state, action: PayloadAction<{ branchId: Guid; changes: Partial<BranchDto> }>) {
            const { branchId, changes } = action.payload;
            branchesAdapter.updateOne(state.branches, { id: branchId, changes });
        },

        deleteBranch(state, action: PayloadAction<{ branchId: Guid }>) {
            const { branchId } = action.payload;
            const branch = state.branches.entities[branchId];

            if (branch) {
                // Удаляем все шаги ветки
                stepsAdapter.removeMany(state.steps, branch.stepIds as Guid[]);

                // Удаляем relations этих шагов
                const relationIds = Object.values(state.relations.entities)
                    .filter(
                        (r) =>
                            r &&
                            (branch.stepIds.includes(r.parentStepId) || branch.stepIds.includes(r.childStepId))
                    )
                    .map((r) => r!.id);

                relationsAdapter.removeMany(state.relations, relationIds);

                branchesAdapter.removeOne(state.branches, branchId);
            }
        },

        // ───────────────────────────────────────────────────────────────────
        // STEP ACTIONS
        // ───────────────────────────────────────────────────────────────────

        addStep(state, action: PayloadAction<{ branchId: Guid; step: AnyStepDto }>) {
            const { branchId, step } = action.payload;

            const normalizedStep: NormalizedStep = {
                ...step,
                branchId,
                childRelationIds: step.childRelations.map((r) => r.id),
                parentRelationIds: step.parentRelations.map((r) => r.id),
            };

            stepsAdapter.addOne(state.steps, normalizedStep);

            // Обновляем список stepIds в ветке
            const branch = state.branches.entities[branchId];
            if (branch) {
                branchesAdapter.updateOne(state.branches, {
                    id: branchId,
                    changes: {
                        stepIds: [...branch.stepIds, step.id],
                    },
                });
            }

            // Добавляем relations
            relationsAdapter.addMany(state.relations, [
                ...step.childRelations,
                ...step.parentRelations,
            ]);
        },

        updateStep: (
            state,
            action: PayloadAction<{ stepId: Guid; changes: Partial<NormalizedStep> }>
        ) => {
            const { stepId, changes } = action.payload;
            const step = state.steps.entities[stepId];

            if (step) {
                Object.assign(step, changes);
            }
        },

        deleteStep(state, action: PayloadAction<{ branchId: Guid; stepId: Guid }>) {
            const { branchId, stepId } = action.payload;
            const step = state.steps.entities[stepId];

            if (step) {
                // Удаляем relations
                relationsAdapter.removeMany(state.relations, [
                    ...step.childRelationIds,
                    ...step.parentRelationIds,
                ] as Guid[]);

                stepsAdapter.removeOne(state.steps, stepId);

                // Обновляем stepIds в ветке
                const branch = state.branches.entities[branchId];
                if (branch) {
                    branchesAdapter.updateOne(state.branches, {
                        id: branchId,
                        changes: {
                            stepIds: branch.stepIds.filter((id) => id !== stepId),
                        },
                    });
                }
            }
        },

        // ───────────────────────────────────────────────────────────────────
        // RELATION ACTIONS
        // ───────────────────────────────────────────────────────────────────

        addRelation(state, action: PayloadAction<StepRelationDto>) {
            const relation = action.payload;
            relationsAdapter.addOne(state.relations, relation);

            // Обновляем childRelationIds/parentRelationIds в шагах
            const parentStep = state.steps.entities[relation.parentStepId];
            const childStep = state.steps.entities[relation.childStepId];

            if (parentStep) {
                stepsAdapter.updateOne(state.steps, {
                    id: relation.parentStepId,
                    changes: {
                        childRelationIds: [...parentStep.childRelationIds, relation.id],
                    },
                });
            }

            if (childStep) {
                stepsAdapter.updateOne(state.steps, {
                    id: relation.childStepId,
                    changes: {
                        parentRelationIds: [...childStep.parentRelationIds, relation.id],
                    },
                });
            }
        },

        updateRelation(
            state,
            action: PayloadAction<{ relationId: Guid; changes: Partial<StepRelationDto> }>
        ) {
            const { relationId, changes } = action.payload;
            relationsAdapter.updateOne(state.relations, { id: relationId, changes });
        },

        deleteRelation(state, action: PayloadAction<Guid>) {
            const relationId = action.payload;
            const relation = state.relations.entities[relationId];

            if (relation) {
                // Убираем из childRelationIds/parentRelationIds
                const parentStep = state.steps.entities[relation.parentStepId];
                const childStep = state.steps.entities[relation.childStepId];

                if (parentStep) {
                    stepsAdapter.updateOne(state.steps, {
                        id: relation.parentStepId,
                        changes: {
                            childRelationIds: parentStep.childRelationIds.filter((id) => id !== relationId),
                        },
                    });
                }

                if (childStep) {
                    stepsAdapter.updateOne(state.steps, {
                        id: relation.childStepId,
                        changes: {
                            parentRelationIds: childStep.parentRelationIds.filter((id) => id !== relationId),
                        },
                    });
                }

                relationsAdapter.removeOne(state.relations, relationId);
            }
        },
    },
    extraReducers: () => {},
});

// ============================================================================
// EXPORTS
// ============================================================================

export const {
    setActiveScenarioId,
    setErrorLoadList,
    markScenarioLoading,
    setScenarioError,
    replaceScenariosList,
    upsertScenarioFull,
    clearScenarios,
    removeScenarioLocal,
    addBranch,
    updateBranch,
    deleteBranch,
    addStep,
    updateStep,
    deleteStep,
    addRelation,
    updateRelation,
    deleteRelation,
} = scenariosSlice.actions;

// ============================================================================
// PERSIST CONFIG
// ============================================================================

const scenarioPersistConfig = {
    key: 'scenario',
    storage: sessionStorage,
    whitelist: [], // Не персистим, т.к. большой объем данных
};

export const scenarioReducer = persistReducer(scenarioPersistConfig, scenariosSlice.reducer);