// src/baseStore/store.ts

import { configureStore } from '@reduxjs/toolkit';
import { persistStore } from 'redux-persist';
import { rootReducer } from './rootReducer';

import { authApi } from '@login/shared/api/authApi';
import { scenarioApi } from '@/features/scenarioEditor/shared/api/scenarioApi';
import { workflowApi } from '@/features/scenarioEditor/shared/api/workflowApi';
import { branchApi } from '@/features/scenarioEditor/shared/api/branchApi';
import { stepApi } from '@/features/scenarioEditor/shared/api/stepApi';
import { chartReqTemplatesApi } from '@chartsPage/template/shared//api/chartReqTemplatesApi.ts';
import { metadataApi } from '@chartsPage/metaData/shared/api/metadataApi.ts';
import { chartsApi } from '@chartsPage/charts/core/api/chartsApi.ts';
import { cleanupOldCharts } from '@chartsPage/charts/core/store/chartsCleanup.ts';
import { miraxApi } from '@chartsPage/mirax/miraxApi.ts';
import { historyMiddleware } from '@scenario/core/features/historySystem/historyMiddleware.ts';

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [
                    'persist/PERSIST',
                    'persist/REHYDRATE',
                    'persist/REGISTER',
                    // Игнорируем экшены с большими данными в charts
                    'charts/upsertTiles',
                    'charts/beginLoadTiles',
                    'charts/failLoadTiles',
                    'charts/test/initializeMultipleLevels/fulfilled',
                    'charts/test/incrementalLoad/fulfilled',
                    'charts/test/switchLevel/fulfilled',
                    'charts/test/loadingErrors/fulfilled',
                    'charts/test/fullSuite/fulfilled',
                    'charts/initField',
                    'charts/addData',
                    'charts/updateWindow',
                    // ⚡ История сценариев
                    'history/undoThunk/pending',
                    'history/undoThunk/fulfilled',
                    'history/redoThunk/pending',
                    'history/redoThunk/fulfilled',
                    'history/recordCreate',
                    'history/recordUpdate',
                    'history/recordDelete',
                ],
                ignoredPaths: [
                    'chartsTemplates.errors',
                    'chartsTemplates.activeTemplate.fromMs',
                    'chartsTemplates.activeTemplate.toMs',
                    'charts.view',
                    // ⚡ История может хранить большие снимки
                    'history.contexts',
                ],
                warnAfter: 128,
            },
            immutableCheck: {
                ignoredPaths: ['charts.view', 'history.contexts'],
                warnAfter: 128,
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
            miraxApi.middleware,
            // ⚡ КРИТИЧНО: middleware для undo/redo
            historyMiddleware,
        ),
    devTools: {
        maxAge: 50,
        trace: false,
        actionSanitizer: (action: any) => {
            // Очищаем большие массивы в charts
            if (action.type?.includes('charts/') && action.payload?.tiles) {
                return {
                    ...action,
                    payload: {
                        ...action.payload,
                        tiles: `[${action.payload.tiles.length} tiles]`,
                    },
                };
            }

            // ⚡ Очищаем снимки в истории для DevTools
            if (action.type?.includes('history/') && action.payload?.entity) {
                return {
                    ...action,
                    type: action.type,
                    payload: {
                        ...action.payload,
                        entity: '[Entity snapshot]',
                    },
                };
            }

            return action;
        },
        stateSanitizer: (state: any) => {
            const sanitized: any = { ...state };

            // Упрощаем charts для DevTools
            if (state.charts?.view) {
                const simplifiedView: any = {};
                Object.keys(state.charts.view).forEach((field) => {
                    const fieldView = state.charts.view[field];
                    simplifiedView[field] = {
                        ...fieldView,
                        seriesLevel: `[${Object.keys(fieldView.seriesLevel || {}).length} levels]`,
                    };
                });
                sanitized.charts = {
                    ...state.charts,
                    view: simplifiedView,
                };
            }

            // ⚡ Упрощаем историю для DevTools
            if (state.history?.contexts) {
                const simplifiedContexts: any = {};
                Object.keys(state.history.contexts).forEach((contextId) => {
                    const ctx = state.history.contexts[contextId];
                    simplifiedContexts[contextId] = {
                        pastCount: ctx.past?.length ?? 0,
                        futureCount: ctx.future?.length ?? 0,
                        isBatching: ctx.isBatching,
                        batchBufferCount: ctx.batchBuffer?.length ?? 0,
                    };
                });
                sanitized.history = {
                    contexts: simplifiedContexts,
                };
            }

            return sanitized;
        },
    },
});

cleanupOldCharts().catch(console.error);

export const persistor = persistStore(store);

/**
 * ВАЖНО: типы объявляем и экспортируем прямо из store.ts
 * — это единая «точка правды».
 */

// КРИТИЧЕСКИ ВАЖНО: экспортируем типы ПОСЛЕ создания store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;