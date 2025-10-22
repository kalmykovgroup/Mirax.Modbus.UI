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

export interface ScenarioState {
    readonly scenarios: Record<Guid, ScenarioDto>;
    readonly branches: Record<Guid, BranchDto>;
    readonly steps: Record<Guid, StepBaseDto>;
    readonly relations: Record<Guid, StepRelationDto>;
    readonly activeScenarioId: Guid | null;
    readonly scenarioStatuses: Record<Guid, ScenarioLoadStatus>;
    readonly scenarioErrors: Record<Guid, string>;
}

const initialState: ScenarioState = {
    scenarios: {},
    branches: {},
    steps: {},
    relations: {},
    activeScenarioId: null,
    scenarioStatuses: {},
    scenarioErrors: {},
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
                const currentStatus = state.scenario.scenarioStatuses[id];

                // Если не форсируем и статус Loaded, возвращаем из стейта
                if (!forceRefetch && currentStatus === ScenarioLoadStatus.Loaded) {
                    const scenario = state.scenario.scenarios[id];
                    if (scenario != null) {
                        return scenario;
                    }
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
            state.scenarios = {};
            for (const s of action.payload) {
                state.scenarios[s.id] = s;
                // При загрузке списка все сценарии имеют статус NotLoaded
                if (state.scenarioStatuses[s.id] == null) {
                    state.scenarioStatuses[s.id] = ScenarioLoadStatus.NotLoaded;
                }
            }
        },

        setScenarioStatus(state, action: PayloadAction<{ id: Guid; status: ScenarioLoadStatus }>) {
            const { id, status } = action.payload;
            state.scenarioStatuses[id] = status;
            if (status !== ScenarioLoadStatus.Error) {
                delete state.scenarioErrors[id];
            }
        },

        setScenarioError(
            state,
            action: PayloadAction<{ id: Guid; status: ScenarioLoadStatus.Error; error: string }>
        ) {
            const { id, status, error } = action.payload;
            state.scenarioStatuses[id] = status;
            state.scenarioErrors[id] = error;
        },

        upsertScenarioFull(state, action: PayloadAction<ScenarioDto>) {
            const dto = action.payload;
            const normalized = normalizeScenario(dto);

            state.scenarios[dto.id] = dto;

            for (const b of normalized.branches) {
                state.branches[b.id] = b;
            }

            for (const s of normalized.steps) {
                state.steps[s.id] = s;
            }

            for (const r of normalized.relations) {
                state.relations[r.id] = r;
            }
        },

        clearScenarios(state) {
            state.scenarios = {};
            state.branches = {};
            state.steps = {};
            state.relations = {};
            state.activeScenarioId = null;
            state.scenarioStatuses = {};
            state.scenarioErrors = {};
        },

        // ============================================================================
        // STEP MUTATIONS
        // ============================================================================

        addStep(state, action: PayloadAction<{ branchId: Guid; step: StepBaseDto }>) {
            const { branchId, step } = action.payload;

            state.steps[step.id] = step;

            const branch = state.branches[branchId];
            if (branch != null) {
                state.branches[branchId] = {
                    ...branch,
                    steps: [...branch.steps, step],
                };
            }
        },

        updateStep(state, action: PayloadAction<{ stepId: Guid; changes: Partial<StepBaseDto> }>) {
            const { stepId, changes } = action.payload;

            const step = state.steps[stepId];
            if (step != null) {
                state.steps[stepId] = { ...step, ...changes };

                const branch = state.branches[step.branchId];
                if (branch != null) {
                    const steps = branch.steps.map((s) => (s.id === stepId ? state.steps[stepId] : s));
                    state.branches[step.branchId] = {
                        ...branch,
                        steps: [...steps] as StepBaseDto[],
                    };
                }
            }
        },

        deleteStep(state, action: PayloadAction<{ branchId: Guid; stepId: Guid }>) {
            const { branchId, stepId } = action.payload;

            delete state.steps[stepId];

            const branch = state.branches[branchId];
            if (branch) {
                state.branches[branchId] = {
                    ...branch,
                    steps: branch.steps.filter((s) => s.id !== stepId),
                };
            }

            for (const relId in state.relations) {
                const rel = state.relations[relId];
                if (rel != null && (rel.parentStepId === stepId || rel.childStepId === stepId)) {
                    delete state.relations[relId];
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
            const { branch } = action.payload;
            state.branches[branch.id] = branch;
        },

        updateBranch(state, action: PayloadAction<{ branchId: Guid; changes: Partial<BranchDto> }>) {
            const { branchId, changes } = action.payload;

            const branch = state.branches[branchId];
            if (branch != null) {
                state.branches[branchId] = { ...branch, ...changes };
            }
        },

        deleteBranch(state, action: PayloadAction<{ branchId: Guid }>) {
            const { branchId } = action.payload;

            const branch = state.branches[branchId];
            if (branch != null) {
                for (const step of branch.steps) {
                    delete state.steps[step.id];
                }

                delete state.branches[branchId];
            }
        },

        // ============================================================================
        // RELATION MUTATIONS
        // ============================================================================

        addRelation(state, action: PayloadAction<StepRelationDto>) {
            const relation = action.payload;
            state.relations[relation.id] = relation;

            const parentStep = state.steps[relation.parentStepId];
            if (parentStep != null) {
                state.steps[relation.parentStepId] = {
                    ...parentStep,
                    childRelations: [...parentStep.childRelations, relation],
                };
            }

            const childStep = state.steps[relation.childStepId];
            if (childStep != null) {
                state.steps[relation.childStepId] = {
                    ...childStep,
                    parentRelations: [...childStep.parentRelations, relation],
                };
            }
        },

        updateRelation(
            state,
            action: PayloadAction<{ relationId: Guid; changes: Partial<StepRelationDto> }>
        ) {
            const { relationId, changes } = action.payload;

            const relation = state.relations[relationId];
            if (relation != null) {
                state.relations[relationId] = { ...relation, ...changes };
            }
        },

        deleteRelation(state, action: PayloadAction<Guid>) {
            const relationId = action.payload;

            const relation = state.relations[relationId];
            if (relation != null) {
                delete state.relations[relationId];

                const parentStep = state.steps[relation.parentStepId];
                if (parentStep != null) {
                    state.steps[relation.parentStepId] = {
                        ...parentStep,
                        childRelations: parentStep.childRelations.filter((r) => r.id !== relationId),
                    };
                }

                const childStep = state.steps[relation.childStepId];
                if (childStep != null) {
                    state.steps[relation.childStepId] = {
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
};

export const scenarioReducer = persistReducer(scenarioPersistConfig, scenariosSlice.reducer);