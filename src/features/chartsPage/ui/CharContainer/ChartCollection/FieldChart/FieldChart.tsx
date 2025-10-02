// charts/ui/CharContainer/ChartCollection/FieldChart/FieldChart.tsx

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { createChartOption } from './OptionECharts';
import {
    type FieldView,
    updateView,
    type TimeRange,
} from '@chartsPage/store/chartsSlice';
import {
    selectFieldStatsSafe,
    selectFieldView,
    selectFieldLoadingState,
    selectChartBucketingConfig,
    selectTimeSettings,
    selectOptimalFieldData
} from '@chartsPage/store/selectors';
import { calculateBucket } from '@chartsPage/store/chartsSettingsSlice';
import { fetchMultiSeriesRaw } from '@chartsPage/store/thunks';
import type { ResolvedCharReqTemplate } from "@chartsPage/template/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate.ts";
import ViewFieldChart from "@chartsPage/ui/CharContainer/ChartCollection/FieldChart/ViewFieldChart/ViewFieldChart.tsx";
import { formatBucketSize } from './utils';
import { debounce } from "lodash";
import type { FieldDto } from "@chartsPage/template/shared/contracts/metadata/Dtos/FieldDto.ts";
import type { GetMultiSeriesRequest } from "@chartsPage/template/shared/contracts/chart/Dtos/Requests_/GetMultiSeriesRequest.ts";
import type { ChartStats, LoadingState } from "@chartsPage/ui/CharContainer/types.ts";
import {dataProxyService} from "@chartsPage/store/DataProxyService.ts";
import {echartsDebugger} from "@chartsPage/ui/CharContainer/ChartCollection/FieldChart/EChartsDebugger.tsx";
import {requestManager} from "@chartsPage/store/RequestManager.ts";


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

    // Получаем имя поля как строку
    const fieldName = field.name;

    // Состояния и селекторы
    const view: FieldView | undefined = useAppSelector(state => selectFieldView(state, fieldName));

    const { data, quality, isLoading, isStale, coverage, sourceBucketMs } =
        useAppSelector(state => selectOptimalFieldData(state, fieldName));

    const fieldStats = useAppSelector(state => selectFieldStatsSafe(state, fieldName));
    const loadingState: LoadingState = useAppSelector(state => selectFieldLoadingState(state, fieldName));

    const chartInstanceRef = useRef<any>(null);
    const isAdjustingRangeRef = useRef(false);
    const lastRequestParamsRef = useRef<string>('');

    // Создаем дефолтный диапазон
    const getDefaultRange = useCallback((): TimeRange => {
        const now = Date.now();
        return {
            from: new Date(now - 24 * 60 * 60 * 1000),
            to: new Date(now)
        };
    }, []);


    const [visualRange, setVisualRange] = useState<TimeRange | undefined>(undefined);

    const [showMin, setShowMin] = React.useState(true);
    const [showMax, setShowMax] = React.useState(true);
    const [showArea, setShowArea] = React.useState(true);

    // Конфигурации
    const bucketingConfig = useAppSelector(selectChartBucketingConfig);
    const timeSettings = useAppSelector(selectTimeSettings);



    // Фиксированный домен из template
    const originalRange = useMemo((): TimeRange => {
        if (template.from && template.to) {
            return { from: template.from, to: template.to};
        }

        console.warn('Template does not contain valid dates, using default range');
        return getDefaultRange();
    }, [template.from, template.to, getDefaultRange]);

    // Загрузка данных при изменении параметров 7
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

    // В FieldChart.tsx, добавьте перед созданием chartOption:
    useEffect(() => {
        // Проверка согласованности данных
        if (data && data.length > 0 && view) {
            const firstPoint = data[0];
            const lastPoint = data[data.length - 1];

            echartsDebugger.log('DATA_CONSISTENCY_CHECK', {
                fieldName,
                dataLength: data.length,
                firstPoint: {
                    time: firstPoint?.t,
                    value: firstPoint?.avg
                },
                lastPoint: {
                    time: lastPoint?.t,
                    value: lastPoint?.avg
                },
                viewRange: {
                    from: view.currentRange?.from,
                    to: view.currentRange?.to
                },
                bucketMs: view.currentBucketsMs,
                quality,
                coverage
            });

            // Проверка на дубликаты времени
            const timeMap = new Map<number, number>();
            data.forEach((point, idx) => {
                const time = new Date(point.t).getTime();
                if (timeMap.has(time)) {
                    echartsDebugger.log('DATA_WARNING_DUPLICATE', {
                        fieldName,
                        duplicateTime: point.t,
                        firstIndex: timeMap.get(time),
                        secondIndex: idx
                    });
                }
                timeMap.set(time, idx);
            });
        }
    }, [data, view, fieldName, quality, coverage]);

    //Echats options

    // Ref для хранения предыдущего option
    const chartOptionRef = useRef<any>(null);
    const dataHashRef = useRef<string>('');

