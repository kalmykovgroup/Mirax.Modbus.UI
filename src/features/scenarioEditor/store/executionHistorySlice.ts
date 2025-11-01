import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import sessionStorage from "redux-persist/lib/storage/session";
import type { RootState } from "@/baseStore/store.ts";
import type {
    ScenarioExecutionHistoryDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioExecutionHistoryDtos/ScenarioExecutionHistoryDto.ts";
import type {
    ScenarioRecoveryLogDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioExecutionHistoryDtos/ScenarioRecoveryLogDto.ts";
import type {
    ScenarioExecutionStatus
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioExecutionHistoryDtos/ScenarioExecutionStatus.ts";

/** Локальное UI-состояние для истории выполнения сценариев */
export interface ExecutionHistoryState {
    /** Все загруженные записи истории */
    executions: ScenarioExecutionHistoryDto[];

    /** Логи восстановления по ID истории выполнения */
    recoveryLogs: Record<string, ScenarioRecoveryLogDto[]>;

    /** UI состояние модального окна */
    modalState: {
        isOpen: boolean;
        selectedScenarioId: string | null;
        selectedExecutionId: string | null;
        statusFilter: ScenarioExecutionStatus | 'all';
    };
}

const initialState: ExecutionHistoryState = {
    executions: [],
    recoveryLogs: {},
    modalState: {
        isOpen: false,
        selectedScenarioId: null,
        selectedExecutionId: null,
        statusFilter: 'all',
    },
};

const executionHistorySlice = createSlice({
    name: "executionHistory",
    initialState,
    reducers: {
        /** Установить весь список записей истории */
        setExecutions(state, action: PayloadAction<ScenarioExecutionHistoryDto[]>) {
            state.executions = action.payload ?? [];
        },

        /** Добавить или обновить запись истории */
        upsertExecution(state, action: PayloadAction<ScenarioExecutionHistoryDto>) {
            const execution = action.payload;
            const idx = state.executions.findIndex(x => x.id === execution.id);
            if (idx >= 0) {
                state.executions[idx] = execution;
            } else {
                state.executions.push(execution);
            }
        },

        /** Удалить запись истории */
        removeExecution(state, action: PayloadAction<{ id: string }>) {
            const { id } = action.payload;
            state.executions = state.executions.filter(x => x.id !== id);
            // Также удаляем связанные логи восстановления
            delete state.recoveryLogs[id];
        },

        /** Установить логи восстановления для конкретной записи истории */
        setRecoveryLogs(
            state,
            action: PayloadAction<{ executionId: string; logs: ScenarioRecoveryLogDto[] }>
        ) {
            const { executionId, logs } = action.payload;
            state.recoveryLogs[executionId] = logs ?? [];
        },

        /** Добавить лог восстановления */
        addRecoveryLog(
            state,
            action: PayloadAction<{ executionId: string; log: ScenarioRecoveryLogDto }>
        ) {
            const { executionId, log } = action.payload;
            if (!state.recoveryLogs[executionId]) {
                state.recoveryLogs[executionId] = [];
            }
            state.recoveryLogs[executionId].push(log);
        },

        /** Открыть модальное окно */
        openExecutionHistoryModal(
            state,
            action: PayloadAction<{ scenarioId: string | null }>
        ) {
            state.modalState.isOpen = true;
            state.modalState.selectedScenarioId = action.payload.scenarioId;
            state.modalState.selectedExecutionId = null;
            state.modalState.statusFilter = 'all';
        },

        /** Закрыть модальное окно */
        closeExecutionHistoryModal(state) {
            state.modalState.isOpen = false;
            state.modalState.selectedScenarioId = null;
            state.modalState.selectedExecutionId = null;
            state.modalState.statusFilter = 'all';
        },

        /** Выбрать запись для просмотра деталей */
        selectExecution(state, action: PayloadAction<{ executionId: string | null }>) {
            state.modalState.selectedExecutionId = action.payload.executionId;
        },

        /** Установить фильтр по статусу */
        setStatusFilter(state, action: PayloadAction<ScenarioExecutionStatus | 'all'>) {
            state.modalState.statusFilter = action.payload;
        },

        /** Очистить все данные */
        clearAllExecutionHistory(state) {
            state.executions = [];
            state.recoveryLogs = {};
        },
    },
});

export const {
    setExecutions,
    upsertExecution,
    removeExecution,
    setRecoveryLogs,
    addRecoveryLog,
    openExecutionHistoryModal,
    closeExecutionHistoryModal,
    selectExecution,
    setStatusFilter,
    clearAllExecutionHistory,
} = executionHistorySlice.actions;

/* ====================== Selectors ====================== */

/** Получить все записи истории */
export const selectAllExecutions = (s: RootState) => s.executionHistory.executions;

/** Получить записи истории для конкретного сценария */
export const selectExecutionsByScenarioId =
    (scenarioId: string) => (s: RootState) =>
        s.executionHistory.executions.filter(x => x.scenarioId === scenarioId);

/** Получить записи истории с фильтром по статусу */
export const selectExecutionsFiltered = (s: RootState) => {
    const { executions, modalState } = s.executionHistory;
    const { selectedScenarioId, statusFilter } = modalState;

    let filtered = executions;

    // Фильтр по сценарию
    if (selectedScenarioId) {
        filtered = filtered.filter(x => x.scenarioId === selectedScenarioId);
    }

    // Фильтр по статусу
    if (statusFilter !== 'all') {
        filtered = filtered.filter(x => x.status === statusFilter);
    }

    // Сортировка по времени начала (новые сначала)
    return filtered.sort((a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
};

/** Получить конкретную запись истории по ID */
export const selectExecutionById =
    (id: string) => (s: RootState) =>
        s.executionHistory.executions.find(x => x.id === id) ?? null;

/** Получить логи восстановления для конкретной записи */
export const selectRecoveryLogsByExecutionId =
    (executionId: string) => (s: RootState) =>
        s.executionHistory.recoveryLogs[executionId] ?? [];

/** Получить активные (запущенные) сценарии */
export const selectActiveExecutions = (s: RootState) =>
    s.executionHistory.executions.filter(x => x.status === 0); // Running = 0

/** Получить состояние модального окна */
export const selectModalState = (s: RootState) => s.executionHistory.modalState;

/** Получить выбранную запись */
export const selectSelectedExecution = (s: RootState) => {
    const { selectedExecutionId } = s.executionHistory.modalState;
    if (!selectedExecutionId) return null;
    return s.executionHistory.executions.find(x => x.id === selectedExecutionId) ?? null;
};

/** Получить статистику по записям */
export const selectExecutionStats = (s: RootState) => {
    const executions = s.executionHistory.executions;
    return {
        total: executions.length,
        running: executions.filter(x => x.status === 0).length,
        completed: executions.filter(x => x.status === 1).length,
        failed: executions.filter(x => x.status === 2).length,
        terminated: executions.filter(x => x.status === 3).length,
        canceled: executions.filter(x => x.status === 4).length,
        timedOut: executions.filter(x => x.status === 5).length,
        paused: executions.filter(x => x.status === 6).length,
    };
};

const executionHistoryPersistConfig = {
    key: 'executionHistory',
    storage: sessionStorage,
    // Можно не сохранять modalState, так как это временное UI состояние
    blacklist: ['modalState'] as const,
};

export const executionHistoryReducer = persistReducer(
    executionHistoryPersistConfig,
    executionHistorySlice.reducer
);
