import {
    createSlice,
    createEntityAdapter,
    type EntityState,
    type PayloadAction,
    createSelector
} from '@reduxjs/toolkit';
import { scenarioApi } from '@/shared/api/scenarioApi';
import type { ScenarioDto } from '@/shared/contracts/Dtos/ScenarioDtos/Scenarios/ScenarioDto';

// ====== Entity adapter (нормализованное хранение) ======
const scenariosAdapter = createEntityAdapter<ScenarioDto>({
    sortComparer: (a, b) => {
        // если есть поле updatedAt/createdAt — можно сортировать по нему
        const an = (a as any)?.name ?? '';
        const bn = (b as any)?.name ?? '';
        return an.localeCompare(bn);
    },
});

// ====== State ======
export type ScenariosStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface ScenariosState extends EntityState<ScenarioDto, string> {
    activeScenarioId: string | null;
    status: ScenariosStatus;
    error?: string;
    lastFetchedAt?: number;
}

const initialState: ScenariosState = scenariosAdapter.getInitialState({
    activeScenarioId: null,
    status: 'idle',
    error: undefined,
    lastFetchedAt: undefined,
});

// ====== Slice ======
const scenariosSlice = createSlice({
    name: 'scenarios',
    initialState,
    reducers: {
        setActiveScenarioId(state, action: PayloadAction<string | null>) {
            state.activeScenarioId = action.payload ?? null;
        },
        clearScenarios(state) {
            // например, при logout
            scenariosAdapter.removeAll(state);
            state.activeScenarioId = null;
            state.status = 'idle';
            state.error = undefined;
            state.lastFetchedAt = undefined;
        },
        upsertScenarioLocal(state, action: PayloadAction<ScenarioDto>) {
            scenariosAdapter.upsertOne(state, action.payload);
        },
        removeScenarioLocal(state, action: PayloadAction<string>) {
            scenariosAdapter.removeOne(state, action.payload);
            if (state.activeScenarioId === action.payload) {
                state.activeScenarioId = null;
            }
        },
    },
    extraReducers: (builder) => {
        // ====== GET ALL ======
        builder
            .addMatcher(scenarioApi.endpoints.getAllScenarios.matchPending, (state) => {
                state.status = 'loading';
                state.error = undefined;
            })
            .addMatcher(scenarioApi.endpoints.getAllScenarios.matchFulfilled, (state, { payload }) => {
                scenariosAdapter.setAll(state, payload ?? []);
                state.status = 'succeeded';
                state.lastFetchedAt = Date.now();
            })
            .addMatcher(scenarioApi.endpoints.getAllScenarios.matchRejected, (state, action) => {
                state.status = 'failed';
                state.error = (action.error?.message || 'Failed to load scenarios') as string;
            });

        // ====== GET BY ID ======
        builder
            .addMatcher(scenarioApi.endpoints.getScenarioById.matchPending, (state) => {
                state.status = 'loading';
                state.error = undefined;
            })
            .addMatcher(scenarioApi.endpoints.getScenarioById.matchFulfilled, (state, { payload }) => {
                if (payload) {
                    scenariosAdapter.upsertOne(state, payload);
                }
                state.status = 'succeeded';
                state.lastFetchedAt = Date.now();
            })
            .addMatcher(scenarioApi.endpoints.getScenarioById.matchRejected, (state, action) => {
                state.status = 'failed';
                state.error = (action.error?.message || 'Failed to load scenario') as string;
            });

        // ====== CREATE ======
        builder.addMatcher(scenarioApi.endpoints.addScenario.matchFulfilled, (state, { payload }) => {
            if (payload) {
                scenariosAdapter.addOne(state, payload);
                state.activeScenarioId = payload.id; // логично сразу активировать
            }
            state.status = 'succeeded';
        });

        // ====== UPDATE ======
        builder.addMatcher(
            scenarioApi.endpoints.updateScenario.matchFulfilled,
            (state, { payload }) => {
                if (payload) {
                    scenariosAdapter.upsertOne(state, payload);
                }
                state.status = 'succeeded';
            }
        );

        // ====== DELETE ======
        builder.addMatcher(
            scenarioApi.endpoints.deleteScenario.matchFulfilled,
            (state, { meta, payload }) => {
                // payload = boolean; удалили => true
                if (payload === true) {
                    // meta.arg.originalArgs: { id: string }
                    const deletedId = (meta as any)?.arg?.originalArgs?.id as string | undefined;
                    if (deletedId) {
                        scenariosAdapter.removeOne(state, deletedId);
                        if (state.activeScenarioId === deletedId) {
                            state.activeScenarioId = null;
                        }
                    }
                }
                state.status = 'succeeded';
            }
        );
    },
});

export const {
    setActiveScenarioId,
    clearScenarios,
    upsertScenarioLocal,
    removeScenarioLocal,
} = scenariosSlice.actions;

export default scenariosSlice.reducer;

// ====== Selectors ======
/** Подставь свой тип корневого стора, если он у тебя есть */
export interface RootState {
    scenarios: ScenariosState;
    // [scenarioApi.reducerPath]: ReturnType<typeof scenarioApi.reducer>; // обычно есть в сторе
}

const selectSelf = (state: RootState) => state.scenarios;

const adapterSelectors = scenariosAdapter.getSelectors<RootState>(selectSelf);

export const selectScenariosStatus = (state: RootState) => state.scenarios.status;
export const selectScenariosError = (state: RootState) => state.scenarios.error;
export const selectActiveScenarioId = (state: RootState) => state.scenarios.activeScenarioId;

export const selectAllScenarios = adapterSelectors.selectAll;
export const selectScenarioEntities = adapterSelectors.selectEntities;
export const selectScenarioById = adapterSelectors.selectById;
export const selectScenarioIds = adapterSelectors.selectIds;
export const selectScenariosTotal = createSelector(selectScenarioIds, (ids) => ids.length);

export const selectActiveScenario = createSelector(
    selectScenarioEntities,
    selectActiveScenarioId,
    (entities, id) => (id ? entities[id] ?? null : null)
);
