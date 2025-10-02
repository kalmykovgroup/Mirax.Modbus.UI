// hooks/useChartInitialization.ts
// ХУК ИНИЦИАЛИЗАЦИИ: координирует загрузку и обработку при монтировании

import { useCallback, useEffect, useRef, useState } from 'react';

import { selectTemplate } from '@chartsPage/charts/core/store/selectors/base.selectors';
import {fetchMultiSeriesInit} from "@chartsPage/charts/orchestration/thunks/initThunks.ts";
import {InitializationService} from "@chartsPage/charts/orchestration/services/InitializationService.ts";
import {useAppDispatch, useAppSelector} from "@/store/hooks.ts";
import {selectBucketing} from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import {
    initialViews
} from "@chartsPage/charts/core/store/chartsSlice.ts";
import type {MultiSeriesResponse} from "@chartsPage/charts/core/dtos/responses/MultiSeriesResponse.ts";
import type {GetMultiSeriesRequest} from "@chartsPage/charts/core/dtos/requests/GetMultiSeriesRequest.ts";



// ============================================
// ТИПЫ
// ============================================

interface InitState {
    readonly isInitializing: boolean;
    readonly isInitialized: boolean;
    readonly error: string | null;
}

interface UseChartInitializationParams {
    readonly px: number | undefined; // undefined пока ширина не измерена
}

interface UseChartInitializationResult extends InitState {
    readonly initialize: () => Promise<void>;
    readonly reinitialize: () => void;
}

// ============================================
// ХУК
// ============================================


/**
 * Хук для инициализации графиков при монтировании компонента
 */
/**
 * Хук для инициализации графиков при монтировании компонента
 * Запускается автоматически после получения ширины контейнера (px)
 */
export function useChartInitialization(
    params: UseChartInitializationParams
): UseChartInitializationResult {
    const dispatch = useAppDispatch();
    const template = useAppSelector(selectTemplate);
    const bucketing = useAppSelector(selectBucketing);

    const [state, setState] = useState<InitState>({
        isInitializing: false,
        isInitialized: false,
        error: null
    });

    // Защита от повторной инициализации
    const initializationAttemptedRef = useRef(false);

    /**
     * Инициализация графиков
     */
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

        // Помечаем что начали инициализацию
        initializationAttemptedRef.current = true;

        setState({
            isInitializing: true,
            isInitialized: false,
            error: null
        });

        try {
            console.log('[useChartInitialization] Starting initialization with px:', params.px);

            dispatch(initialViews({px: params.px, fields: template.selectedFields}));


            // 1. Загружаем данные через thunk
            const response: MultiSeriesResponse = await dispatch(
                fetchMultiSeriesInit({
                    template,
                    from: template.from,
                    to: template.to,
                    px: params.px
                } satisfies GetMultiSeriesRequest)
            ).unwrap();


            // 2. Обрабатываем результат через сервис
            InitializationService.processInitResponse(
                {   px: params.px,
                    response: response,
                    dispatch: dispatch,
                    niceMilliseconds: bucketing.niceMilliseconds
                }
            );

            // Успех
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
    }, [dispatch, template, params.px]);

    /**
     * Переинициализация (сброс и повторная загрузка)
     */
    const reinitialize = useCallback((): void => {
        initializationAttemptedRef.current = false;
        setState({
            isInitializing: false,
            isInitialized: false,
            error: null
        });
        void initialize();
    }, [initialize]);

    /**
     * Автоматическая инициализация при получении всех необходимых данных:
     * - template установлен
     * - px определён (контейнер измерен)
     * - инициализация ещё не была запущена
     */
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