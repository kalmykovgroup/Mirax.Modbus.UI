import {
    createSelector,
    createSlice, type EntityState,
    type PayloadAction,
} from '@reduxjs/toolkit';
import type { ScenarioDto } from '@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/Scenarios/ScenarioDto.ts';
import type { AppDispatch, RootState } from '@/store/types.ts';
import { scenarioApi } from '@shared/api/scenarioApi.ts';
import { extractErr } from '@app/lib/types/extractErr.ts';
import type { Guid } from '@app/lib/types/Guid.ts';
import {ScenarioLoadOptions} from "@shared/contracts/Types/Api.Shared/RepositoryOptions/ScenarioLoadOptions.ts";
import type {ScenarioOperationDto} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/ScenarioOperationDto.ts";
import type {SaveScenarioBatchResult} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/SaveScenarioBatchResult.ts";

// Enum загрузки
// @ts-ignore
export enum ScenarioLoadState {
    None = 'none',
    Loading = 'loading',
    Full = 'full',
    Error = 'error',
}

export interface ScenarioDetailsEntry {
    scenario: ScenarioDto;
    loadState: ScenarioLoadState;
    lastFetchedAt?: number | null;
    error?: string | null;
}

export interface ScenarioState extends EntityState<ScenarioDetailsEntry, Guid> {
    errorLoadList?: string | null;
    activeScenarioId?: Guid | null;
    lastFetchedAt: number | null;
    pendingChanges: Record<Guid, ScenarioOperationDto[]>;
}

// Начальное состояние
const initialState: ScenarioState = {
    ids: [],
    entities: {},
    errorLoadList: null,
    activeScenarioId: null,
    lastFetchedAt: null,
    pendingChanges: {},
};

// Обновить список (инициируем без подписки, с форс-рефетчем по флагу)
export const refreshScenariosList =
    (forceRefetch = true) =>
        async (dispatch: AppDispatch) => {
            try {
                const list = await dispatch(
                    scenarioApi.endpoints.getAllScenarios.initiate(undefined, {
                        forceRefetch,
                        subscribe: false,             // ← единоразовый вызов без подписки
                    })
                ).unwrap();
                dispatch(scenariosSlice.actions.replaceScenarios(list ?? []));
                return list ?? [];
            } catch (e) {
                const msg = extractErr(e);
                dispatch(scenariosSlice.actions.setErrorLoadList(msg));
                throw new Error(msg);
            }
        };

// ──────────────────────────────────────────────────────────────
// Детально по id (ВАЖНО: 1-й аргумент — объект { id, query? })
export const refreshScenarioById =
    (id: Guid, forceRefetch = false) =>
        async (dispatch: AppDispatch, getState: () => RootState) => {
            try {
                // Если НЕ просили форс-рефетч и детали уже есть — выходим
                if (!forceRefetch) {
                    const entry = getState().scenario.entities[id];
                    if (entry?.loadState === ScenarioLoadState.Full) {
                        return entry.scenario; // ничего не грузим
                    }
                }

                // Реально грузим только если дошли сюда
                dispatch(scenariosSlice.actions.markScenarioLoading(id));

                const arg = {
                    id,
                    query: { scenarioLoadOption: ScenarioLoadOptions.LoadRecursiveSteps },
                } as const;

                const dto = await dispatch(
                    scenarioApi.endpoints.getScenarioById.initiate(arg, {
                        forceRefetch: true,   // форсим сетевой вызов, раз уж решили грузить
                        subscribe: false,
                    })
                ).unwrap();

                if (dto) dispatch(scenariosSlice.actions.upsertScenario(dto));
                return dto;
            } catch (e) {
                const msg = extractErr(e);
                dispatch(scenariosSlice.actions.setErrorLoadList(msg));
                dispatch(scenariosSlice.actions.setScenarioError({ id, error: msg }));
                throw new Error(msg);
            }
        };



// +++ отправка накопленных изменений текущего сценария +++
// returns SaveScenarioBatchResult | null, пробрасывает ошибку наверх
export const applyScenarioPendingChanges =
    (id: Guid) =>
        async (dispatch: AppDispatch, getState: () => RootState): Promise<SaveScenarioBatchResult | null> => {
            const ops = getState().scenario.pendingChanges[id] ?? [];
            if (!ops.length) return null;

            try {
                const res = await dispatch(
                    scenarioApi.endpoints.applyScenarioChanges.initiate({ scenarioId: id, operations: ops })
                ).unwrap();

                // Успех: очищаем буфер и перечитываем детали
                dispatch(scenariosSlice.actions.clearPendingChanges(id));
                await dispatch(refreshScenarioById(id, true));
                return res;
            } catch (e) {
                const msg = extractErr(e);
                // Важно: буфер НЕ чистим — пользователь может повторить отправку
                dispatch(scenariosSlice.actions.setScenarioError({ id, error: msg }));
                // Пробрасываем выше, чтобы UI показал тост/ошибку
                throw new Error(msg);
            }
        };



