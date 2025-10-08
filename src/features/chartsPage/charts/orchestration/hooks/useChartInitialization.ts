import { useCallback, useEffect, useRef, useState } from 'react';
import { selectTemplate } from '@chartsPage/charts/core/store/selectors/base.selectors';
import { fetchMultiSeriesInit } from "@chartsPage/charts/orchestration/thunks/initThunks.ts";
import { InitializationService } from "@chartsPage/charts/orchestration/services/InitializationService.ts";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { selectBucketing } from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import { initialViews } from "@chartsPage/charts/core/store/chartsSlice.ts";
import type { MultiSeriesResponse } from "@chartsPage/charts/core/dtos/responses/MultiSeriesResponse.ts";
import type { GetMultiSeriesRequest } from "@chartsPage/charts/core/dtos/requests/GetMultiSeriesRequest.ts";

interface InitState {
    readonly isInitializing: boolean;
    readonly isInitialized: boolean;
    readonly error: string | null;
}

interface UseChartInitializationParams {
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

        // Проверяем наличие готовых tiles с данными
        for (const tiles of Object.values(fieldView.seriesLevel)) {
            const readyTiles = (tiles as any[]).filter(t => t.status === 'ready' && t.bins?.length > 0);
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

// В начале файла добавьте селектор
const selectChartsView = (state: any) => state.charts?.view;

export function useChartInitialization(
    params: UseChartInitializationParams
): UseChartInitializationResult {
    const dispatch = useAppDispatch();
    const template = useAppSelector(selectTemplate);
    const bucketing = useAppSelector(selectBucketing);

    // ИСПРАВЛЕНИЕ: используем специфичный селектор вместо state => state
    const chartsView = useAppSelector(selectChartsView);

    const [state, setState] = useState<InitState>({
        isInitializing: false,
        isInitialized: false,
        error: null
    });

    const initializationAttemptedRef = useRef(false);

    const initialize = useCallback(async (): Promise<void> => {
        if (!template) {
            console.error('[useChartInitialization] Template is not set');
            setState(prev => ({
                ...prev,
                error: 'Template is not set'
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
        const fieldNames = template.selectedFields.map(f => f.name);
        const hasData = hasExistingData({ charts: { view: chartsView } }, fieldNames);

        if (hasData) {
            initializationAttemptedRef.current = true;
            setState({
                isInitializing: false,
                isInitialized: true,
                error: null
            });

            // Инициализируем views если их нет (это safe, внутри проверка есть)
            dispatch(initialViews({ px: params.px, fields: template.selectedFields }));

            return;
        }

        initializationAttemptedRef.current = true;

        setState({
            isInitializing: true,
            isInitialized: false,
            error: null
        });

        try {
            dispatch(initialViews({ px: params.px, fields: template.selectedFields }));

            const response: MultiSeriesResponse = await dispatch(
                fetchMultiSeriesInit({
                    template,
                    px: params.px
                } as GetMultiSeriesRequest)
            ).unwrap();

            InitializationService.processInitResponse({
                px: params.px,
                response: response,
                dispatch: dispatch,
                niceMilliseconds: bucketing.niceMilliseconds
            });

            setState({
                isInitializing: false,
                isInitialized: true,
                error: null
            });

            console.log('[useChartInitialization] Initialization complete');

        } catch (error: unknown) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Initialization failed';

            console.error('[useChartInitialization] Initialization failed:', error);

            setState({
                isInitializing: false,
                isInitialized: false,
                error: errorMessage
            });
        }
    }, [dispatch, template, params.px, bucketing.niceMilliseconds, chartsView]);

    const reinitialize = useCallback((): void => {
        initializationAttemptedRef.current = false;
        setState({
            isInitializing: false,
            isInitialized: false,
            error: null
        });
        void initialize();
    }, [initialize]);

    useEffect(() => {
        if (
            template &&
            params.px !== undefined &&
            !initializationAttemptedRef.current &&
            !state.isInitializing &&
            !state.isInitialized
        ) {
            void initialize();
        }
    }, [template, params.px, state.isInitializing, state.isInitialized, initialize]);

    return {
        ...state,
        initialize,
        reinitialize
    };
}