// src/features/mirax/store/miraxSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@app/store/store';
import type { LoadingState } from './types/miraxThunk.types';
import type { Guid } from '@app/lib/types/Guid';
import type { TechnicalRunDto } from '@chartsPage/charts/mirax/contracts/TechnicalRunDto';
import type { PortableDeviceDto } from '@chartsPage/charts/mirax/contracts/PortableDeviceDto';
import type { SensorDto } from '@chartsPage/charts/mirax/contracts/SensorDto';

/**
 * Вкладка испытания
 */
export interface TechnicalRunTab {
    readonly id: Guid;
    readonly name: string | undefined;
}

/**
 * Вкладка сенсора с полными объектами
 */
export interface SensorTab {
    readonly technicalRun: TechnicalRunDto;
    readonly device: PortableDeviceDto;
    readonly sensor: SensorDto;
}

/**
 * Ключ вкладки сенсора для идентификации
 */
export type SensorTabKey = string; // `${technicalRunId}-${factoryNumber}-${gas}-${channelNumber}`

/**
 * Состояние вкладок сенсоров для одного испытания
 */
export interface SensorTabsState {
    readonly openTabs: readonly SensorTab[];
    readonly activeTabKey: SensorTabKey | undefined;
}

/**
 * Состояние Mirax модуля
 */
export interface MiraxState {
    readonly databaseId: Guid | undefined;
    readonly openTabs: readonly TechnicalRunTab[];
    readonly activeTabId: Guid | undefined;
    readonly sensorTabs: Record<Guid, SensorTabsState>;
    readonly selectedDeviceFactoryNumber: string | undefined;
    readonly expandedTechnicalRunIds: readonly Guid[];
    readonly expandedDeviceFactoryNumbers: readonly string[];
    readonly technicalRunsLoading: LoadingState;
    readonly devicesLoading: Record<string, LoadingState>;
    readonly sensorsLoading: Record<string, LoadingState>;
}

const initialLoadingState: LoadingState = {
    isLoading: false,
    progress: 0,
    error: undefined,
};

const initialState: MiraxState = {
    databaseId: undefined,
    openTabs: [],
    activeTabId: undefined,
    sensorTabs: {},
    selectedDeviceFactoryNumber: undefined,
    expandedTechnicalRunIds: [],
    expandedDeviceFactoryNumbers: [],
    technicalRunsLoading: initialLoadingState,
    devicesLoading: {},
    sensorsLoading: {},
};

/**
 * Создать ключ для вкладки сенсора
 */
function createSensorTabKey(sensorTab: SensorTab): SensorTabKey {
    return `${sensorTab.technicalRun.id}-${sensorTab.device.factoryNumber}-${sensorTab.sensor.gas}-${sensorTab.sensor.channelNumber}`;
}

