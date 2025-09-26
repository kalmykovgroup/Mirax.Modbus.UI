// charts/ui/CharContainer/ChartCollection/FieldChart/FieldChart.tsx

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { createChartOption } from './OptionECharts';
import {
    ensureView,
    updateCurrentRange,
    setCurrentBucketMs,
    type TimeRange
} from '@charts/store/chartsSlice';
import s from "./FieldChart.module.css";
import {
    selectFieldViewSafe,
    selectFieldDataSafe,
    selectFieldStatsSafe,
} from '@charts/store/selectors';
import { selectChartBucketingConfig, selectTimeSettings } from '@charts/store/chartsSettingsSlice';
import { fetchMultiSeriesRaw } from '@charts/store/thunks';
import type { ResolvedCharReqTemplate } from "@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate.ts";
import type { ChartStats } from "@charts/ui/CharContainer/types/ChartStats.ts";
import type { ChartEvent } from "@charts/ui/CharContainer/types/ChartEvent.ts";
import ViewFieldChart from "@charts/ui/CharContainer/ChartCollection/FieldChart/ViewFieldChart/ViewFieldChart.tsx";
import {type BucketCalculationParams, calculateOptimalBucket, formatBucketSize} from './utils';
import { debounce } from "lodash";
import type { FieldDto } from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";
import type { GetMultiSeriesRequest } from "@charts/shared/contracts/chart/Dtos/Requests/GetMultiSeriesRequest.ts";

interface Props {
    field: FieldDto;
    template: ResolvedCharReqTemplate;
    onEvent: (event: ChartEvent) => void;
    containerWidth?: number | undefined;
    containerHeight?: number | undefined;
}

/**
 * Контейнерный компонент для управления данными и логикой графика поля
 */
