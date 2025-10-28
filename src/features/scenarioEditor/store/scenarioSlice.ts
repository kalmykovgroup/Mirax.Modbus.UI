// src/features/scenarioEditor/store/scenarioSlice.ts

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';

import { scenarioApi } from '@/features/scenarioEditor/shared/api/scenarioApi';
import { extractErr } from '@app/lib/types/extractErr';
import type { Guid } from '@app/lib/types/Guid';
import { ScenarioLoadOptions } from '@scenario/shared/contracts/server/types/Api.Shared/RepositoryOptions/ScenarioLoadOptions';
import type { AppDispatch, RootState } from '@/baseStore/store';
import type { ScenarioDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Scenarios/ScenarioDto';
import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto';
import type { StepBaseDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import type { StepRelationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepRelations/StepRelationDto';
import { StepType } from '@scenario/shared/contracts/server/types/Api.Shared/StepType';
import { notify } from '@app/lib/notify.ts';
import storage from "redux-persist/lib/storage";

const DEFAULT_BRANCH_WIDTH = 800;
const DEFAULT_BRANCH_HEIGHT = 600;

const DEFAULT_STEP_WIDTH = 70;
const DEFAULT_STEP_HEIGHT = 21;

// @ts-ignore
export enum ScenarioLoadStatus {
    NotLoaded = 'NotLoaded',
    Loading = 'Loading',
    Loaded = 'Loaded',
    Error = 'Error',
}

// ============================================================================
// НОВАЯ СТРУКТУРА: каждый сценарий изолирован
// ============================================================================

export interface ScenarioState {
     scenario: ScenarioDto;
    readonly branches: Record<Guid, BranchDto>;
    readonly steps: Record<Guid, StepBaseDto>;
    readonly relations: Record<Guid, StepRelationDto>;
     status: ScenarioLoadStatus;
     error?: string | undefined;
}

export interface ScenariosState {
    readonly scenarios: Record<Guid, ScenarioState>;
    readonly activeScenarioId: Guid | null;
}

const initialState: ScenariosState = {
    scenarios: {},
    activeScenarioId: null,
};

function normalizeScenario(scenario: ScenarioDto): {
    branches: readonly BranchDto[];
    steps: readonly StepBaseDto[];
    relations: readonly StepRelationDto[];
} {
    const branches: BranchDto[] = [];
    const steps: StepBaseDto[] = [];
    const relationsMap = new Map<Guid, StepRelationDto>();

    function processBranch(branch: BranchDto, scenarioId: Guid): void {
        const normalizedBranch: BranchDto = {
            ...branch,
            scenarioId,
            width: branch.width > 0 ? branch.width : DEFAULT_BRANCH_WIDTH,
            height: branch.height > 0 ? branch.height : DEFAULT_BRANCH_HEIGHT,
        };

        branches.push(normalizedBranch);

        for (const step of branch.steps) {
            const normalizedStep: StepBaseDto = {
                ...step,
                width: step.width > 0 ? step.width : DEFAULT_STEP_WIDTH,
                height: step.height > 0 ? step.height : DEFAULT_STEP_HEIGHT,
            };

            steps.push(normalizedStep);

            for (const rel of step.childRelations) {
                relationsMap.set(rel.id, rel);
            }

            if (step.type === StepType.Parallel || step.type === StepType.Condition) {
                const branchRels = (step as any).stepBranchRelations as
                    | readonly { branch?: BranchDto | undefined }[]
                    | undefined;

                if (branchRels != null) {
                    for (const sbr of branchRels) {
                        if (sbr.branch != null) {
                            processBranch(sbr.branch, scenarioId);
                        }
                    }
                }
            }
        }
    }

    processBranch(scenario.branch, scenario.id);

    return {
        branches,
        steps,
        relations: Array.from(relationsMap.values()),
    };
}

export const refreshScenariosList =
    (forceRefetch = true) =>
        async (dispatch: AppDispatch): Promise<ScenarioDto[]> => {
            try {
                // Если принудительное обновление - инвалидируем кеш перед запросом
                if (forceRefetch) {
                    dispatch(scenarioApi.util.invalidateTags([{ type: 'ScenarioList', id: 'ALL' }]));
                }

                const subscription = dispatch(
                    scenarioApi.endpoints.getAllScenarios.initiate(undefined, {
                        forceRefetch,
                        subscribe: false,
                    })
                );

                const list = (await notify.run(
                    subscription.unwrap(),
                    {
                        loading: { text: 'Загрузка сценариев' },
                        success: {
                            text: 'Сценарии успешно загружены',
                            toastOptions: { duration: 700 },
                        },
                        error: {
                            toastOptions: { duration: 3000 },
                        },
                    },
                    { id: 'fetch-scenario-list' }
                )) as ScenarioDto[];

                dispatch(scenariosSlice.actions.setScenariosList(list ?? []));
                return list ?? [];
            } catch (e) {
                const msg = extractErr(e);
                throw new Error(msg);
            }
        };

export const refreshScenarioById =
    (id: Guid, forceRefetch = false) =>
        async (dispatch: AppDispatch, getState: () => RootState): Promise<ScenarioDto | undefined> => {
            try {
                const state = getState();
                const scenarioState = state.scenario.scenarios[id];

                // 🔍 ДИАГНОСТИКА: Логируем состояние перед загрузкой
                if (forceRefetch && scenarioState) {
                    console.warn('[refreshScenarioById] 🔄 Force refetching scenario:', id);
                    console.warn('  - Current relations count:', Object.keys(scenarioState.relations).length);
                    console.warn('  - Current relations:', Object.keys(scenarioState.relations));
                }

                // Если не форсируем и статус Loaded, возвращаем из стейта
                if (!forceRefetch && scenarioState?.status === ScenarioLoadStatus.Loaded) {
                    return scenarioState.scenario;
                }

                // Устанавливаем статус загрузки
                dispatch(scenariosSlice.actions.setScenarioStatus({ id, status: ScenarioLoadStatus.Loading }));

                const subscription = dispatch(
                    scenarioApi.endpoints.getScenarioById.initiate(
                        {
                            id,
                            query: { scenarioLoadOption: ScenarioLoadOptions.LoadRecursiveSteps },
                        },
                        { forceRefetch: true, subscribe: false }
                    )
                );

                const dto = (await notify.run(
                    subscription.unwrap(),
                    {
                        loading: { text: 'Загрузка деталей сценария' },
                        success: {
                            text: 'Загрузка деталей сценария успешна',
                            toastOptions: { duration: 700 },
                        },
                        error: {
                            toastOptions: { duration: 3000 },
                        },
                    },
                    { id: 'fetch-scenario-one' }
                )) as ScenarioDto;

                // 🔍 ДИАГНОСТИКА: Логируем данные от сервера
                if (dto != null && forceRefetch) {
                    const normalized = normalizeScenario(dto);
                    console.warn('[refreshScenarioById] 📥 Received from server:');
                    console.warn('  - Relations count:', normalized.relations.length);
                    console.warn('  - Relations:', normalized.relations.map(r => r.id));
                }

                if (dto != null) {
                    dispatch(scenariosSlice.actions.upsertScenarioFull(dto));
                    dispatch(scenariosSlice.actions.setScenarioStatus({ id, status: ScenarioLoadStatus.Loaded }));
                }
                return dto;
            } catch (e) {
                const msg = extractErr(e);
                dispatch(
                    scenariosSlice.actions.setScenarioError({
                        id,
                        status: ScenarioLoadStatus.Error,
                        error: msg,
                    })
                );
                throw new Error(msg);
            }
        };

const scenariosSlice = createSlice({
    name: 'scenario',
    initialState,
    reducers: {
        setActiveScenarioId(state, action: PayloadAction<Guid | null>) {
            state.activeScenarioId = action.payload;
        },

        setScenariosList(state, action: PayloadAction<ScenarioDto[]>) {
            // Очищаем все кроме уже загруженных сценариев
            const loadedIds = new Set<Guid>();
            for (const scenarioId in state.scenarios) {
                if (state.scenarios[scenarioId]?.status === ScenarioLoadStatus.Loaded) {
                    loadedIds.add(scenarioId);
                }
            }

            // Сохраняем только загруженные сценарии
            const newScenarios: Record<Guid, ScenarioState> = {};
            for (const id of loadedIds) {
                const existing = state.scenarios[id];
                if (existing) {
                    newScenarios[id] = existing;
                }
            }

            // Добавляем новые сценарии со статусом NotLoaded
            for (const s of action.payload) {
                const existing: ScenarioState | undefined = newScenarios[s.id];
                if (!existing) {
                    newScenarios[s.id] = {
                        scenario: s,
                        branches: {},
                        steps: {},
                        relations: {},
                        status: ScenarioLoadStatus.NotLoaded,
                    };
                } else {
                    // Обновляем только scenario DTO, но не затрагиваем загруженные данные
                    existing.scenario = s;
                }
            }

            state.scenarios = newScenarios;
        },

        setScenarioStatus(state, action: PayloadAction<{ id: Guid; status: ScenarioLoadStatus }>) {
            const { id, status } = action.payload;
            const scenarioState = state.scenarios[id];

            if (scenarioState) {
                scenarioState.status = status;
                if (status !== ScenarioLoadStatus.Error) {
                    delete scenarioState.error;
                }
            }
        },

        setScenarioError(
            state,
            action: PayloadAction<{ id: Guid; status: ScenarioLoadStatus.Error; error: string }>
        ) {
            const { id, status, error } = action.payload;
            const scenarioState = state.scenarios[id];

            if (scenarioState) {
                scenarioState.status = status;
                scenarioState.error = error;
            }
        },

        upsertScenarioFull(state, action: PayloadAction<ScenarioDto>) {
            const dto = action.payload;
            const normalized = normalizeScenario(dto);

            const branches: Record<Guid, BranchDto> = {};
            for (const b of normalized.branches) {
                branches[b.id] = b;
            }

            const steps: Record<Guid, StepBaseDto> = {};
            for (const s of normalized.steps) {
                steps[s.id] = s;
            }

            const relations: Record<Guid, StepRelationDto> = {};
            for (const r of normalized.relations) {
                relations[r.id] = r;
            }

            const existing = state.scenarios[dto.id];

            // 🔍 ДИАГНОСТИКА: Логируем изменения в relations
            if (existing) {
                const oldRelationIds = Object.keys(existing.relations);
                const newRelationIds = Object.keys(relations);

                const deletedRelations = oldRelationIds.filter(id => !newRelationIds.includes(id));
                const addedRelations = newRelationIds.filter(id => !oldRelationIds.includes(id));

                if (deletedRelations.length > 0 || addedRelations.length > 0) {
                    console.warn('[upsertScenarioFull] 🔄 Relations changed from server:');
                    console.warn('  - Deleted:', deletedRelations);
                    console.warn('  - Added:', addedRelations);
                    console.warn('  - Old count:', oldRelationIds.length);
                    console.warn('  - New count:', newRelationIds.length);
                }
            }

            const newState: ScenarioState = {
                scenario: dto,
                branches,
                steps,
                relations,
                status: existing?.status ?? ScenarioLoadStatus.Loaded,
            };

            if (existing?.error) {
                (newState as any).error = existing.error;
            }

            state.scenarios[dto.id] = newState;
        },

        clearScenarios(state) {
            state.scenarios = {};
            state.activeScenarioId = null;
        },

        // ============================================================================
        // STEP MUTATIONS
        // ============================================================================

        addStep(state, action: PayloadAction<{ scenarioId: Guid; branchId: Guid; step: StepBaseDto }>) {
            const { scenarioId, branchId, step } = action.payload;
            const scenarioState = state.scenarios[scenarioId];

            if (!scenarioState) {
                console.error(`[scenarioSlice] Scenario ${scenarioId} not found`);
                return;
            }

            // Добавляем step в словарь
            scenarioState.steps[step.id] = step;

            // Обновляем branch
            const branch = scenarioState.branches[branchId];
            if (branch) {
                scenarioState.branches[branchId] = {
                    ...branch,
                    steps: [...branch.steps, step],
                };
            }
        },

        updateStep(state, action: PayloadAction<{ scenarioId: Guid; stepId: Guid; changes: Partial<StepBaseDto> }>) {
            const { scenarioId, stepId, changes } = action.payload;
            const scenarioState = state.scenarios[scenarioId];

            if (!scenarioState) {
                console.error(`[scenarioSlice] Scenario ${scenarioId} not found`);
                return;
            }

            const step = scenarioState.steps[stepId];
            if (!step) {
                console.error(`[scenarioSlice] Step ${stepId} not found in scenario ${scenarioId}`);
                return;
            }

            // Обновляем step
            scenarioState.steps[stepId] = { ...step, ...changes };

            // Обновляем step в branch
            const branch = scenarioState.branches[step.branchId];
            if (branch) {
                scenarioState.branches[step.branchId] = {
                    ...branch,
                    steps: branch.steps.map((s) => (s.id === stepId ? scenarioState.steps[stepId] : s)) as StepBaseDto[],
                };
            }
        },

        deleteStep(state, action: PayloadAction<{ scenarioId: Guid; branchId: Guid; stepId: Guid }>) {
            const { scenarioId, branchId, stepId } = action.payload;
            const scenarioState = state.scenarios[scenarioId];

            if (!scenarioState) {
                console.error(`[scenarioSlice] Scenario ${scenarioId} not found`);
                return;
            }

            // Удаляем step
            delete scenarioState.steps[stepId];

            // Удаляем step из branch
            const branch = scenarioState.branches[branchId];
            if (branch) {
                scenarioState.branches[branchId] = {
                    ...branch,
                    steps: branch.steps.filter((s) => s.id !== stepId),
                };
            }

            // Удаляем все связи с этим степом
            for (const relId in scenarioState.relations) {
                const rel = scenarioState.relations[relId];
                if (rel != undefined && (rel.parentStepId === stepId || rel.childStepId === stepId)) {
                    delete scenarioState.relations[relId];
                }
            }
        },

        // ============================================================================
        // BRANCH MUTATIONS
        // ============================================================================

        addBranch(
            state,
            action: PayloadAction<{ scenarioId: Guid; branch: BranchDto; parentStepId: Guid | null }>
        ) {
            const { scenarioId, branch } = action.payload;
            const scenarioState = state.scenarios[scenarioId];

            if (!scenarioState) {
                console.error(`[scenarioSlice] Scenario ${scenarioId} not found`);
                return;
            }

            scenarioState.branches[branch.id] = branch;
        },

        updateBranch(state, action: PayloadAction<{ scenarioId: Guid; branchId: Guid; changes: Partial<BranchDto> }>) {
            const { scenarioId, branchId, changes } = action.payload;
            const scenarioState = state.scenarios[scenarioId];

            if (!scenarioState) {
                console.error(`[scenarioSlice] Scenario ${scenarioId} not found`);
                return;
            }

            const branch = scenarioState.branches[branchId];
            if (branch) {
                scenarioState.branches[branchId] = { ...branch, ...changes };
            }
        },

        deleteBranch(state, action: PayloadAction<{ scenarioId: Guid; branchId: Guid }>) {
            const { scenarioId, branchId } = action.payload;
            const scenarioState = state.scenarios[scenarioId];

            if (!scenarioState) {
                console.error(`[scenarioSlice] Scenario ${scenarioId} not found`);
                return;
            }

            const branch = scenarioState.branches[branchId];
            if (branch) {
                // Удаляем все степы ветки
                for (const step of branch.steps) {
                    delete scenarioState.steps[step.id];
                }

                delete scenarioState.branches[branchId];
            }
        },

        // ============================================================================
        // RELATION MUTATIONS
        // ============================================================================

        addRelation(state, action: PayloadAction<{ scenarioId: Guid; relation: StepRelationDto }>) {
            const { scenarioId, relation } = action.payload;
            const scenarioState = state.scenarios[scenarioId];

            if (!scenarioState) {
                console.error(`[scenarioSlice] Scenario ${scenarioId} not found`);
                return;
            }

            scenarioState.relations[relation.id] = relation;

            // Обновляем childRelations у родительского степа
            const parentStep = scenarioState.steps[relation.parentStepId];
            if (parentStep) {
                scenarioState.steps[relation.parentStepId] = {
                    ...parentStep,
                    childRelations: [...parentStep.childRelations, relation],
                };
            }

            // Обновляем parentRelations у дочернего степа
            const childStep = scenarioState.steps[relation.childStepId];
            if (childStep) {
                scenarioState.steps[relation.childStepId] = {
                    ...childStep,
                    parentRelations: [...childStep.parentRelations, relation],
                };
            }
        },

        updateRelation(
            state,
            action: PayloadAction<{ scenarioId: Guid; relationId: Guid; changes: Partial<StepRelationDto> }>
        ) {
            const { scenarioId, relationId, changes } = action.payload;
            const scenarioState = state.scenarios[scenarioId];

            if (!scenarioState) {
                console.error(`[scenarioSlice] Scenario ${scenarioId} not found`);
                return;
            }

            const relation = scenarioState.relations[relationId];
            if (relation) {
                scenarioState.relations[relationId] = { ...relation, ...changes };
            }
        },

        deleteRelation(state, action: PayloadAction<{ scenarioId: Guid; relationId: Guid }>) {
            const { scenarioId, relationId } = action.payload;
            const scenarioState = state.scenarios[scenarioId];

            if (!scenarioState) {
                console.error(`[scenarioSlice] Scenario ${scenarioId} not found`);
                return;
            }

            const relation = scenarioState.relations[relationId];
            if (relation) {
                delete scenarioState.relations[relationId];

                // Удаляем из childRelations родительского степа
                const parentStep = scenarioState.steps[relation.parentStepId];
                if (parentStep) {
                    scenarioState.steps[relation.parentStepId] = {
                        ...parentStep,
                        childRelations: parentStep.childRelations.filter((r) => r.id !== relationId),
                    };
                }

                // Удаляем из parentRelations дочернего степа
                const childStep = scenarioState.steps[relation.childStepId];
                if (childStep) {
                    scenarioState.steps[relation.childStepId] = {
                        ...childStep,
                        parentRelations: childStep.parentRelations.filter((r) => r.id !== relationId),
                    };
                }
            }
        },
    },
});

export const {
    setActiveScenarioId,
    setScenariosList,
    setScenarioStatus,
    setScenarioError,
    upsertScenarioFull,
    clearScenarios,
    addStep,
    updateStep,
    deleteStep,
    addBranch,
    updateBranch,
    deleteBranch,
    addRelation,
    updateRelation,
    deleteRelation,
} = scenariosSlice.actions;



const scenarioPersistConfig = {
    key: 'scenario',
    storage,
    version: 1,
    migrate: async (state: any) => {
        // Миграция со старой структуры на новую
        if (state && state._persist) {
            // Проверяем, старая ли это структура (branches/steps/relations на верхнем уровне)
            if (state.branches !== undefined || state.steps !== undefined || state.relations !== undefined) {
                console.log('[scenarioSlice] Migrating from old state structure to new isolated structure');

                // Создаем новую структуру
                const newScenarios: Record<Guid, ScenarioState> = {};

                // Если есть старые scenarios, конвертируем их
                if (state.scenarios) {
                    for (const [scenarioId, scenarioDto] of Object.entries(state.scenarios as Record<Guid, any>)) {
                        if (scenarioDto && typeof scenarioDto === 'object') {
                            // Собираем ветки, степы и связи для этого сценария
                            const scenarioBranches: Record<Guid, BranchDto> = {};
                            const scenarioSteps: Record<Guid, StepBaseDto> = {};
                            const scenarioRelations: Record<Guid, StepRelationDto> = {};

                            // Фильтруем данные по scenarioId (если есть в старых данных)
                            // Это не идеально, но лучше потерять данные чем упасть

                            const newScenarioState: ScenarioState = {
                                scenario: scenarioDto,
                                branches: scenarioBranches,
                                steps: scenarioSteps,
                                relations: scenarioRelations,
                                status: state.scenarioStatuses?.[scenarioId] ?? ScenarioLoadStatus.NotLoaded,
                            };

                            const errorMsg = state.scenarioErrors?.[scenarioId];
                            if (errorMsg) {
                                (newScenarioState as any).error = errorMsg;
                            }

                            newScenarios[scenarioId] = newScenarioState;
                        }
                    }
                }

                return Promise.resolve({
                    scenarios: newScenarios,
                    activeScenarioId: state.activeScenarioId ?? null,
                    _persist: state._persist,
                });
            }
        }

        return Promise.resolve(state);
    },
};

export const scenarioReducer = persistReducer(scenarioPersistConfig, scenariosSlice.reducer);

// ============================================================================
// HELPER FUNCTIONS для контрактов
// ============================================================================

/**
 * Находит scenarioId по stepId
 * Используется в контрактах степов для dispatch
 */
export function findScenarioIdByStepId(state: ScenariosState, stepId: Guid): Guid | null {
    for (const [scenarioId, scenarioState] of Object.entries(state.scenarios)) {
        if (scenarioState.steps[stepId]) {
            return scenarioId;
        }
    }
    return null;
}

/**
 * Находит scenarioId по branchId
 * Используется в контрактах веток для dispatch
 */
export function findScenarioIdByBranchId(state: ScenariosState, branchId: Guid): Guid | null {
    for (const [scenarioId, scenarioState] of Object.entries(state.scenarios)) {
        if (scenarioState.branches[branchId]) {
            return scenarioId;
        }
    }
    return null;
}

/**
 * Находит scenarioId по relationId
 * Используется в контрактах связей для dispatch
 */
export function findScenarioIdByRelationId(state: ScenariosState, relationId: Guid): Guid | null {
    for (const [scenarioId, scenarioState] of Object.entries(state.scenarios)) {
        if (scenarioState.relations[relationId]) {
            return scenarioId;
        }
    }
    return null;
}