export const miraxSlice = createSlice({
    name: 'mirax',
    initialState,
    reducers: {
        setDatabaseId: (state, action: PayloadAction<Guid>) => {
            state.databaseId = action.payload;
            state.openTabs = [];
            state.activeTabId = undefined;
            state.sensorTabs = {};
            state.selectedDeviceFactoryNumber = undefined;
            state.expandedTechnicalRunIds = [];
            state.expandedDeviceFactoryNumbers = [];
            state.technicalRunsLoading = initialLoadingState;
            state.devicesLoading = {};
            state.sensorsLoading = {};
        },

        clearDatabase: (state) => {
            state.databaseId = undefined;
            state.openTabs = [];
            state.activeTabId = undefined;
            state.sensorTabs = {};
            state.selectedDeviceFactoryNumber = undefined;
            state.expandedTechnicalRunIds = [];
            state.expandedDeviceFactoryNumbers = [];
            state.technicalRunsLoading = initialLoadingState;
            state.devicesLoading = {};
            state.sensorsLoading = {};
        },

        openTechnicalRunTab: (state, action: PayloadAction<TechnicalRunTab>) => {
            const { id, name } = action.payload;
            const existingTab = state.openTabs.find((tab) => tab.id === id);

            if (existingTab) {
                state.activeTabId = id;
            } else {
                state.openTabs = [...state.openTabs, { id, name }];
                state.activeTabId = id;
                state.sensorTabs[id] = {
                    openTabs: [],
                    activeTabKey: undefined,
                };
            }
        },

        closeTechnicalRunTab: (state, action: PayloadAction<Guid>) => {
            const tabId = action.payload;
            const tabIndex = state.openTabs.findIndex((tab) => tab.id === tabId);

            if (tabIndex === -1) return;

            state.openTabs = state.openTabs.filter((tab) => tab.id !== tabId);

            if (state.activeTabId === tabId) {
                if (state.openTabs.length > 0) {
                    const newActiveIndex = Math.max(0, tabIndex - 1);
                    state.activeTabId = state.openTabs[newActiveIndex]?.id;
                } else {
                    state.activeTabId = undefined;
                }
            }

            delete state.sensorTabs[tabId];
            delete state.devicesLoading[tabId];

            state.expandedDeviceFactoryNumbers = [];
            state.selectedDeviceFactoryNumber = undefined;
        },

        setActiveTab: (state, action: PayloadAction<Guid>) => {
            const tabId = action.payload;
            if (state.openTabs.some((tab) => tab.id === tabId)) {
                state.activeTabId = tabId;
                state.selectedDeviceFactoryNumber = undefined;
            }
        },

        closeAllTabs: (state) => {
            state.openTabs = [];
            state.activeTabId = undefined;
            state.sensorTabs = {};
            state.selectedDeviceFactoryNumber = undefined;
            state.expandedDeviceFactoryNumbers = [];
        },

        /**
         * Открыть вкладку сенсора с полными объектами
         */
        openSensorTab: (state, action: PayloadAction<SensorTab>) => {
            const sensorTab = action.payload;
            const technicalRunId = sensorTab.technicalRun.id;

            if (!state.openTabs.some((tab) => tab.id === technicalRunId)) {
                return;
            }

            if (!(technicalRunId in state.sensorTabs)) {
                state.sensorTabs[technicalRunId] = {
                    openTabs: [],
                    activeTabKey: undefined,
                };
            }

            const sensorTabsState = state.sensorTabs[technicalRunId]!;
            const tabKey = createSensorTabKey(sensorTab);

            const existingTab = sensorTabsState.openTabs.find(
                (tab) => createSensorTabKey(tab) === tabKey
            );

            if (existingTab) {
                state.sensorTabs[technicalRunId] = {
                    ...sensorTabsState,
                    activeTabKey: tabKey,
                };
            } else {
                state.sensorTabs[technicalRunId] = {
                    openTabs: [...sensorTabsState.openTabs, sensorTab],
                    activeTabKey: tabKey,
                };
            }
        },

        closeSensorTab: (
            state,
            action: PayloadAction<{ readonly technicalRunId: Guid; readonly tabKey: SensorTabKey }>
        ) => {
            const { technicalRunId, tabKey } = action.payload;

            if (!(technicalRunId in state.sensorTabs)) return;

            const sensorTabsState = state.sensorTabs[technicalRunId]!;
            const tabIndex = sensorTabsState.openTabs.findIndex(
                (tab) => createSensorTabKey(tab) === tabKey
            );

            if (tabIndex === -1) return;

            const newOpenTabs = sensorTabsState.openTabs.filter(
                (tab) => createSensorTabKey(tab) !== tabKey
            );

            let newActiveTabKey = sensorTabsState.activeTabKey;

            if (sensorTabsState.activeTabKey === tabKey) {
                if (newOpenTabs.length > 0) {
                    const newActiveIndex = Math.max(0, tabIndex - 1);
                    const newActiveTab = newOpenTabs[newActiveIndex];
                    if (newActiveTab) {
                        newActiveTabKey = createSensorTabKey(newActiveTab);
                    } else {
                        newActiveTabKey = undefined;
                    }
                } else {
                    newActiveTabKey = undefined;
                }
            }

            state.sensorTabs[technicalRunId] = {
                openTabs: newOpenTabs,
                activeTabKey: newActiveTabKey,
            };
        },

        setActiveSensorTab: (
            state,
            action: PayloadAction<{ readonly technicalRunId: Guid; readonly tabKey: SensorTabKey }>
        ) => {
            const { technicalRunId, tabKey } = action.payload;

            if (!(technicalRunId in state.sensorTabs)) return;

            const sensorTabsState = state.sensorTabs[technicalRunId]!;

            const tabExists = sensorTabsState.openTabs.some(
                (tab) => createSensorTabKey(tab) === tabKey
            );

            if (tabExists) {
                state.sensorTabs[technicalRunId] = {
                    ...sensorTabsState,
                    activeTabKey: tabKey,
                };
            }
        },

        closeAllSensorTabs: (state, action: PayloadAction<Guid>) => {
            const technicalRunId = action.payload;

            if (technicalRunId in state.sensorTabs) {
                state.sensorTabs[technicalRunId] = {
                    openTabs: [],
                    activeTabKey: undefined,
                };
            }
        },

        deselectDevice: (state) => {
            state.selectedDeviceFactoryNumber = undefined;
        },

        selectDevice: (state, action: PayloadAction<string>) => {
            state.selectedDeviceFactoryNumber = action.payload;
        },

        toggleTechnicalRunExpanded: (state, action: PayloadAction<Guid>) => {
            const id = action.payload;
            const isExpanded = state.expandedTechnicalRunIds.includes(id);

            if (isExpanded) {
                state.expandedTechnicalRunIds = state.expandedTechnicalRunIds.filter(
                    (itemId) => itemId !== id
                );
            } else {
                state.expandedTechnicalRunIds = [...state.expandedTechnicalRunIds, id];
            }
        },

        expandTechnicalRun: (state, action: PayloadAction<Guid>) => {
            const id = action.payload;
            if (!state.expandedTechnicalRunIds.includes(id)) {
                state.expandedTechnicalRunIds = [...state.expandedTechnicalRunIds, id];
            }
        },

        collapseTechnicalRun: (state, action: PayloadAction<Guid>) => {
            state.expandedTechnicalRunIds = state.expandedTechnicalRunIds.filter(
                (id) => id !== action.payload
            );
        },

        collapseAllTechnicalRuns: (state) => {
            state.expandedTechnicalRunIds = [];
        },

        expandAllTechnicalRuns: (state, action: PayloadAction<readonly Guid[]>) => {
            state.expandedTechnicalRunIds = [...action.payload];
        },

        toggleDeviceExpanded: (state, action: PayloadAction<string>) => {
            const factoryNumber = action.payload;
            const isExpanded = state.expandedDeviceFactoryNumbers.includes(factoryNumber);

            if (isExpanded) {
                state.expandedDeviceFactoryNumbers = state.expandedDeviceFactoryNumbers.filter(
                    (num) => num !== factoryNumber
                );
            } else {
                state.expandedDeviceFactoryNumbers = [
                    ...state.expandedDeviceFactoryNumbers,
                    factoryNumber,
                ];
            }
        },

        expandDevice: (state, action: PayloadAction<string>) => {
            const factoryNumber = action.payload;
            if (!state.expandedDeviceFactoryNumbers.includes(factoryNumber)) {
                state.expandedDeviceFactoryNumbers = [
                    ...state.expandedDeviceFactoryNumbers,
                    factoryNumber,
                ];
            }
        },

        collapseDevice: (state, action: PayloadAction<string>) => {
            state.expandedDeviceFactoryNumbers = state.expandedDeviceFactoryNumbers.filter(
                (num) => num !== action.payload
            );
        },

        collapseAllDevices: (state) => {
            state.expandedDeviceFactoryNumbers = [];
        },

        startTechnicalRunsLoading: (state) => {
            state.technicalRunsLoading = {
                isLoading: true,
                progress: 0,
                error: undefined,
            };
        },

        updateTechnicalRunsProgress: (state, action: PayloadAction<number>) => {
            state.technicalRunsLoading = {
                ...state.technicalRunsLoading,
                progress: action.payload,
            };
        },

        finishTechnicalRunsLoading: (
            state,
            action: PayloadAction<{ readonly success: boolean; readonly error?: string | undefined }>
        ) => {
            state.technicalRunsLoading = {
                isLoading: false,
                progress: action.payload.success ? 100 : 0,
                error: action.payload.error,
            };
        },

        resetTechnicalRunsLoading: (state) => {
            state.technicalRunsLoading = initialLoadingState;
        },

        startDevicesLoading: (state, action: PayloadAction<Guid>) => {
            const technicalRunId = action.payload;
            state.devicesLoading[technicalRunId] = {
                isLoading: true,
                progress: 0,
                error: undefined,
            };
        },

        updateDevicesProgress: (
            state,
            action: PayloadAction<{ readonly technicalRunId: Guid; readonly progress: number }>
        ) => {
            const { technicalRunId, progress } = action.payload;
            if (technicalRunId in state.devicesLoading) {
                state.devicesLoading[technicalRunId] = {
                    ...state.devicesLoading[technicalRunId]!,
                    progress,
                };
            }
        },

        finishDevicesLoading: (
            state,
            action: PayloadAction<{
                readonly technicalRunId: Guid;
                readonly success: boolean;
                readonly error?: string | undefined;
            }>
        ) => {
            const { technicalRunId, success, error } = action.payload;
            state.devicesLoading[technicalRunId] = {
                isLoading: false,
                progress: success ? 100 : 0,
                error,
            };
        },

        clearDevicesLoading: (state, action: PayloadAction<Guid>) => {
            delete state.devicesLoading[action.payload];
        },

        clearAllDevicesLoading: (state) => {
            state.devicesLoading = {};
        },

        startSensorsLoading: (
            state,
            action: PayloadAction<{ readonly technicalRunId: Guid; readonly factoryNumber: string }>
        ) => {
            const { technicalRunId, factoryNumber } = action.payload;
            const key = `${technicalRunId}-${factoryNumber}`;
            state.sensorsLoading[key] = {
                isLoading: true,
                progress: 0,
                error: undefined,
            };
        },

        updateSensorsProgress: (
            state,
            action: PayloadAction<{
                readonly technicalRunId: Guid;
                readonly factoryNumber: string;
                readonly progress: number;
            }>
        ) => {
            const { technicalRunId, factoryNumber, progress } = action.payload;
            const key = `${technicalRunId}-${factoryNumber}`;
            if (key in state.sensorsLoading) {
                state.sensorsLoading[key] = {
                    ...state.sensorsLoading[key]!,
                    progress,
                };
            }
        },

        finishSensorsLoading: (
            state,
            action: PayloadAction<{
                readonly technicalRunId: Guid;
                readonly factoryNumber: string;
                readonly success: boolean;
                readonly error?: string | undefined;
            }>
        ) => {
            const { technicalRunId, factoryNumber, success, error } = action.payload;
            const key = `${technicalRunId}-${factoryNumber}`;
            state.sensorsLoading[key] = {
                isLoading: false,
                progress: success ? 100 : 0,
                error,
            };
        },

        clearSensorsLoading: (
            state,
            action: PayloadAction<{ readonly technicalRunId: Guid; readonly factoryNumber: string }>
        ) => {
            const { technicalRunId, factoryNumber } = action.payload;
            const key = `${technicalRunId}-${factoryNumber}`;
            delete state.sensorsLoading[key];
        },

        clearAllSensorsLoading: (state) => {
            state.sensorsLoading = {};
        },

        resetMiraxState: () => initialState,
    },
});