const FieldChart: React.FC<Props> = ({
                                         field,
                                         template,
                                         onEvent,
                                         containerWidth = 1200,
                                         containerHeight = 400
                                     }) => {
    const dispatch = useAppDispatch();

    // Refs для отслеживания состояний
    const isInitializedRef = useRef(false);
    const prevLoadingRef = useRef<boolean>(false);
    const chartInstanceRef = useRef<any>(null);
    const loadingRequestRef = useRef<AbortController | null>(null);
    const isAdjustingRangeRef = useRef(false); // Флаг для предотвращения циклов
    const lastRequestParamsRef = useRef<string>(''); // Для отслеживания изменений параметров
    const maxBucketMsRef = useRef<number | null>(null); // Максимальный bucket от сервера

    // Получаем конфигурации
    const bucketingConfig = useAppSelector(selectChartBucketingConfig);
    const timeSettings = useAppSelector(selectTimeSettings);

    // Получаем состояние поля
    const { view, isInitialized } = useAppSelector(selectFieldViewSafe(field.name));
    const { data, isEmpty, hasReadyTiles } = useAppSelector(selectFieldDataSafe(field.name));
    const fieldStats = useAppSelector(selectFieldStatsSafe(field.name));

    // Фиксированный домен из template
    const domain = useMemo(() => ({
        from: template.from,
        to: template.to
    }), [template.from, template.to]);

    // Инициализация view при первом рендере
    useEffect(() => {
        if (!isInitializedRef.current && template) {
            // Используем новую функцию calculateOptimalBucket
            const result = calculateOptimalBucket({
                containerWidthPx: containerWidth,
                from: template.from,
                to: template.to,
                config: bucketingConfig,
                maxBucketMs: undefined,
                availableBuckets: undefined
            } as BucketCalculationParams);

            const initialBucket = result.selectedBucket;

            console.log('Initial bucket calculation:', {
                targetPoints: result.targetPoints,
                estimatedPoints: result.estimatedPoints,
                selectedBucket: formatBucketSize(initialBucket),
                reason: result.reason
            });

            // Сохраняем начальный bucket как максимальный
            maxBucketMsRef.current = initialBucket;

            dispatch(ensureView({
                field: field.name,
                px: containerWidth,
                currentRange: { from: template.from, to: template.to },
                currentBucketsMs: initialBucket
            }));

            isInitializedRef.current = true;
        }
    }, [dispatch, field.name, template, containerWidth, bucketingConfig]);

    // Загрузка данных при изменении параметров
    useEffect(() => {
        // Базовые проверки
        if (!view || !template || fieldStats.loading || isAdjustingRangeRef.current) {
            return;
        }

        // Проверяем, нужна ли загрузка данных
        const needsData = !hasReadyTiles || (isEmpty && !fieldStats.error);

        if (!needsData || !view.currentRange || !view.currentBucketsMs) {
            return;
        }

        // Создаём уникальный ключ для текущих параметров запроса
        const requestKey = `${view.currentRange.from.toISOString()}_${view.currentRange.to.toISOString()}_${view.currentBucketsMs}_${containerWidth}`;

        // Если параметры не изменились, не делаем запрос
        if (requestKey === lastRequestParamsRef.current) {
            return;
        }

        // Защита от слишком большого количества точек
        const rangeMs = view.currentRange.to.getTime() - view.currentRange.from.getTime();
        const estimatedPoints = rangeMs / view.currentBucketsMs;
        const MAX_POINTS = 5000; // Синхронизируем с utils.ts

        if (estimatedPoints > MAX_POINTS) {
            console.warn(`⚠️ Too many points requested: ${Math.floor(estimatedPoints)}. Adjusting range...`);

            // Устанавливаем флаг, чтобы предотвратить повторный вызов
            isAdjustingRangeRef.current = true;

            // Корректируем диапазон
            const maxRangeMs = view.currentBucketsMs * MAX_POINTS;
            const centerMs = (view.currentRange.from.getTime() + view.currentRange.to.getTime()) / 2;
            const adjustedFrom = new Date(Math.max(domain.from.getTime(), centerMs - maxRangeMs / 2));
            const adjustedTo = new Date(Math.min(domain.to.getTime(), centerMs + maxRangeMs / 2));

            // Обновляем диапазон
            dispatch(updateCurrentRange({
                field: field.name,
                range: { from: adjustedFrom, to: adjustedTo }
            }));

            // Сбрасываем флаг после задержки
            setTimeout(() => {
                isAdjustingRangeRef.current = false;
            }, 100);

            return;
        }

        // Сохраняем параметры текущего запроса
        lastRequestParamsRef.current = requestKey;

        // Отменяем предыдущий запрос
        if (loadingRequestRef.current) {
            loadingRequestRef.current.abort();
            loadingRequestRef.current = null;
        }

        // Создаём новый контроллер для отмены
        const abortController = new AbortController();
        loadingRequestRef.current = abortController;

        // Формируем запрос
        const request: GetMultiSeriesRequest = {
            template: template,
            from: view.currentRange.from,
            to: view.currentRange.to,
            px: containerWidth
        };

        // Запускаем загрузку с задержкой
        const timeoutId = setTimeout(() => {
            if (!abortController.signal.aborted && !isAdjustingRangeRef.current) {
                dispatch(fetchMultiSeriesRaw({
                    request,
                    field
                }));
            }
        }, 200);

        // Cleanup
        return () => {
            clearTimeout(timeoutId);
            if (loadingRequestRef.current === abortController) {
                abortController.abort();
                loadingRequestRef.current = null;
            }
        };
    }, [
        view,
        template,
        hasReadyTiles,
        isEmpty,
        fieldStats.loading,
        fieldStats.error,
        field.name,
        containerWidth,
        domain,
        dispatch
    ]);


    // Отслеживание начала загрузки
    useEffect(() => {
        const isLoading = fieldStats.loading;
        if (isLoading && !prevLoadingRef.current) {
            onEvent({
                type: 'dataRequest',
                field: field,
                timestamp: Date.now(),
                payload: {
                    bucketMs: view?.currentBucketsMs ?? 0,
                    range: view?.currentRange ? {
                        from: view.currentRange.from.getTime(),
                        to: view.currentRange.to.getTime()
                    } : null,
                    reason: 'loading'
                }
            });
        }
        prevLoadingRef.current = isLoading;
    }, [fieldStats.loading, field, onEvent, view]);

    // Текущий видимый диапазон
    const visibleRange = useMemo(() => {
        return view?.currentRange ?? domain;
    }, [view?.currentRange, domain]);

    // Создание опций для графика с контролируемым zoom
    const chartOption = useMemo(() => {
        return createChartOption({
            data: data,
            fieldName: field.name,
            domain,
            visibleRange: { from: visibleRange.from, to: visibleRange.to },
            bucketMs: view?.currentBucketsMs ?? 3600000,
            theme: 'light',
            showMinimap: true,
            showMinMaxArea: data.length > 0,
            showDataGaps: data.length > 0,
            timeZone: timeSettings.timeZone,
            useTimeZone: timeSettings.useTimeZone
        });
    }, [
        data,
        field.name,
        domain,
        visibleRange,
        view?.currentBucketsMs,
        timeSettings.timeZone,
        timeSettings.useTimeZone
    ]);

    // Вычисление статистики для отображения
    const displayStats = useMemo((): ChartStats => {
        const visibleData = data.filter(bin => {
            const time = bin.t.getTime();
            const rangeFrom = visibleRange.from.getTime();
            const rangeTo = visibleRange.to.getTime();
            return time >= rangeFrom && time <= rangeTo;
        });

        let quality: 'good' | 'medium' | 'poor' | undefined = undefined;
        if (fieldStats.coverage > 80) quality = 'good';
        else if (fieldStats.coverage > 50) quality = 'medium';
        else if (fieldStats.coverage > 0) quality = 'poor';

        return {
            totalPoints: fieldStats.totalPoints,
            coverage: fieldStats.coverage,
            density: containerWidth > 0 ? visibleData.length / containerWidth : 0,
            currentBucket: view?.currentBucketsMs
                ? formatBucketSize(view.currentBucketsMs)
                : 'N/A',
            visiblePoints: visibleData.length,
            gaps: fieldStats.gaps,
            quality
        };
    }, [fieldStats, data, containerWidth, visibleRange, view?.currentBucketsMs]);

    // Обработчик готовности графика
    const handleChartReady = useCallback((chart: any) => {
        chartInstanceRef.current = chart;
        onEvent({
            type: 'ready',
            field: field,
            timestamp: Date.now(),
            payload: { instance: chart }
        });
    }, [field, onEvent]);

    // Получаем доступные уровни из state
    const availableBuckets = useMemo(() => {
        if (!view?.seriesLevel) return [];
        return Object.keys(view.seriesLevel)
            .map(Number)
            .filter(n => !isNaN(n) && n > 0)
            .sort((a, b) => a - b);
    }, [view?.seriesLevel]);

    // Функция выбора оптимального bucket из доступных
    // FieldChart.tsx, строки 298-341

    const selectOptimalBucket = useCallback((from: Date, to: Date): number => {
        if (availableBuckets.length === 0) {
            // Используем новую функцию calculateOptimalBucket вместо устаревшей pickBucketMsFor
            const result = calculateOptimalBucket({
                containerWidthPx: containerWidth,
                from,
                to,
                config: bucketingConfig,
                maxBucketMs: maxBucketMsRef.current || undefined,
                availableBuckets: undefined
            } as BucketCalculationParams);

            console.log('Optimal bucket calculation (no levels):', {
                range: formatBucketSize(to.getTime() - from.getTime()),
                targetPoints: result.targetPoints,
                estimatedPoints: result.estimatedPoints,
                selected: formatBucketSize(result.selectedBucket),
                reason: result.reason
            });

            return result.selectedBucket;
        }

        const rangeMs = to.getTime() - from.getTime();
        const targetPointsPerPx = bucketingConfig.targetPointsPerPx || 0.1;
        const minTargetPoints = bucketingConfig.minTargetPoints || 20;
        const targetPoints = Math.max(
            minTargetPoints,
            Math.floor(containerWidth * targetPointsPerPx)
        );

        // Выбираем bucket из доступных
        let selectedBucket = availableBuckets[availableBuckets.length - 1]!;

        for (const bucketMs of availableBuckets) {
            const pointsCount = Math.floor(rangeMs / bucketMs);
            if (pointsCount <= targetPoints * 1.5) {
                selectedBucket = bucketMs;
                break;
            }
        }

        console.log('Select optimal bucket:', {
            range: formatBucketSize(rangeMs),
            targetPoints,
            availableBuckets: availableBuckets.map(b => formatBucketSize(b)),
            selected: formatBucketSize(selectedBucket)
        });

        return selectedBucket;
    }, [availableBuckets, containerWidth, bucketingConfig]);

    // Обработчик зума - упрощённая версия на основе процентов
    const handleZoom = useCallback((params: any) => {
        // Предотвращаем обработку во время корректировки
        if (isAdjustingRangeRef.current) {
            console.warn("Предотвращаем обработку во время корректировки")
            return;
        }

        // НОВАЯ ЗАЩИТА: Проверяем готовность графика
        if (!chartInstanceRef.current || !chartInstanceRef.current.getOption) {
            console.warn('График не готов для операции zoom');
            return;
        }

        // Проверяем наличие dataZoom в опциях
        const currentOption = chartInstanceRef.current.getOption();
        if (!currentOption || !currentOption.dataZoom || currentOption.dataZoom.length === 0) {
            console.warn('DataZoom не инициализирован');
            return;
        }

        let zoomStart: number | null = null;
        let zoomEnd: number | null = null;

        // Извлекаем проценты из события
        if (params.batch && Array.isArray(params.batch)) {
            // Обработка батча событий (от inside zoom и slider)
            for (const item of params.batch) {
                if (item.start !== undefined && item.end !== undefined) {
                    zoomStart = item.start;
                    zoomEnd = item.end;
                    break;
                }
            }
        } else if (params.start !== undefined && params.end !== undefined) {
            // Прямые значения start/end (от slider)
            zoomStart = params.start;
            zoomEnd = params.end;
        }

        // Если не получили проценты, выходим
        if (zoomStart === null || zoomEnd === null) {
            console.warn('No zoom percentages in event', params);
            return;
        }

        // Вычисляем видимый диапазон на основе процентов от домена
        const domainStart = domain.from.getTime();
        const domainEnd = domain.to.getTime();
        const domainSpan = domainEnd - domainStart;

        const newFrom = domainStart + (domainSpan * zoomStart / 100);
        const newTo = domainStart + (domainSpan * zoomEnd / 100);

        // Защита от некорректных значений
        if (newTo <= newFrom) {
            console.warn('Защита от некорректных значений newTo <= newFrom', newTo, newFrom);
            return;
        }

        // Создаём новый диапазон
        const newRange: TimeRange = {
            from: new Date(newFrom),
            to: new Date(newTo)
        };


            // Выбираем оптимальный bucket из доступных уровней
            const optimalBucket = selectOptimalBucket(newRange.from, newRange.to);
            console.log("optimalBucket", optimalBucket);




        const currentBucketMs = view?.currentBucketsMs ?? 60000;

        // Обновляем bucket если изменился
        if (optimalBucket !== currentBucketMs) {
            console.log("update ptimalBucket", optimalBucket);
            dispatch(setCurrentBucketMs({
                field: field.name,
                bucketMs: optimalBucket
            }));
        }else{
            console.log("Не обновили", view?.currentBucketsMs, currentBucketMs)
        }

        // Обновляем диапазон
        dispatch(updateCurrentRange({
            field: field.name,
            range: newRange
        }));

        // Отправляем событие zoom
        onEvent({
            type: 'zoom',
            field: field,
            timestamp: Date.now(),
            payload: {
                from: newFrom,
                to: newTo,
                zoomStart,
                zoomEnd,
                visiblePercent: zoomEnd - zoomStart
            }
        });
    }, [field, onEvent, view?.currentBucketsMs, domain, dispatch, selectOptimalBucket]);
    // Debounced версия
    const debouncedHandleZoom = useMemo(
        () => debounce(handleZoom, 150),
        [handleZoom]
    );

    // Обработчик изменения размера
    const handleResize = useCallback((width: number, height: number) => {
        if (view?.currentRange && !isAdjustingRangeRef.current) {
            // Используем новую функцию calculateOptimalBucket
            const result = calculateOptimalBucket({
                containerWidthPx: width,
                from: view.currentRange.from,
                to: view.currentRange.to,
                config: bucketingConfig,
                maxBucketMs: maxBucketMsRef.current || undefined,
                availableBuckets: availableBuckets.length > 0 ? availableBuckets : undefined
            });

            const optimalBucket = result.selectedBucket;

            if (optimalBucket !== view.currentBucketsMs) {
                const ratio = optimalBucket / view.currentBucketsMs;
                if (ratio > 2 || ratio < 0.5) {
                    console.log('Resize bucket switch:', {
                        from: formatBucketSize(view.currentBucketsMs),
                        to: formatBucketSize(optimalBucket),
                        ratio: ratio.toFixed(2),
                        reason: result.reason
                    });

                    dispatch(setCurrentBucketMs({
                        field: field.name,
                        bucketMs: optimalBucket
                    }));
                }
            }
        }

        onEvent({
            type: 'resize',
            field: field,
            timestamp: Date.now(),
            payload: { width, height }
        });
    }, [field, onEvent, view, bucketingConfig, dispatch, availableBuckets]);

    // Остальные обработчики
    const handleBrush = useCallback((params: any) => {
        onEvent({
            type: 'brush',
            field: field,
            timestamp: Date.now(),
            payload: params
        });
    }, [field, onEvent]);

    const handleClick = useCallback((params: any) => {
        onEvent({
            type: 'click',
            field: field,
            timestamp: Date.now(),
            payload: params
        });
    }, [field, onEvent]);

    // Отслеживание ошибок
    useEffect(() => {
        if (fieldStats.error) {
            onEvent({
                type: 'error',
                field: field,
                timestamp: Date.now(),
                payload: { message: fieldStats.error }
            });
        }
    }, [fieldStats.error, field, onEvent]);

    // Определение состояний для отображения
    const isLoading = fieldStats.loading;
    const errorMessage = fieldStats.error;
    const infoMessage = !isLoading && isEmpty && isInitialized
        ? 'Нет данных для текущего уровня детализации'
        : undefined;
    const showLoading = isLoading || (!isInitialized && !errorMessage);

    // Пре-рендер для неинициализированного состояния
    if (!isInitialized && !showLoading) {
        return (
            <div className={s.initial}>
                <div>Инициализация графика для поля "{field.name}"...</div>
            </div>
        );
    }

    return (
        <div>
            currentBucketMs:{view?.currentBucketsMs} <br/>
            visibleRange from:{visibleRange.from.toISOString()} <br/>
            visibleRange to:{visibleRange.to.toISOString()}

            <ViewFieldChart
                domain={domain}
                height={containerHeight}
                fieldName={field.name}
                chartOption={chartOption}
                stats={displayStats}
                loading={showLoading}
                error={errorMessage}
                info={infoMessage}
                onChartReady={handleChartReady}
                onZoom={debouncedHandleZoom}
                onResize={handleResize}
                onBrush={handleBrush}
                onClick={handleClick}
            />
        </div>
    );
};

export default FieldChart;