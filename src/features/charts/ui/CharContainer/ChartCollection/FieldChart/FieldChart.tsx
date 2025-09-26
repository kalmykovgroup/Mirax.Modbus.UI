import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { createChartOption } from './OptionECharts';
import {ensureView, updateCurrentRange, setCurrentBucketMs} from '@charts/store/chartsSlice';
import s from "./FieldChart.module.css"
import {
    selectFieldViewSafe,
    selectFieldDataSafe,
    selectFieldStatsSafe,
} from '@charts/store/selectors';
import { selectChartBucketingConfig, selectTimeSettings } from '@charts/store/chartsSettingsSlice';
import type { ResolvedCharReqTemplate } from "@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate.ts";
import type { ChartStats } from "@charts/ui/CharContainer/types/ChartStats.ts";
import type { ChartEvent } from "@charts/ui/CharContainer/types/ChartEvent.ts";
import ViewFieldChart from "@charts/ui/CharContainer/ChartCollection/FieldChart/ViewFieldChart/ViewFieldChart.tsx";
import { formatBucketSize, pickBucketMsFor } from './utils';
import {debounce} from "lodash";
import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";

interface Props {
    field: FieldDto;
    template: ResolvedCharReqTemplate;
    onEvent: (event: ChartEvent) => void;
    containerWidth?: number | undefined;
    containerHeight?: number | undefined;
}