export const {
    setDatabaseId,
    clearDatabase,
    openTechnicalRunTab,
    closeTechnicalRunTab,
    setActiveTab,
    closeAllTabs,
    openSensorTab,
    closeSensorTab,
    setActiveSensorTab,
    closeAllSensorTabs,
    selectDevice,
    deselectDevice,
    toggleTechnicalRunExpanded,
    expandTechnicalRun,
    collapseTechnicalRun,
    collapseAllTechnicalRuns,
    expandAllTechnicalRuns,
    toggleDeviceExpanded,
    expandDevice,
    collapseDevice,
    collapseAllDevices,
    startTechnicalRunsLoading,
    updateTechnicalRunsProgress,
    finishTechnicalRunsLoading,
    resetTechnicalRunsLoading,
    startDevicesLoading,
    updateDevicesProgress,
    finishDevicesLoading,
    clearDevicesLoading,
    clearAllDevicesLoading,
    startSensorsLoading,
    updateSensorsProgress,
    finishSensorsLoading,
    clearSensorsLoading,
    clearAllSensorsLoading,
    resetMiraxState,
} = miraxSlice.actions;

// Selectors
export const selectDatabaseId = (state: RootState): Guid | undefined =>
    state.mirax.databaseId;

export const selectHasDatabase = (state: RootState): boolean =>
    state.mirax.databaseId !== undefined;

