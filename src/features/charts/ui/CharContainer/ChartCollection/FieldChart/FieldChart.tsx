// charts/ui/CharContainer/ChartCollection/FieldChart/FieldChart.tsx

import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { createChartOption } from './OptionECharts';
import {
    type FieldView,
    updateView,
    type TimeRange,
} from '@charts/store/chartsSlice';
import {
    selectFieldStatsSafe,
    selectFieldView,
    selectFieldLoadingState,
    selectChartBucketingConfig,
    selectTimeSettings,
    selectOptimalFieldData
} from '@charts/store/selectors';
import { calculateBucket } from '@charts/store/chartsSettingsSlice';
import { fetchMultiSeriesRaw } from '@charts/store/thunks';
import type { ResolvedCharReqTemplate } from "@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate.ts";
import ViewFieldChart from "@charts/ui/CharContainer/ChartCollection/FieldChart/ViewFieldChart/ViewFieldChart.tsx";
import { calculateOptimalBucket, formatBucketSize } from './utils';
import { debounce } from "lodash";
import type { FieldDto } from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";
import type { GetMultiSeriesRequest } from "@charts/shared/contracts/chart/Dtos/Requests/GetMultiSeriesRequest.ts";
import type { ChartStats, LoadingState } from "@charts/ui/CharContainer/types.ts";
import {dataProxyService} from "@charts/store/DataProxyService.ts";

interface Props {
    field: FieldDto;
    template: ResolvedCharReqTemplate;
    containerWidth?: number | undefined;
}