// Стабильная мемоизация данных
    const memoizedData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Создаем стабильный хеш
        const hash = `${data.length}_${data[0]?.t.getTime()}_${data[data.length - 1]?.t.getTime()}`;

        // Если данные не изменились - возвращаем предыдущую ссылку
        if (hash === dataHashRef.current && chartOptionRef.current) {
            return chartOptionRef.currentData || data;
        }

        dataHashRef.current = hash;
        return data;
    }, [data]);

// chartOption создается ТОЛЬКО когда данные реально изменились
    const chartOption = useMemo(() => {
        const effectiveRange = visualRange || view?.currentRange || originalRange;
        const opacity = isStale ? 0.7 : 1;
        const lineStyle = quality === 'exact'
            ? { width: 2.5 }
            : { width: 2, type: quality === 'interpolated' ? 'dashed' as const : 'solid' as const };

        const newOption = createChartOption({
            data: memoizedData,
            fieldName: fieldName,
            domain: originalRange,
            visibleRange: effectiveRange,
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

        // Сохраняем данные для следующего сравнения
        chartOptionRef.current = newOption;
        chartOptionRef.currentData = memoizedData;

        return newOption;
    }, [
        memoizedData, // ГЛАВНАЯ зависимость
        fieldName,
        originalRange,
        visualRange,
        view?.currentBucketsMs,
        quality,
        isStale,
        timeSettings.timeZone,
        timeSettings.useTimeZone,
        showMin,
        showMax,
        showArea,
    ]);

    //END ---- Echats options


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

    // FieldChart.tsx:276 (ПОЛНАЯ ЗАМЕНА)

    const previousRangeRef = useRef<TimeRange | undefined>(undefined);
    const activeTileRequestsRef = useRef<Set<string>>(new Set());

    const handleZoom = useCallback((params: any) => {
        const currentView = viewRef.current;

        if (isAdjustingRangeRef.current || !currentView) {
            console.warn("Пропускаем zoom - корректировка или нет view");
            return;
        }

        if (!chartInstanceRef.current?.getOption) {
            console.warn('График не готов для операции zoom');
            return;
        }

        // Валидация параметров (без изменений)
        if (!params || (params.start === undefined && params.end === undefined &&
            (!params.batch || params.batch.length === 0))) {
            console.warn('[handleZoom] Invalid zoom params:', params);
            return;
        }

        const currentOption = chartInstanceRef.current.getOption();
        if (!currentOption?.dataZoom || currentOption.dataZoom.length === 0) {
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
        const domainStart = originalRange.from.getTime();
        const domainEnd = originalRange.to.getTime();
        const domainSpan = domainEnd - domainStart;

        const newFrom = new Date(domainStart + (domainSpan * zoomStart / 100));
        const newTo = new Date(domainStart + (domainSpan * zoomEnd / 100));

        if (newTo.getTime() <= newFrom.getTime()) {
            console.warn('Защита от некорректных значений');
            return;
        }

        setVisualRange({ from: newFrom, to: newTo });

        if (!currentView.px) {
            console.error("view.px is undefined");
            return;
        }

        // Выбираем оптимальный bucket
        const newBucket = calculateBucket(
            newFrom,
            newTo,
            currentView.px,
            bucketingConfig.enableWeeklyMultiples,
            bucketingConfig.maxWeeksMultiple
        );

        const bucketChanged = currentView.currentBucketsMs !== newBucket;
        const effectiveBucket = bucketChanged ? newBucket : currentView.currentBucketsMs!;

        // КРИТИЧНО: Определяем tiles для загрузки
        const panStrategy = dataProxyService.determineTilesForPan(
            currentView.seriesLevel,
            effectiveBucket,
            { from: newFrom, to: newTo },
            previousRangeRef.current,
            0.3 // 30% prefetch
        );

        console.log(`[FieldChart ${fieldName}] Pan strategy:`, {
            bucketChanged,
            newBucket,
            effectiveBucket,
            needsLoading: panStrategy.needsLoading,
            direction: panStrategy.direction,
            tilesToLoad: panStrategy.tilesToLoad.map(t => ({
                reason: t.reason,
                range: `${new Date(t.fromMs).toISOString()} - ${new Date(t.toMs).toISOString()}`
            }))
        });

        // Обновляем previousRange для следующего вызова
        previousRangeRef.current = { from: newFrom, to: newTo };

        // ИСПРАВЛЕНИЕ: Обновляем view ВСЕГДА (даже если bucket не изменился)
        dispatch(updateView({
            field: fieldName,
            currentRange: { from: newFrom, to: newTo },
            ...(bucketChanged ? { currentBucketsMs: newBucket } : {})
        }));

        // Отменяем устаревшие prefetch-запросы при смене направления
        if (panStrategy.direction !== 'none') {
            requestManager.cancelFieldRequestsExceptDirection(
                fieldName,
                effectiveBucket,
                panStrategy.direction
            );
        }

        // Загружаем tiles если нужно
        if (panStrategy.needsLoading) {
            // ИСПРАВЛЕНИЕ: Сортируем tiles по priority (high сначала)
            const sortedTiles = [...panStrategy.tilesToLoad].sort((a, b) => {
                const priorityOrder = { high: 0, normal: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });

            sortedTiles.forEach((tile, index) => {
                const tileFrom = new Date(tile.fromMs);
                const tileTo = new Date(tile.toMs);

                const tileKey = `${fieldName}_${effectiveBucket}_${tile.fromMs}_${tile.toMs}_${tile.reason}`;

                if (activeTileRequestsRef.current.has(tileKey)) {
                    console.log(`[FieldChart ${fieldName}] Duplicate tile request prevented: ${tile.reason}`);
                    return;
                }

                activeTileRequestsRef.current.add(tileKey);

                const request: GetMultiSeriesRequest = {
                    template: template,
                    from: tileFrom,
                    to: tileTo,
                    px: containerWidth,
                    bucketMs: effectiveBucket,
                    // НОВОЕ: Добавляем metadata
                    metadata: {
                        reason: tile.reason,
                        priority: tile.priority
                    }
                };

                console.log(
                    `[FieldChart ${fieldName}] Loading tile #${index + 1}/${sortedTiles.length}:`,
                    `${tile.reason} (${tile.priority})`,
                    `range: ${tileFrom.toISOString()} - ${tileTo.toISOString()}`
                );

                dispatch(fetchMultiSeriesRaw({
                    request,
                    field,
                    skipCoverageCheck: true,
                    skipDebounce: tile.priority === 'high'
                }))
                    .unwrap()
                    .then(() => {
                        console.log(`[FieldChart ${fieldName}] Tile loaded: ${tile.reason}`);
                        activeTileRequestsRef.current.delete(tileKey);
                    })
                    .catch((error: any) => {
                        if (error.name !== 'AbortError') {
                            console.error(`[FieldChart ${fieldName}] Tile load error:`, error);
                        }
                        activeTileRequestsRef.current.delete(tileKey);
                    });
            });
        } else {
            console.log(`[FieldChart ${fieldName}] No loading needed - sufficient coverage`);
        }

    }, [
        field,
        fieldName,
        originalRange,
        dispatch,
        containerWidth,
        template,
        bucketingConfig
    ]);

    const debouncedHandleZoom = useMemo(
        () => debounce(handleZoom, 150),
        [handleZoom]
    );

    // Обработчик изменения размера
    const handleResize = useCallback((width: number) => {
        const currentView = viewRef.current;

        if (currentView?.currentRange && !isAdjustingRangeRef.current && currentView?.currentBucketsMs) {

            const optimalBucket = calculateBucket(
                currentView.currentRange.from,
                currentView.currentRange.to,
                width,
                bucketingConfig.enableWeeklyMultiples,
                bucketingConfig.maxWeeksMultiple
            );

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
        <>
            <ViewFieldChart
                originalRange={originalRange}
                visualRange={visualRange}
                setVisualRange={setVisualRange}
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
        </>
    );
};

export default React.memo(FieldChart, (prevProps, nextProps) => {

    return (
        prevProps.field.name === nextProps.field.name &&
        prevProps.containerWidth === nextProps.containerWidth &&
        prevProps.template === nextProps.template
    );
});