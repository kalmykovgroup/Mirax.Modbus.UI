import {createSelector, createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type { Guid } from '@app/lib/types/Guid';
import type { TechnicalRunDto } from '@chartsPage/mirax/contracts/TechnicalRunDto';
import type { PortableDeviceDto } from '@chartsPage/mirax/contracts/PortableDeviceDto';
import type { SensorDto } from '@chartsPage/mirax/contracts/SensorDto';
import type {MiraxLoadingState} from "@chartsPage/mirax/miraxThunk.types.ts";
import type {RootState} from "@/store/store.ts";
import { ENV } from '@/env';
import type {DatabaseDto} from "@chartsPage/metaData/shared/dtos/DatabaseDto.ts";

/**
 * Вкладка испытания
 */
export interface TechnicalRunTab {
    readonly id: Guid;
    readonly name: string | undefined;
}

/**
 * Тип ключа для идентификации сенсоров устройства
 * Формат: `${technicalRunId}-${factoryNumber}`
 */
export type SensorKey = `${Guid}-${string}`;

/**
 * Создать уникальный ключ для сенсоров устройства
 * @param technicalRunId - ID технического прогона
 * @param factoryNumber - заводской номер устройства
 * @returns уникальный ключ для хранения сенсоров
 */
export function createSensorKey(
    technicalRunId: Guid,
    factoryNumber: string
): SensorKey {
    return `${technicalRunId}-${factoryNumber}` as SensorKey;
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
    readonly currentDatabase: DatabaseDto | undefined;
    readonly openTabs: TechnicalRunTab[];
    readonly activeContextId: Guid | undefined;
    readonly sensorTabs: Record<Guid, SensorTabsState>;
    readonly selectedDeviceFactoryNumber: string | undefined;
    readonly expandedTechnicalRunIds: readonly Guid[];
    readonly expandedDeviceFactoryNumbers: readonly string[];
    readonly technicalRunsLoading: MiraxLoadingState;
    readonly devicesLoading: Record<string, MiraxLoadingState>;
    readonly sensorsLoading: Record<string, MiraxLoadingState>;

    readonly technicalRunsData: TechnicalRunDto[];
    readonly devicesByTechnicalRun: Record<Guid, PortableDeviceDto[]>;
    readonly sensorsBySensorKey: Record<SensorKey, SensorDto[]>; // key: `${technicalRunId}-${factoryNumber}`

    readonly defaultBaseTemplateId: Guid;
    readonly defaultSensorTemplateId: Guid;

    activeFactoryNumber?: string | undefined;
}

const initialLoadingState: MiraxLoadingState = {
    isLoading: false,
    progress: 0,
    error: undefined,
};

const initialState: MiraxState = {
    currentDatabase: undefined,
    openTabs: [],
    activeContextId: undefined,
    sensorTabs: {},
    selectedDeviceFactoryNumber: undefined,
    expandedTechnicalRunIds: [],
    expandedDeviceFactoryNumbers: [],
    technicalRunsLoading: initialLoadingState,
    devicesLoading: {},
    sensorsLoading: {},

    technicalRunsData: [],
    devicesByTechnicalRun: {},
    sensorsBySensorKey: {},

    defaultBaseTemplateId: ENV.MIRAX_DEFAULT_BASE_TEMPLATE_ID as Guid,
    defaultSensorTemplateId: ENV.MIRAX_DEFAULT_SENSOR_TEMPLATE_ID as Guid,

    activeFactoryNumber: undefined,
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
        setCurrentDatabase: (state, action: PayloadAction<DatabaseDto>) => {
            state.currentDatabase = action.payload;
            state.openTabs = [] as TechnicalRunTab[];
            state.activeContextId = undefined;
            state.sensorTabs = {};
            state.selectedDeviceFactoryNumber = undefined;
            state.expandedTechnicalRunIds = [];
            state.expandedDeviceFactoryNumbers = [];
            state.technicalRunsLoading = initialLoadingState;
            state.devicesLoading = {};
            state.sensorsLoading = {};
            state.technicalRunsData = [];
            state.devicesByTechnicalRun = {};
            state.sensorsBySensorKey = {};
        },

        clearDatabase: (state) => {
            state.currentDatabase = undefined;
            state.openTabs = [];
            state.activeContextId = undefined;
            state.sensorTabs = {};
            state.selectedDeviceFactoryNumber = undefined;
            state.expandedTechnicalRunIds = [];
            state.expandedDeviceFactoryNumbers = [];
            state.technicalRunsLoading = initialLoadingState;
            state.devicesLoading = {};
            state.sensorsLoading = {};
            state.technicalRunsData = [];
            state.devicesByTechnicalRun = {};
            state.sensorsBySensorKey = {};
        },

        setDefaultBaseTemplateId(state, action: PayloadAction<Guid>) {
            state.defaultBaseTemplateId = action.payload;
        },

        setDefaultSensorTemplateId(state, action: PayloadAction<Guid>) {
            state.defaultSensorTemplateId = action.payload;
        },

        setActiveFactoryNumber: (state, action: PayloadAction<string | undefined>) => {
            state.activeFactoryNumber = action.payload;
        },


        //Сохранение данных испытаний
        setTechnicalRunsData: (state, action: PayloadAction<TechnicalRunDto[]>) => {
            state.technicalRunsData = action.payload;
        },

        //Сохранение устройств для испытания
        setDevicesData: (
            state,
            action: PayloadAction<{
                readonly technicalRunId: Guid;
                readonly devices: PortableDeviceDto[];
            }>
        ) => {
            const { technicalRunId, devices } = action.payload;
            state.devicesByTechnicalRun[technicalRunId] = devices;
        },

        //  НОВОЕ - Сохранение сенсоров для устройства
        setSensorsData: (
            state,
            action: PayloadAction<{
                readonly technicalRunId: Guid;
                readonly factoryNumber: string;
                readonly sensors: SensorDto[];
            }>
        ) => {
            const { technicalRunId, factoryNumber, sensors } = action.payload;
            state.sensorsBySensorKey[createSensorKey(technicalRunId, factoryNumber)] = sensors;
        },

        openTechnicalRunTab: (state, action: PayloadAction<TechnicalRunTab>) => {
            const { id, name } = action.payload;
            const existingTab = state.openTabs.find((tab) => tab.id === id);

            if (existingTab) {
                state.activeContextId = id;
            } else {
                state.openTabs = [...state.openTabs, { id, name }];
                state.activeContextId = id;
                state.sensorTabs[id] = {
                    openTabs: [],
                    activeTabKey: undefined,
                };
            }

        },

        closeTechnicalRunTab: (state, action: PayloadAction<Guid>) => {
            const contextId = action.payload;
            const tabIndex = state.openTabs.findIndex((tab) => tab.id === contextId);

            if (tabIndex === -1) return;

            state.openTabs = state.openTabs.filter((tab) => tab.id !== contextId);

            if (state.activeContextId === contextId) {
                if (state.openTabs.length > 0) {
                    const newActiveIndex = Math.max(0, tabIndex - 1);
                    state.activeContextId = state.openTabs[newActiveIndex]?.id;
                } else {
                    state.activeContextId = undefined;
                }
            }

            delete state.sensorTabs[contextId];
            delete state.devicesLoading[contextId];

            state.expandedDeviceFactoryNumbers = [];
            state.selectedDeviceFactoryNumber = undefined;
        },

        setActiveTab: (state, action: PayloadAction<Guid>) => {
            const contextId = action.payload;
            if (state.openTabs.some((tab) => tab.id === contextId)) {
                state.activeContextId = contextId;
                state.selectedDeviceFactoryNumber = undefined;
            }
        },

        closeAllTabs: (state) => {
            state.openTabs = [];
            state.activeContextId = undefined;
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
    setCurrentDatabase,
    clearDatabase,
    setTechnicalRunsData,
    setDevicesData,
    setSensorsData,
    openTechnicalRunTab,
    setActiveFactoryNumber,
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

// Селекторы для данных
export const selectTechnicalRunsData = (state: RootState): readonly TechnicalRunDto[] =>
    state.mirax.technicalRunsData;

// Selectors
export const selectCurrentDatabase = (state: RootState): DatabaseDto | undefined =>
    state.mirax.currentDatabase;


export const selectOpenTabs = (state: RootState): readonly TechnicalRunTab[] =>
    state.mirax.openTabs;

export const selectActiveContextId = (state: RootState): Guid | undefined =>
    state.mirax.activeContextId;

export const selectHasOpenTabs = (state: RootState): boolean =>
    state.mirax.openTabs.length > 0;

export const selectIsTabOpen = (state: RootState, contextId: Guid): boolean =>
    state.mirax.openTabs.some((tab) => tab.id === contextId);

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

export const selectIsDeviceExpanded = (state: RootState, factoryNumber: string): boolean =>
    state.mirax.expandedDeviceFactoryNumbers.includes(factoryNumber);

export const selectMiraxState = (state: RootState): MiraxState => state.mirax;

/**
 * Выбранное (активное) испытание ID
 * Используется в TechnicalRunItem для определения, выбрано ли текущее испытание
 */
export const selectSelectedTechnicalRunId = (state: RootState): Guid | undefined =>
    state.mirax.activeContextId;

/**
 * Проверка, является ли испытание выбранным
 * Альтернативный селектор (если нужен)
 */
export const selectTechnicalRun = (state: RootState, technicalRunId: Guid): boolean =>
    state.mirax.activeContextId === technicalRunId;



// Заменить существующие селекторы на мемоизированные:

const initialLoadingStateConst: MiraxLoadingState = {
    isLoading: false,
    progress: 0,
    error: undefined,
};

export const selectTechnicalRunsLoading = (state: RootState): MiraxLoadingState =>
    state.mirax.technicalRunsLoading;

// Мемоизированный селектор для devicesLoading
export const selectDevicesLoading = createSelector(
    [
        (state: RootState) => state.mirax.devicesLoading,
        (_state: RootState, technicalRunId: Guid) => technicalRunId,
    ],
    (devicesLoading, technicalRunId) =>
        devicesLoading[technicalRunId] ?? initialLoadingStateConst
);

// Мемоизированный селектор для sensorsLoading
export const selectSensorsLoading = createSelector(
    [
        (state: RootState) => state.mirax.sensorsLoading,
        (_state: RootState, technicalRunId: Guid, factoryNumber: string) =>
            `${technicalRunId}-${factoryNumber}`,
    ],
    (sensorsLoading, key) => sensorsLoading[key] ?? initialLoadingStateConst
);

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


/**
 * Пустой массив для использования как fallback (чтобы не создавать новый при каждом вызове)
 */
const EMPTY_SENSORS_ARRAY: readonly SensorDto[] = [];
const EMPTY_DEVICES_ARRAY: readonly PortableDeviceDto[] = [];

/**
 * Получить данные сенсоров (мемоизированный)
 */
export const selectSensorsData = createSelector(
    [
        (state: RootState) => state.mirax.sensorsBySensorKey,
        (_state: RootState, technicalRunId: Guid, factoryNumber: string) =>
            createSensorKey(technicalRunId, factoryNumber),
    ],
    (sensorsByKey, key): readonly SensorDto[] =>
        sensorsByKey[key] ?? EMPTY_SENSORS_ARRAY
);

// ========================================================================
// ДОБАВИТЬ В КОНЕЦ ФАЙЛА (если ещё не добавлены)
// ========================================================================

/**
 * Получить испытание по ID (мемоизированный)
 */
export const selectTechnicalRunById = createSelector(
    [
        selectTechnicalRunsData,
        (_state: RootState, technicalRunId: Guid) => technicalRunId,
    ],
    (technicalRuns, technicalRunId): TechnicalRunDto | undefined =>
        technicalRuns.find((run) => run.id === technicalRunId)
);

/**
 * Получить активное испытание (текущая вкладка) (мемоизированный)
 */
export const selectActiveTechnicalRun = createSelector(
    [selectTechnicalRunsData, selectActiveContextId],
    (technicalRuns, activeContextId): TechnicalRunDto | undefined => {
        if (activeContextId === undefined) return undefined;
        return technicalRuns.find((run) => run.id === activeContextId);
    }
);

/**
 * Получить устройства для конкретного испытания по ID (мемоизированный)
 */
export const selectDevicesByTechnicalRunId = createSelector(
    [
        (state: RootState) => state.mirax.devicesByTechnicalRun,
        (_state: RootState, technicalRunId: Guid) => technicalRunId,
    ],
    (devicesByRun, technicalRunId): readonly PortableDeviceDto[] =>
        devicesByRun[technicalRunId] ?? EMPTY_DEVICES_ARRAY
);

/**
 * Получить устройства для активного испытания (мемоизированный)
 */
export const selectDevicesForActiveRun = createSelector(
    [
        (state: RootState) => state.mirax.devicesByTechnicalRun,
        selectActiveContextId,
    ],
    (devicesByRun, activeContextId): readonly PortableDeviceDto[] => {
        if (activeContextId === undefined) return EMPTY_DEVICES_ARRAY;
        return devicesByRun[activeContextId] ?? EMPTY_DEVICES_ARRAY;
    }
);

/**
 * Проверка, загружены ли устройства для испытания
 */
export const selectHasDevicesForRun = createSelector(
    [selectDevicesByTechnicalRunId],
    (devices): boolean => devices.length > 0
);

/**
 * Получить количество устройств для испытания
 */
export const selectDevicesCountForRun = createSelector(
    [selectDevicesByTechnicalRunId],
    (devices): number => devices.length
);

export const selectDefaultBaseTemplateId = (state: RootState): Guid =>
    state.mirax.defaultBaseTemplateId;

export const selectDefaultSensorTemplateId = (state: RootState): Guid =>
    state.mirax.defaultSensorTemplateId;

export const selectActiveFactoryNumber = (state: RootState): string | undefined =>
    state.mirax.activeFactoryNumber;


export const miraxReducer = miraxSlice.reducer;