export const selectOpenTabs = (state: RootState): readonly TechnicalRunTab[] =>
    state.mirax.openTabs;

export const selectActiveTabId = (state: RootState): Guid | undefined =>
    state.mirax.activeTabId;

export const selectHasOpenTabs = (state: RootState): boolean =>
    state.mirax.openTabs.length > 0;

export const selectIsTabOpen = (state: RootState, tabId: Guid): boolean =>
    state.mirax.openTabs.some((tab) => tab.id === tabId);

export const selectSensorTabsState = (
    state: RootState,
    technicalRunId: Guid
): SensorTabsState => {
    return (
        state.mirax.sensorTabs[technicalRunId] ?? {
            openTabs: [],
            activeTabKey: undefined,
        }
    );
};

export const selectOpenSensorTabs = (
    state: RootState,
    technicalRunId: Guid
): readonly SensorTab[] => {
    return selectSensorTabsState(state, technicalRunId).openTabs;
};

export const selectActiveSensorTabKey = (
    state: RootState,
    technicalRunId: Guid
): SensorTabKey | undefined => {
    return selectSensorTabsState(state, technicalRunId).activeTabKey;
};

export const selectActiveSensorTab = (
    state: RootState,
    technicalRunId: Guid
): SensorTab | undefined => {
    const sensorTabsState = selectSensorTabsState(state, technicalRunId);
    if (!sensorTabsState.activeTabKey) return undefined;

    return sensorTabsState.openTabs.find(
        (tab) => createSensorTabKey(tab) === sensorTabsState.activeTabKey
    );
};