const FieldChart: React.FC<Props> = ({
                                         field,
                                         template,
                                         onEvent,
                                         containerWidth = 1200,
                                         containerHeight = 400
                                     }) => {
    const dispatch = useAppDispatch();
    const isInitializedRef = useRef(false);
    const prevBucketRef = useRef<number | null>(null);
    const prevLoadingRef = useRef<boolean>(false);
    const chartInstanceRef = useRef<any>(null);

    // Для предотвращения дребезга при переключении уровней
    const lastSwitchRef = useRef<{ time: number; bucket: number } | null>(null);
    const zoomStateRef = useRef<{ start: number; end: number }>({ start: 0, end: 100 });

    // Получаем конфигурацию bucketing
    const ChartBucketingConfig = useAppSelector(selectChartBucketingConfig);

    // Получаем настройки временной зоны
    const timeSettings = useAppSelector(selectTimeSettings);

    // Используем безопасные селекторы
    const { view, isInitialized } = useAppSelector(selectFieldViewSafe(field.name));
    const { data, isEmpty } = useAppSelector(selectFieldDataSafe(field.name));


    useEffect(() => {
        if (view?.currentBucketsMs) {
            console.log(`[FieldChart ${field.name}] Data info:`, {
                currentBucketMs: view.currentBucketsMs,
                dataLength: data.length,
                availableLevels: Object.keys(view.seriesLevel || {}),
                currentLevelTiles: view.seriesLevel[view.currentBucketsMs]?.length || 0,
                tilesStatus: view.seriesLevel[view.currentBucketsMs]?.map(t => t.status) || []
            });
        }
    }, [field.name, view?.currentBucketsMs, data.length]);


    const fieldStats = useAppSelector(selectFieldStatsSafe(field.name));

    // ФИКСИРОВАННЫЙ домен из template - никогда не меняется
    const domain = useMemo(() => ({
        from: template.from,
        to: template.to
    }), [template.from, template.to]);

    // Инициализация view при первом рендере
    useEffect(() => {
        if (!isInitializedRef.current && template) {
            // Используем ФИКСИРОВАННЫЙ диапазон из template
            const from = template.from;
            const to = template.to;

            // Вычисляем оптимальный bucket для начального диапазона
            const initialBucket = pickBucketMsFor(
                containerWidth,
                from,
                to,
                ChartBucketingConfig
            );

            // Инициализируем view для поля
            // currentRange изначально равен полному диапазону
            dispatch(ensureView({
                field: field.name,
                px: containerWidth,
                currentRange: { from, to },
                currentBucketsMs: initialBucket
            }));

            isInitializedRef.current = true;
        }
    }, [dispatch, field, template, containerWidth, ChartBucketingConfig]);

    // Отслеживаем изменение уровня bucket
    useEffect(() => {
        if (view?.currentBucketsMs && prevBucketRef.current !== null) {
            if (view.currentBucketsMs !== prevBucketRef.current) {


                onEvent({
                    type: 'levelSwitch',
                    field: field,
                    timestamp: Date.now(),
                    payload: {
                        fromBucket: prevBucketRef.current,
                        toBucket: view.currentBucketsMs,
                        fromBucketFormatted: formatBucketSize(prevBucketRef.current),
                        toBucketFormatted: formatBucketSize(view.currentBucketsMs),
                        reason: 'auto'
                    }
                });

                // Обновляем историю переключений
                lastSwitchRef.current = {
                    time: Date.now(),
                    bucket: view.currentBucketsMs
                };
            }
        }

        prevBucketRef.current = view?.currentBucketsMs ?? null;
    }, [view?.currentBucketsMs, field, onEvent]);

    // Отслеживаем загрузку данных
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
    }, [fieldStats.loading, field, onEvent, view?.currentBucketsMs, view?.currentRange]);

    // Текущий видимый диапазон из view.currentRange
    const visibleRange = useMemo(() => {
        if (view?.currentRange) {
            // currentRange может выходить за пределы domain при панорамировании
            // но мы все равно используем его для правильной работы zoom
            return view.currentRange;
        }
        // По умолчанию показываем весь domain
        return domain;
    }, [view?.currentRange, domain]);

    // Опции для графика
    const chartOption = useMemo(() => {
        return createChartOption({
            data: data,
            fieldName: field.name,
            domain, // ФИКСИРОВАННЫЙ полный диапазон (для настройки осей)
            visibleRange, // Текущий видимый диапазон
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
        field,
        domain,
        visibleRange,
        view?.currentBucketsMs,
        timeSettings.timeZone,
        timeSettings.useTimeZone
    ]);

    // Статистика для UI
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
    }, [
        fieldStats,
        data,
        containerWidth,
        visibleRange,
        view?.currentBucketsMs
    ]);

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

    // УЛУЧШЕННЫЙ обработчик зума с привязкой к слайдеру
    const handleZoom = useCallback((params: any) => {

        let zoomStart = 0;
        let zoomEnd = 100;
        let newFrom: number;
        let newTo: number;

        // Извлекаем процентное положение слайдера
        if (params.batch && Array.isArray(params.batch)) {
            const zoomData = params.batch[0];
            if (zoomData) {
                // Приоритет - процентам, если они есть
                if (zoomData.start !== undefined && zoomData.end !== undefined) {
                    zoomStart = zoomData.start;
                    zoomEnd = zoomData.end;
                } else if (zoomData.startValue !== undefined && zoomData.endValue !== undefined) {
                    // Если есть абсолютные значения, конвертируем в проценты
                    const domainStart = domain.from.getTime();
                    const domainEnd = domain.to.getTime();
                    const domainSpan = domainEnd - domainStart;
                    zoomStart = ((zoomData.startValue - domainStart) / domainSpan) * 100;
                    zoomEnd = ((zoomData.endValue - domainStart) / domainSpan) * 100;
                }
            }
        } else if (params.start !== undefined && params.end !== undefined) {
            zoomStart = params.start;
            zoomEnd = params.end;
        } else if (params.startValue !== undefined && params.endValue !== undefined) {
            // Конвертируем абсолютные значения в проценты
            const domainStart = domain.from.getTime();
            const domainEnd = domain.to.getTime();
            const domainSpan = domainEnd - domainStart;
            zoomStart = ((params.startValue - domainStart) / domainSpan) * 100;
            zoomEnd = ((params.endValue - domainStart) / domainSpan) * 100;
        }

        // Сохраняем текущее состояние зума
        zoomStateRef.current = { start: zoomStart, end: zoomEnd };

        // Вычисляем абсолютные временные значения
        const domainStart = domain.from.getTime();
        const domainEnd = domain.to.getTime();
        const domainSpan = domainEnd - domainStart;

        newFrom = domainStart + (domainSpan * zoomStart / 100);
        newTo = domainStart + (domainSpan * zoomEnd / 100);

        // Вычисляем видимый процент от общего диапазона
        const visiblePercent = zoomEnd - zoomStart;


        const optimalBucket = pickBucketMsFor(
            containerWidth,
            new Date(newFrom),
            new Date(newTo),
            ChartBucketingConfig
        );

        const currentBucketMs = view?.currentBucketsMs ?? 3600000;

        // Проверяем необходимость смены уровня с гистерезисом
        let shouldSwitchLevel = false;

        if (optimalBucket !== currentBucketMs) {
            const now = Date.now();

            // Проверяем, прошло ли достаточно времени с последнего переключения
            if (lastSwitchRef.current) {
                const timeSinceLastSwitch = now - lastSwitchRef.current.time;

                // Минимум 300ms между переключениями для предотвращения дребезга
                if (timeSinceLastSwitch > 300) {
                    shouldSwitchLevel = true;
                } else {
                    console.log(`[FieldChart ${field.name}] Skipping switch due to debounce`, {
                        timeSinceLastSwitch,
                        lastBucket: lastSwitchRef.current.bucket,
                        optimalBucket
                    });
                }
            } else {
                // Первое переключение
                shouldSwitchLevel = true;
            }
        }

        // Переключаем уровень если необходимо
        if (shouldSwitchLevel) {
           dispatch(setCurrentBucketMs({
                field: field.name,
                bucketMs: optimalBucket
            }));
        }

        // Обновляем currentRange
        const newRange = {
            from: new Date(newFrom),
            to: new Date(newTo)
        };

        dispatch(updateCurrentRange({ field: field.name, range: newRange }));

        // Отправляем событие
        onEvent({
            type: 'zoom',
            field: field,
            timestamp: Date.now(),
            payload: {
                from: newFrom,
                to: newTo,
                zoomStart,
                zoomEnd,
                visiblePercent,
                needsLevelSwitch: shouldSwitchLevel,
                suggestedBucket: shouldSwitchLevel ? optimalBucket : undefined,
                currentBucket: currentBucketMs
            }
        });

    }, [field, onEvent, view?.currentBucketsMs, containerWidth, ChartBucketingConfig, domain, dispatch]);

    // Уменьшенный debounce для более отзывчивой работы
    const debouncedHandleZoom = useMemo(
        () => debounce(handleZoom, 30), // Уменьшено с 100ms до 30ms
        [handleZoom]
    );

    // Обработчик окончания зума (когда пользователь отпускает слайдер)
    const handleZoomEnd = useCallback(() => {

        // Можно выполнить финальную корректировку уровня здесь
        const { start, end } = zoomStateRef.current;
        const domainStart = domain.from.getTime();
        const domainEnd = domain.to.getTime();
        const domainSpan = domainEnd - domainStart;

        const finalFrom = domainStart + (domainSpan * start / 100);
        const finalTo = domainStart + (domainSpan * end / 100);

        // Финальная проверка оптимального bucket
        const finalOptimalBucket = pickBucketMsFor(
            containerWidth,
            new Date(finalFrom),
            new Date(finalTo),
            ChartBucketingConfig
        );

        const currentBucketMs = view?.currentBucketsMs ?? 3600000;

        if (finalOptimalBucket !== currentBucketMs) {


            dispatch(setCurrentBucketMs({
                field: field.name,
                bucketMs: finalOptimalBucket
            }));
        }
    }, [field, domain, containerWidth, ChartBucketingConfig, view?.currentBucketsMs, dispatch]);

    // Обработчик изменения размера
    const handleResize = useCallback((width: number, height: number) => {
        onEvent({
            type: 'resize',
            field: field,
            timestamp: Date.now(),
            payload: { width, height }
        });
    }, [field, onEvent]);

    // Обработчик brush
    const handleBrush = useCallback((params: any) => {
        onEvent({
            type: 'brush',
            field: field,
            timestamp: Date.now(),
            payload: params
        });
    }, [field, onEvent]);

    // Обработчик клика
    const handleClick = useCallback((params: any) => {
        onEvent({
            type: 'click',
            field: field,
            timestamp: Date.now(),
            payload: params
        });
    }, [field, onEvent]);

    // Отслеживаем ошибки
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

    // Определяем состояние загрузки и ошибки
    const isLoading = fieldStats.loading;

    // Логика определения сообщения об ошибке
    const getErrorMessage = (): string | undefined => {
        // Показываем ошибку только если есть явная ошибка от сервера
        if (fieldStats.error) {
            return fieldStats.error;
        }
        return undefined;
    };

    // Добавляем информационное сообщение вместо ошибки
    const getInfoMessage = (): string | undefined => {
        if (!isLoading && isEmpty && isInitialized) {
            return 'Нет данных для текущего уровня детализации';
        }
        return undefined;
    };

    const errorMessage = getErrorMessage();
    const infoMessage = getInfoMessage();
    const showLoading = isLoading || (!isInitialized && !errorMessage);

    if (!isInitialized && !showLoading) {
        return (
            <div className={s.initial}>
                <div>Инициализация графика для поля "{field.name}"...</div>
            </div>
        );
    }

    // ВАЖНО: Всегда рендерим ViewFieldChart, даже если нет данных
    // Это позволяет пользователю использовать zoom для возврата
    return (
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
            onZoomEnd={handleZoomEnd}
            onResize={handleResize}
            onBrush={handleBrush}
            onClick={handleClick}
        />
    );
};

export default FieldChart;