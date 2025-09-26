import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {RootState} from "@/store/types.ts";
import type { RunningScenarioData } from "@shared/contracts/Dtos/LocalDtos/ScenarioEngine/RunningScenarioData.ts";
import {persistReducer} from "redux-persist";
import sessionStorage from "redux-persist/lib/storage/session";

/** Локальное UI-состояние для Workflow */
export interface WorkflowState {
    runningScenarios: RunningScenarioData[];
}

const initialState: WorkflowState = {
    runningScenarios: [] as RunningScenarioData[],
};


const workflowSlice = createSlice({
    name: "workflow",
    initialState,
    reducers: {
        /** ПОСТАВИТЬ весь список (например, после загрузки с бэка) */
        setRunningScenarios(state, action: PayloadAction<RunningScenarioData[]>) {
            state.runningScenarios = action.payload ?? [];
        },

        /** ДОБАВИТЬ (или заменить по scenarioId, если уже есть) */
        addRunningScenario(state, action: PayloadAction<RunningScenarioData>) {
            const item = action.payload;
            const idx = state.runningScenarios.findIndex(x => x.scenarioId === item.scenarioId);
            if (idx >= 0) {
                state.runningScenarios[idx] = item; // заменяем существующий
            } else {
                state.runningScenarios.push(item);  // добавляем новый
            }
        },

        /** УДАЛИТЬ из списка по scenarioId */
        removeRunningScenario(state, action: PayloadAction<{ scenarioId: string }>) {
            const { scenarioId } = action.payload;
            state.runningScenarios = state.runningScenarios.filter(x => x.scenarioId !== scenarioId);
        },
    },
    extraReducers: _builder => {
        // тут можно подписаться на RTK Query/asyncThunk, если появится загрузка с сервера
    },
});

export const {
    setRunningScenarios,
    addRunningScenario,
    removeRunningScenario,
} = workflowSlice.actions;


/* ====================== Selectors ====================== */

export const selectRunningScenarios = (s: RootState) => s.workflow.runningScenarios;

export const selectRunningScenarioById =
    (scenarioId: string) => (s: RootState) =>
        s.workflow.runningScenarios.find(x => x.scenarioId === scenarioId) ?? null;

export const selectRunningScenarioExists =
    (scenarioId: string) => (s: RootState) =>
        s.workflow.runningScenarios.some(x => x.scenarioId === scenarioId);

const workflowPersistConfig = {
    key: 'workflow',
    storage: sessionStorage, // Временно
};

export const workflowReducer = persistReducer(workflowPersistConfig, workflowSlice.reducer);