export const selectHasSensorTabs = (state: RootState, technicalRunId: Guid): boolean => {
    return selectSensorTabsState(state, technicalRunId).openTabs.length > 0;
};

/**
 * Создать ключ для вкладки сенсора (экспортируемая версия)
 */
export function getSensorTabKey(sensorTab: SensorTab): SensorTabKey {
    return createSensorTabKey(sensorTab);
}

export const selectSelectedDeviceFactoryNumber = (state: RootState): string | undefined =>
    state.mirax.selectedDeviceFactoryNumber;

export const selectHasSelectedDevice = (state: RootState): boolean =>
    state.mirax.selectedDeviceFactoryNumber !== undefined;

export const selectExpandedTechnicalRunIds = (state: RootState): readonly Guid[] =>
    state.mirax.expandedTechnicalRunIds;

export const selectExpandedDeviceFactoryNumbers = (state: RootState): readonly string[] =>
    state.mirax.expandedDeviceFactoryNumbers;

export const selectIsTechnicalRunExpanded = (state: RootState, technicalRunId: Guid): boolean =>
    state.mirax.expandedTechnicalRunIds.includes(technicalRunId);

export const selectIsDeviceExpanded = (state: RootState, factoryNumber: string): boolean =>
    state.mirax.expandedDeviceFactoryNumbers.includes(factoryNumber);

export const selectTechnicalRunsLoading = (state: RootState): LoadingState =>
    state.mirax.technicalRunsLoading;

export const selectDevicesLoading = (state: RootState, technicalRunId: Guid): LoadingState =>
    state.mirax.devicesLoading[technicalRunId] ?? {
        isLoading: false,
        progress: 0,
        error: undefined,
    };

export const selectSensorsLoading = (
    state: RootState,
    technicalRunId: Guid,
    factoryNumber: string
): LoadingState => {
    const key = `${technicalRunId}-${factoryNumber}`;
    return (
        state.mirax.sensorsLoading[key] ?? {
            isLoading: false,
            progress: 0,
            error: undefined,
        }
    );
};

export const selectIsTechnicalRunsLoading = (state: RootState): boolean =>
    state.mirax.technicalRunsLoading.isLoading;

export const selectIsDevicesLoading = (state: RootState, technicalRunId: Guid): boolean =>
    state.mirax.devicesLoading[technicalRunId]?.isLoading ?? false;

export const selectIsSensorsLoading = (
    state: RootState,
    technicalRunId: Guid,
    factoryNumber: string
): boolean => {
    const key = `${technicalRunId}-${factoryNumber}`;
    return state.mirax.sensorsLoading[key]?.isLoading ?? false;
};

export const selectTechnicalRunsError = (state: RootState): string | undefined =>
    state.mirax.technicalRunsLoading.error;

export const selectDevicesError = (state: RootState, technicalRunId: Guid): string | undefined =>
    state.mirax.devicesLoading[technicalRunId]?.error;

export const selectSensorsError = (
    state: RootState,
    technicalRunId: Guid,
    factoryNumber: string
): string | undefined => {
    const key = `${technicalRunId}-${factoryNumber}`;
    return state.mirax.sensorsLoading[key]?.error;
};

export const selectMiraxState = (state: RootState): MiraxState => state.mirax;

export default miraxSlice.reducer;