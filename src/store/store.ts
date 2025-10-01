// store.ts - обновленная конфигурация
import { configureStore } from '@reduxjs/toolkit';
import { persistStore } from 'redux-persist';
import { rootReducer } from './rootReducer';

import { authApi } from '@login/shared/api/authApi';
import { scenarioApi } from '@/features/scenarioEditor/shared/api/scenarioApi';
import { workflowApi } from '@/features/scenarioEditor/shared/api/workflowApi';
import { branchApi } from '@/features/scenarioEditor/shared/api/branchApi';
import { stepApi } from '@/features/scenarioEditor/shared/api/stepApi';
import {chartReqTemplatesApi} from "@charts/template/shared/api/chartReqTemplatesApi.ts";
import {metadataApi} from "@charts/metaData/shared/api/metadataApi.ts";
import {chartsApi} from "@charts/charts/core/api/chartsApi.ts";

// НЕ используем types из других файлов, чтобы не создать цикл
type ReduxStore = ReturnType<typeof configureStore>;

function createAppStore(): ReduxStore {
    return configureStore({
        reducer: rootReducer,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: {
                    // Отключаем проверку для больших данных в charts
                    ignoredActions: [
                        'persist/PERSIST',
                        'persist/REHYDRATE',
                        'persist/REGISTER',
                        // Игнорируем экшены с большими данными
                        'charts/upsertTiles',
                        'charts/beginLoadTiles',
                        'charts/failLoadTiles',
                        'charts/test/initializeMultipleLevels/fulfilled',
                        'charts/test/incrementalLoad/fulfilled',
                        'charts/test/switchLevel/fulfilled',
                        'charts/test/loadingErrors/fulfilled',
                        'charts/test/fullSuite/fulfilled',
                        // Добавьте новые actions
                        'charts/initField',
                        'charts/addData',
                        'charts/updateWindow'
                    ],
                    ignoredPaths: [
                        'chartsTemplates.errors',
                        'chartsTemplates.activeTemplate.from',
                        'chartsTemplates.activeTemplate.to',
                        // Игнорируем пути с большими массивами данных
                        'charts.view',
                    ],
                    // Увеличиваем время предупреждения для больших состояний
                    warnAfter: 128, // вместо 32ms по умолчанию
                    isSerializable: (value: any) => {
                        if (value === undefined || value === null) return true;
                        if (value instanceof Date) return true;
                        const t = typeof value;
                        if (t === 'string' || t === 'number' || t === 'boolean') return true;
                        if (Array.isArray(value)) return value.every(v => typeof v !== 'function');
                        if (t === 'object') return Object.getPrototypeOf(value) === Object.prototype;
                        return false;
                    },
                },
                immutableCheck: {
                    // Отключаем проверку иммутабельности для больших данных
                    ignoredPaths: [
                        'charts.view',
                    ],
                    warnAfter: 128, // вместо 32ms
                },
            }).concat(
                authApi.middleware,
                scenarioApi.middleware,
                workflowApi.middleware,
                branchApi.middleware,
                stepApi.middleware,
                chartsApi.middleware,
                chartReqTemplatesApi.middleware,
                metadataApi.middleware,
            ),
        // Оптимизация для dev режима
        devTools: {
            // Ограничиваем историю действий для экономии памяти
            maxAge: 50, // хранить только последние 50 действий
            // Отключаем трассировку для производительности
            trace: false,
            // Ограничиваем глубину сериализации
            actionSanitizer: (action: any) => {
                // Очищаем большие массивы данных в действиях для DevTools
                if (action.type?.includes('charts/') && action.payload?.tiles) {
                    return {
                        ...action,
                        payload: {
                            ...action.payload,
                            tiles: `[${action.payload.tiles.length} tiles]`,
                        },
                    };
                }
                return action;
            },
            stateSanitizer: (state: any) => {
                // Упрощаем отображение больших данных в DevTools
                if (state.charts?.view) {
                    const simplifiedView: any = {};
                    Object.keys(state.charts.view).forEach(field => {
                        const fieldView = state.charts.view[field];
                        simplifiedView[field] = {
                            ...fieldView,
                            seriesLevel: `[${Object.keys(fieldView.seriesLevel || {}).length} levels]`,
                        };
                    });
                    return {
                        ...state,
                        charts: {
                            ...state.charts,
                            view: simplifiedView,
                        },
                    };
                }
                return state;
            },
        },
    });
}

export const store = createAppStore();
export const persistor = persistStore(store);

/**
 * ВАЖНО: типы объявляем и экспортируем прямо из store.ts
 * – это единая «точка правды».
 * В остальных файлах импортируйте их ТОЛЬКО как type-импорт:
 *   import type { RootState, AppDispatch } from '@/store/store';
 */
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;