const FieldChart: React.FC<Props> = ({
                                         field,
                                         template,
                                         containerWidth = 1200,
                                     }) => {
    const dispatch = useAppDispatch();
    const lastRequestRef = useRef<string>('');

    // Получаем имя поля как строку
    const fieldName = field.name;

    // Состояния и селекторы
    const view: FieldView | undefined = useAppSelector(state => selectFieldView(state, fieldName));
    const {
        data,
        quality,
        isLoading,
        isStale,
        coverage,
        sourceBucketMs
    } = useAppSelector(state => selectOptimalFieldData(state, fieldName));

    // Отладка данных из селектора
    useEffect(() => {
        console.log(`[FieldChart ${fieldName}] Data from selector:`, {
            dataLength: data?.length || 0,
            quality,
            isLoading,
            isStale,
            coverage,
            sourceBucketMs,
            firstPoint: data?.[0],
            lastPoint: data?.[data?.length - 1]
        });
    }, [data, quality, fieldName, isLoading, isStale, coverage, sourceBucketMs]);

    const fieldStats = useAppSelector(state => selectFieldStatsSafe(state, fieldName));
    const loadingState: LoadingState = useAppSelector(state => selectFieldLoadingState(state, fieldName));

    const chartInstanceRef = useRef<any>(null);
    const isAdjustingRangeRef = useRef(false);
    const lastRequestParamsRef = useRef<string>('');
    const maxBucketMsRef = useRef<number | null>(null);

    const [showMin, setShowMin] = React.useState(true);
    const [showMax, setShowMax] = React.useState(true);
    const [showArea, setShowArea] = React.useState(true);

    // Конфигурации
    const bucketingConfig = useAppSelector(selectChartBucketingConfig);
    const timeSettings = useAppSelector(selectTimeSettings);

    // Создаем дефолтный диапазон
    const getDefaultRange = useCallback((): TimeRange => {
        const now = Date.now();
        return {
            from: new Date(now - 24 * 60 * 60 * 1000),
            to: new Date(now)
        };
    }, []);

    // Фиксированный домен из template
    const originalRange = useMemo((): TimeRange => {
        if (template.from && template.to) {
            return { from: template.from, to: template.to};
        }

        console.warn('Template does not contain valid dates, using default range');
        return getDefaultRange();
    }, [template.from, template.to, getDefaultRange]);

    // Загрузка данных при изменении параметров
    // FieldChart.tsx - строки ~106-197
    useEffect(() => {
        if (!view?.currentRange || !view?.currentBucketsMs || !template) {
            console.log(`[FieldChart ${fieldName}] Skip load - missing required params`);
            return;
        }

        // Проверяем, нет ли активных загрузок для этого диапазона
        const tiles = view.seriesLevel[view.currentBucketsMs] || [];
        const hasLoadingTiles = dataProxyService.hasLoadingTilesInRange(
            tiles,
            {
                from: view.currentRange.from.getTime(),
                to: view.currentRange.to.getTime()
            }
        );

        if (hasLoadingTiles) {
            console.log(`[FieldChart ${fieldName}] Loading already in progress`);
            return;
        }

        // Формируем уникальный ключ запроса
        const requestKey = `${fieldName}_${view.currentBucketsMs}_${view.currentRange.from.getTime()}_${view.currentRange.to.getTime()}`;

        if (lastRequestParamsRef.current === requestKey) {
            console.log(`[FieldChart ${fieldName}] Request already sent`);
            return;
        }

        lastRequestParamsRef.current = requestKey;

        // Отправляем запрос - проверка покрытия будет в thunk
        const request: GetMultiSeriesRequest = {
            template: template,
            from: view.currentRange.from,
            to: view.currentRange.to,
            px: containerWidth,
            bucketMs: view.currentBucketsMs
        };

        console.log(`[FieldChart ${fieldName}] Loading data: bucket=${view.currentBucketsMs}ms`);

        dispatch(fetchMultiSeriesRaw({
            request,
            field,
            skipCoverageCheck: false // Thunk сам проверит
        }))
            .unwrap()
            .then(() => {
                console.log(`[FieldChart ${fieldName}] Data loaded successfully`);
            })
            .catch((error: any) => {
                if (error.name !== 'AbortError') {
                    console.error(`[FieldChart ${fieldName}] Load error:`, error);
                }
                lastRequestParamsRef.current = '';
            });

    }, [view?.currentRange, view?.currentBucketsMs, template, field, dispatch, containerWidth, fieldName]);


    // Текущий видимый диапазон
    const visibleRange = useMemo((): TimeRange => {
        if (view?.currentRange) {
            return { from: view.currentRange.from, to: view.currentRange.to };
        }
        return originalRange;
    }, [view?.currentRange, originalRange]);

    // Создание опций для графика
    const chartOption = useMemo(() => {
        // Отладка данных
        console.log(`[FieldChart ${fieldName}] Creating chart options:`, {
            dataLength: data.length,
            quality,
            isStale,
            currentBucketsMs: view?.currentBucketsMs,
            hasView: !!view,
            firstDataPoint: data[0],
            lastDataPoint: data[data.length - 1]
        });

        // Визуальные подсказки о качестве данных
        const opacity = isStale ? 0.7 : 1;
        const lineStyle = quality === 'exact'
            ? { width: 2.5 }
            : { width: 2, type: quality === 'interpolated' ? 'dashed' as const : 'solid' as const };

        return createChartOption({
            data: data,
            fieldName: fieldName,
            domain: originalRange,
            visibleRange: view?.currentRange || originalRange,
            bucketMs: view?.currentBucketsMs || 60000,
            theme: 'light',
            showMinimap: true,
            showMin: showMin,
            showMax: showMax,
            showArea: showArea,
            showDataGaps: quality === 'exact',
            opacity,
            lineStyle,
            timeZone: timeSettings.timeZone,
            useTimeZone: timeSettings.useTimeZone
        });
    }, [
        data,
        fieldName,
        originalRange,
        view?.currentRange,
        view?.currentBucketsMs,
        quality,
        isStale,
        timeSettings.timeZone,
        timeSettings.useTimeZone,
        showMin,
        showMax,
        showArea,
    ]);

    // Вычисление статистики
    const displayStats = useMemo((): ChartStats => {
        const visibleData = data.filter(bin => {
            const time = new Date(bin.t).getTime();
            const rangeFrom = new Date(visibleRange.from).getTime();
            const rangeTo = new Date(visibleRange.to).getTime();
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
    }, []);

    // Получаем доступные уровни
    const availableBuckets = useMemo(() => {
        if (!view?.seriesLevel) return [];
        return Object.keys(view.seriesLevel)
            .map(Number)
            .filter(n => !isNaN(n) && n > 0)
            .sort((a, b) => a - b);
    }, [view?.seriesLevel]);

    // Используем ref для хранения актуального view
    const viewRef = useRef(view);
    useEffect(() => {
        viewRef.current = view;
    }, [view]);

    // Обработчик зума с проверкой покрытия данными
    // Исправленный handleZoom в FieldChart.tsx (замените существующий)

    const handleZoom = useCallback((params: any) => {
        console.log(`[FieldChart ${fieldName}] Zoom event:`, params);

        const currentView = viewRef.current;

        if (isAdjustingRangeRef.current || !currentView) {
            console.warn("Пропускаем zoom - корректировка или нет view");
            return;
        }

        if (!chartInstanceRef.current || !chartInstanceRef.current.getOption) {
            console.warn('График не готов для операции zoom');
            return;
        }

        const currentOption = chartInstanceRef.current.getOption();
        if (!currentOption || !currentOption.dataZoom || currentOption.dataZoom.length === 0) {
            console.warn('DataZoom не инициализирован');
            return;
        }

        // Извлекаем проценты зума
        let zoomStart: number | null = null;
        let zoomEnd: number | null = null;

        if (params.batch && Array.isArray(params.batch)) {
            for (const item of params.batch) {
                if (item.start !== undefined && item.end !== undefined) {
                    zoomStart = item.start;
                    zoomEnd = item.end;
                    break;
                }
            }
        } else if (params.start !== undefined && params.end !== undefined) {
            zoomStart = params.start;
            zoomEnd = params.end;
        }

        if (zoomStart === null || zoomEnd === null) {
            console.warn('Нет zoom процентов в событии', params);
            return;
        }

        // Вычисляем новый диапазон
        const domainStart = new Date(originalRange.from).getTime();
        const domainEnd = new Date(originalRange.to).getTime();
        const domainSpan = domainEnd - domainStart;

        const newFrom = new Date(domainStart + (domainSpan * zoomStart / 100));
        const newTo = new Date(domainStart + (domainSpan * zoomEnd / 100));

        if (newTo.getTime() <= newFrom.getTime()) {
            console.warn('Защита от некорректных значений');
            return;
        }

        if (!currentView.px) {
            console.error("view.px is undefined");
            return;
        }

        // Выбираем оптимальный bucket
        const newBucket = calculateBucket(newFrom, newTo, currentView.px);

        // Проверяем изменения
        const bucketChanged = currentView.currentBucketsMs !== newBucket;
        const rangeChanged =
            Math.abs((currentView.currentRange?.from?.getTime() || 0) - newFrom.getTime()) > 1000 ||
            Math.abs((currentView.currentRange?.to?.getTime() || 0) - newTo.getTime()) > 1000;

        if (!rangeChanged && !bucketChanged) {
            console.log(`[FieldChart ${fieldName}] No changes, skipping`);
            return;
        }

        // Обновляем view
        dispatch(updateView({
            field: fieldName,
            currentRange: { from: newFrom, to: newTo },
            ...(bucketChanged ? { currentBucketsMs: newBucket } : {})
        }));


        // Проверяем активные загрузки
        const targetLevels = currentView.seriesLevel;
        const tiles = targetLevels[newBucket] || [];
        const hasLoadingTiles = dataProxyService.hasLoadingTilesInRange(
            tiles,
            { from: newFrom.getTime(), to: newTo.getTime() }
        );

        if (hasLoadingTiles) {
            console.log(`[FieldChart ${fieldName}] Loading already in progress for zoom`);
            return;
        }

        const request: GetMultiSeriesRequest = {
            template: template,
            from: newFrom,
            to: newTo,
            px: containerWidth,
            bucketMs: newBucket
        };

        // Проверяем дубликаты
        const requestKey = `${fieldName}_${newBucket}_${newFrom.getTime()}_${newTo.getTime()}`;

        if (lastRequestRef.current === requestKey) {
            console.log(`[FieldChart ${fieldName}] Duplicate zoom request prevented`);
            return;
        }

        lastRequestRef.current = requestKey;

        console.log(`[FieldChart ${fieldName}] Loading zoom data for bucket ${newBucket}ms`);

        dispatch(fetchMultiSeriesRaw({
            request,
            field,
            skipCoverageCheck: false // Для zoom всегда проверяем покрытие в thunk
        }))
            .unwrap()
            .then(() => {
                console.log(`[FieldChart ${fieldName}] Zoom data loaded`);
            })
            .catch((error: any) => {
                if (error.name !== 'AbortError') {
                    console.error(`[FieldChart ${fieldName}] Zoom load error:`, error);
                }
                lastRequestRef.current = '';
            });


    }, [field, fieldName, originalRange, dispatch, containerWidth, template]);


    const debouncedHandleZoom = useMemo(
        () => debounce(handleZoom, 150),
        [handleZoom]
    );

    // Обработчик изменения размера
    const handleResize = useCallback((width: number) => {
        const currentView = viewRef.current;

        if (currentView?.currentRange && !isAdjustingRangeRef.current && currentView?.currentBucketsMs) {
            const result = calculateOptimalBucket({
                containerWidthPx: width,
                from: currentView.currentRange.from,
                to: currentView.currentRange.to,
                config: bucketingConfig,
                maxBucketMs: maxBucketMsRef.current || undefined,
                availableBuckets: availableBuckets.length > 0 ? availableBuckets : undefined
            });

            const optimalBucket = result.selectedBucket;

            if (optimalBucket !== currentView.currentBucketsMs) {
                const ratio = optimalBucket / currentView.currentBucketsMs;
                if (ratio > 2 || ratio < 0.5) {
                    dispatch(updateView({
                        field: fieldName,
                        currentBucketsMs: optimalBucket,
                    }));
                }
            }
        }
    }, [fieldName, bucketingConfig, dispatch, availableBuckets]);

    // Остальные обработчики
    const handleBrush = useCallback((params: any) => {
        console.log('Brush event:', params);
    }, []);

    const handleClick = useCallback((params: any) => {
        console.log('Click event:', params);
    }, []);

    // Определение состояний для отображения
    const errorMessage = fieldStats.error;

    // Если view не инициализирован, показываем заглушку
    if (!view) {
        return <div>Инициализация графика...</div>;
    }

    return (
        <ViewFieldChart
            originalRange={originalRange}
            fieldName={fieldName}
            chartOption={chartOption}
            stats={displayStats}
            loadingState={loadingState}
            error={errorMessage}
            // Передаем данные о качестве
            dataQuality={quality}
            isStale={isStale}
            dataCoverage={coverage}
            sourceBucketMs={sourceBucketMs}
            targetBucketMs={view?.currentBucketsMs}

            onChartReady={handleChartReady}
            onZoom={debouncedHandleZoom}
            onResize={handleResize}
            onBrush={handleBrush}
            onClick={handleClick}

            showMin={showMin}
            showMax={showMax}
            showArea={showArea}

            setShowMin={setShowMin}
            setShowMax={setShowMax}
            setShowArea={setShowArea}
        />
    );
};

export default FieldChart;