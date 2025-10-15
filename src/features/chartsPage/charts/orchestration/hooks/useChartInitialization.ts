// ========== useChartInitialization.ts - ИСПРАВЛЕНИЕ ==========

import { useCallback, useEffect, useRef, useState } from 'react';
import { selectAllViews, selectTemplate } from '@chartsPage/charts/core/store/selectors/base.selectors';
import { fetchMultiSeriesInit } from '@chartsPage/charts/orchestration/thunks/initThunks';
import { InitializationService } from '@chartsPage/charts/orchestration/services/InitializationService';
import { useAppDispatch, useAppSelector } from '@/baseStore/hooks.ts';
import { selectBucketing } from '@chartsPage/charts/core/store/chartsSettingsSlice';
import { initialViews } from '@chartsPage/charts/core/store/chartsSlice';
import type { MultiSeriesResponse } from '@chartsPage/charts/core/dtos/responses/MultiSeriesResponse';
import type { GetMultiSeriesRequest } from '@chartsPage/charts/core/dtos/requests/GetMultiSeriesRequest';
import type { Guid } from '@app/lib/types/Guid';

interface InitState {
    readonly isInitializing: boolean;
    readonly isInitialized: boolean;
    readonly error: string | null;
}

interface UseChartInitializationParams {
    readonly contextId: Guid;
    readonly px: number | undefined;
}

interface UseChartInitializationResult extends InitState {
    readonly initialize: () => Promise<void>;
    readonly reinitialize: () => void;
}

/**
 * Проверка наличия данных для полей
 */
function hasExistingData(state: any, fieldNames: string[]): boolean {
    if (!state?.charts?.view) return false;

    let hasData = false;
    let totalBins = 0;

    for (const fieldName of fieldNames) {
        const fieldView = state.charts.view[fieldName];
        if (!fieldView?.seriesLevel) continue;

        for (const tiles of Object.values(fieldView.seriesLevel)) {
            const readyTiles = (tiles as any[]).filter(
                (t) => t.status === 'ready' && t.bins?.length > 0
            );
            if (readyTiles.length > 0) {
                hasData = true;
                totalBins += readyTiles.reduce((sum, t) => sum + (t.bins?.length || 0), 0);
            }
        }
    }

    if (hasData) {
        console.log(`[hasExistingData] Found existing data: ${totalBins} bins`);
    }

    return hasData;
}

export function useChartInitialization(
    params: UseChartInitializationParams
): UseChartInitializationResult {
    const dispatch = useAppDispatch();
    const template = useAppSelector((state) => selectTemplate(state, params.contextId));
    const bucketing = useAppSelector(selectBucketing);
    const chartsView = useAppSelector((state) => selectAllViews(state, params.contextId));

    const [state, setState] = useState<InitState>({
        isInitializing: false,
        isInitialized: false,
        error: null,
    });

    const initializationAttemptedRef = useRef(false);

    //  КРИТИЧНО: Ref для отслеживания активной инициализации
    const isInitializingRef = useRef(false);

    const initialize = useCallback(async (): Promise<void> => {
        //  Проверка: уже идёт инициализация
        if (isInitializingRef.current) {
            console.log('[useChartInitialization] Already initializing, skipping');
            return;
        }

        if (!template) {
            console.error('[useChartInitialization] Template is not set');
            setState((prev) => ({
                ...prev,
                error: 'Template is not set',
            }));
            return;
        }

        if (params.px === undefined) {
            console.warn('[useChartInitialization] px is not defined yet, waiting...');
            return;
        }

        if (initializationAttemptedRef.current) {
            console.log('[useChartInitialization] Already initialized, skipping');
            return;
        }

        // КРИТИЧНО: Проверяем наличие сохраненных данных
        const fieldNames = template.selectedFields.map((f) => f.name);
        const hasData = hasExistingData({ charts: { view: chartsView } }, fieldNames);

        if (hasData) {
            initializationAttemptedRef.current = true;
            setState({
                isInitializing: false,
                isInitialized: true,
                error: null,
            });

            dispatch(
                initialViews({
                    contextId: params.contextId,
                    px: params.px,
                    fields: template.selectedFields,
                })
            );

            return;
        }

        //  Устанавливаем флаг перед началом
        initializationAttemptedRef.current = true;
        isInitializingRef.current = true;

        setState({
            isInitializing: true,
            isInitialized: false,
            error: null,
        });

        try {
            dispatch(
                initialViews({
                    contextId: params.contextId,
                    px: params.px,
                    fields: template.selectedFields,
                })
            );

            const response: MultiSeriesResponse = await dispatch(
                fetchMultiSeriesInit({
                    data: {
                        template,
                        px: params.px,
                    } as GetMultiSeriesRequest,
                    contextId: params.contextId,
                })
            ).unwrap();

            InitializationService.processInitResponse({
                contextId: params.contextId,
                px: params.px,
                response: response,
                dispatch: dispatch,
                niceMilliseconds: bucketing.niceMilliseconds,
            });

            setState({
                isInitializing: false,
                isInitialized: true,
                error: null,
            });

            console.log('[useChartInitialization] Initialization complete');
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : 'Initialization failed';

            console.error('[useChartInitialization] Initialization failed:', error);

            setState({
                isInitializing: false,
                isInitialized: false,
                error: errorMessage,
            });
        } finally {
            //  Сбрасываем флаг после завершения
            isInitializingRef.current = false;
        }
    }, [dispatch, template, params.contextId, params.px, bucketing.niceMilliseconds, chartsView]);

    const reinitialize = useCallback((): void => {
        initializationAttemptedRef.current = false;
        isInitializingRef.current = false;
        setState({
            isInitializing: false,
            isInitialized: false,
            error: null,
        });
        void initialize();
    }, [initialize]);

    //  ИСПРАВЛЕНИЕ: Упрощённые зависимости + cleanup
    useEffect(() => {
        //  Добавляем флаг cancelled для cleanup
        let cancelled = false;

        const shouldInitialize =
            template &&
            params.px !== undefined &&
            !initializationAttemptedRef.current &&
            !state.isInitializing &&
            !state.isInitialized;

        if (shouldInitialize && !cancelled) {
            void initialize();
        }

        //  Cleanup при размонтировании
        return () => {
            cancelled = true;
        };
    }, [params.contextId, params.px]); // ← Минимальные зависимости!

    return {
        ...state,
        initialize,
        reinitialize,
    };
}