const scenariosSlice = createSlice({
    name: 'scenarios',
    initialState,
    reducers: {
        setActiveScenarioId(state, action: PayloadAction<Guid>) {
            console.log(action.payload);
            state.activeScenarioId = action.payload ;
        },
        setErrorLoadList(state, action: PayloadAction<string | null>) {
            state.errorLoadList = action.payload ?? null;
        },
        clearScenarios(state) {
            state.ids = [];
            state.entities = {};
            state.activeScenarioId = null;
            state.lastFetchedAt = null;
            state.errorLoadList = null;
        },
        removeScenarioLocal(state, action: PayloadAction<string>) {
            if (state.activeScenarioId === action.payload) {
                state.activeScenarioId = null;
            }
        },

        markScenarioLoading(state, action: PayloadAction<Guid>) {
            const id = action.payload;
            const entry = state.entities[id];
            if (entry) {
                state.entities[id] = {
                    ...entry,
                    loadState: ScenarioLoadState.Loading,
                    error: null,
                };
            }
        },
        setScenarioError(state, action: PayloadAction<{ id: Guid; error: string }>) {
            const { id, error } = action.payload;
            const entry = state.entities[id];
            if (entry) {
                state.entities[id] = {
                    ...entry,
                    loadState: ScenarioLoadState.Error,
                    error,
                };
            }
        },

        // Массовая замена списка
        replaceScenarios(state, action: PayloadAction<ScenarioDto[]>) {
            const now = Date.now();
            const list = action.payload ?? [];
            state.ids = list.map((s) => s.id as Guid);
            state.entities = {};
            for (const s of list) {
                state.entities[s.id as Guid] = {
                    scenario: s,
                    loadState: ScenarioLoadState.None,
                    lastFetchedAt: now,
                    error: null,
                };
            }
            state.lastFetchedAt = now;
        },

        // Апсерт одной детали
        upsertScenario(state, action: PayloadAction<ScenarioDto>) {
            const s = action.payload;
            const key = s.id as Guid;
            const now = Date.now();
            if (!state.ids.includes(key)) state.ids.push(key);
            state.entities[key] = {
                scenario: s,
                loadState: ScenarioLoadState.Full,
                lastFetchedAt: now,
                error: null,
            };
        },

        // +++ добавить операцию в буфер по scenarioId +++
        enqueuePendingChange(state, action: PayloadAction<{ scenarioId: Guid; op: ScenarioOperationDto }>) {
            const { scenarioId, op } = action.payload;
            if (!state.pendingChanges[scenarioId]) state.pendingChanges[scenarioId] = [];
            state.pendingChanges[scenarioId].push(op);
        },

        // +++ очистить буфер изменений для scenarioId +++
        clearPendingChanges(state, action: PayloadAction<Guid>) {
            const id = action.payload;
            state.pendingChanges[id] = [];
        },
    },
    extraReducers: () => {},
});

// ===== Selectors =====
// базовые
export const selectScenarioSlice = (s: RootState) => s.scenario;
export const selectActiveScenarioId = (s: RootState) => s.scenario.activeScenarioId;
export const selectScenarioIds = (s: RootState) => s.scenario.ids as Guid[];
export const selectScenarioEntities = (s: RootState) => s.scenario.entities;

// список записей в порядке ids (Стабильная ССЫЛКА!)
export const selectScenariosEntries = createSelector(
    [selectScenarioIds, selectScenarioEntities],
    (ids, entities): ScenarioDetailsEntry[] => ids.map(id => entities[id]!).filter(Boolean)
);

// фабрика: одна запись по id (мемо на уровне аргументов)
export const makeSelectScenarioEntryById = () =>
    createSelector(
        [selectScenarioEntities, (_: RootState, id: Guid | null) => id],
        (entities, id) => (id ? entities[id] ?? null : null)
    );

// прочие простые поля
export const selectScenariosLastFetchedAt = (s: RootState) => s.scenario.lastFetchedAt;
export const selectScenariosListError = (s: RootState) => s.scenario.errorLoadList;

// ===== Exports =====
export const {
    setActiveScenarioId,
    clearScenarios,
    removeScenarioLocal,
    setErrorLoadList,
    replaceScenarios,
    upsertScenario,
    markScenarioLoading,
    setScenarioError,
    enqueuePendingChange,
    clearPendingChanges,
} = scenariosSlice.actions;

export default scenariosSlice.reducer;
