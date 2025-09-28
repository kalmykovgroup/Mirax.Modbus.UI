// FieldChart.tsx - исправленная версия с правильной обработкой дат

import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { createChartOption } from './OptionECharts';
import {
    type FieldView,
    updateView,
    type TimeRange
} from '@charts/store/chartsSlice';
import {
    selectFieldDataSafe,
    selectFieldStatsSafe,
    selectFieldView,
    selectFieldLoadingState,
    selectChartBucketingConfig,
    selectTimeSettings
} from '@charts/store/selectors';
import {calculateBucket } from '@charts/store/chartsSettingsSlice';
import { fetchMultiSeriesRaw } from '@charts/store/thunks';
import type { ResolvedCharReqTemplate } from "@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate.ts";
import ViewFieldChart from "@charts/ui/CharContainer/ChartCollection/FieldChart/ViewFieldChart/ViewFieldChart.tsx";
import { calculateOptimalBucket, formatBucketSize} from './utils';
import { debounce } from "lodash";
import type { FieldDto } from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";
import type { GetMultiSeriesRequest } from "@charts/shared/contracts/chart/Dtos/Requests/GetMultiSeriesRequest.ts";
import type {ChartStats, LoadingState} from "@charts/ui/CharContainer/types.ts";
import {loadMissingData} from "@charts/ui/CharContainer/ChartCollection/loadMissingData.ts";

interface Props {
    field: FieldDto;
    template: ResolvedCharReqTemplate;
    containerWidth?: number | undefined;
    containerHeight?: number | undefined;
}

const FieldChart: React.FC<Props> = ({
                                         field,
                                         template,
                                         containerWidth = 1200,
                                     }) => {
    const dispatch = useAppDispatch();

    // Получаем имя поля как строку
    const fieldName = typeof field.name === 'string' ? field.name : String(field.name);

    const view: FieldView | undefined = useAppSelector(state => selectFieldView(state, fieldName));
    const directView = useAppSelector(state => state.charts.view[fieldName]);

    const { data } = useAppSelector(state => selectFieldDataSafe(state, fieldName));
    const fieldStats = useAppSelector(state => selectFieldStatsSafe(state, fieldName));
    const loadingState: LoadingState = useAppSelector(state => selectFieldLoadingState(state, fieldName));

    const chartInstanceRef = useRef<any>(null);
    const isAdjustingRangeRef = useRef(false);
    const lastRequestParamsRef = useRef<string>('');
    const maxBucketMsRef = useRef<number | null>(null);

    // Получаем конфигурации
    const bucketingConfig = useAppSelector(selectChartBucketingConfig);
    const timeSettings = useAppSelector(selectTimeSettings);

    // Создаем дефолтный диапазон, если template не содержит дат
    const getDefaultRange = useCallback((): TimeRange => {
        const now = Date.now();
        return {
            from: new Date(now - 24 * 60 * 60 * 1000), // последние 24 часа
            to: new Date(now)
        };
    }, []);

    // Фиксированный домен из template с проверкой на undefined
    const originalRange = useMemo((): TimeRange => {
        // Проверяем, что from и to существуют и являются валидными датами
        if (template.from && template.to) {
            // Если это уже Date объекты
            if (template.from instanceof Date && template.to instanceof Date) {
                return {
                    from: template.from,
                    to: template.to
                };
            }
            // Если это строки или числа, пробуем преобразовать
            try {
                const from = new Date(template.from);
                const to = new Date(template.to);

                // Проверяем валидность дат
                if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
                    return { from, to };
                }
            } catch (e) {
                console.error('Invalid date in template:', e);
            }
        }

        // Если нет валидных дат в template, возвращаем дефолтный диапазон
        console.warn('Template does not contain valid dates, using default range');
        return getDefaultRange();
    }, [template.from, template.to, getDefaultRange]);

    // Загрузка данных при изменении параметров
    useEffect(() => {
        if (!view?.currentRange || !view?.currentBucketsMs || !template) {
            return;
        }

        // Проверяем, нужны ли данные для текущего уровня
        const currentLevel = view.seriesLevel[view.currentBucketsMs];
        const hasData = currentLevel && currentLevel.some(tile => tile.status === 'ready');

        if (hasData) {
            return; // Данные уже есть
        }

        // Формируем уникальный ключ запроса
        const requestKey = `${fieldName}_${view.currentBucketsMs}_${view.currentRange.from.toISOString()}_${view.currentRange.to.toISOString()}`;

        if (lastRequestParamsRef.current === requestKey) {
            return; // Запрос уже отправлен
        }

        lastRequestParamsRef.current = requestKey;

        // Отправляем запрос
        const request: GetMultiSeriesRequest = {
            template: template,
            from: view.currentRange.from,
            to: view.currentRange.to,
            px: containerWidth,
            bucketMs: view.currentBucketsMs
        };

        dispatch(fetchMultiSeriesRaw({ request, field }));

    }, [view?.currentRange, view?.currentBucketsMs, template, field, dispatch, containerWidth]);

    // Текущий видимый диапазон
    const visibleRange = useMemo((): TimeRange => {
        if (view?.currentRange) {
            // Проверяем валидность currentRange
            const from = view.currentRange.from instanceof Date ?
                view.currentRange.from : new Date(view.currentRange.from);
            const to = view.currentRange.to instanceof Date ?
                view.currentRange.to : new Date(view.currentRange.to);

            if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
                return { from, to };
            }
        }
        return originalRange;
    }, [view?.currentRange, originalRange]);

    // Создание опций для графика с проверкой валидности дат
    const chartOption = useMemo(() => {
        // Дополнительная проверка перед вызовом createChartOption
        const validOriginalRange = {
            from: originalRange.from instanceof Date ? originalRange.from : new Date(originalRange.from),
            to: originalRange.to instanceof Date ? originalRange.to : new Date(originalRange.to)
        };

        const validVisibleRange = {
            from: visibleRange.from instanceof Date ? visibleRange.from : new Date(visibleRange.from),
            to: visibleRange.to instanceof Date ? visibleRange.to : new Date(visibleRange.to)
        };

        return createChartOption({
            data: data,
            fieldName: fieldName,
            domain: validOriginalRange,
            visibleRange: validVisibleRange,
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
        originalRange,
        visibleRange,
        view?.currentBucketsMs,
        timeSettings.timeZone,
        timeSettings.useTimeZone
    ]);

    // Вычисление статистики для отображения
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

    // Получаем доступные уровни из state
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

    // Обработчик зума - используем стабильную функцию без view в зависимостях
    const handleZoom = useCallback((params: any) => {
        const currentView = viewRef.current; // Получаем актуальное значение из ref

        if (isAdjustingRangeRef.current || !currentView) {
            console.warn("Пропускаем zoom - корректировка или нет view");
            return;
        }

        // Получаем текущую опцию чтобы сохранить zoom состояние
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

        // Вычисляем новый диапазон на основе domain
        const domainStart = new Date(originalRange.from).getTime();
        const domainEnd = new Date(originalRange.to).getTime();
        const domainSpan = domainEnd - domainStart;

        const newFrom = new Date(domainStart + (domainSpan * zoomStart / 100));
        const newTo = new Date(domainStart + (domainSpan * zoomEnd / 100));

        if (newTo.getTime() <= newFrom.getTime()) {
            console.warn('Защита от некорректных значений newTo <= newFrom');
            return;
        }

        console.log('Current view in handleZoom:', currentView);

        if(!currentView.px) {
            console.error("view.px is undefined in currentView");
            return;
        }

        // Выбираем оптимальный bucket для нового диапазона
        const newBucket = calculateBucket(newFrom, newTo, currentView.px);

        dispatch(updateView({
            field: fieldName,
            currentRange: { from: newFrom, to: newTo }
        }));

        // Уровень изменился
        if(currentView.currentBucketsMs !== newBucket){
            dispatch(loadMissingData({
                field: field,
                newRange : { from: newFrom, to: newTo },
                targetBucketMs: newBucket
            })).unwrap();

            dispatch(updateView({
                field: fieldName,
                currentBucketsMs: newBucket
            }));
        }

    }, [field, fieldName, originalRange, dispatch]); // Убрали view из зависимостей

    const debouncedHandleZoom = useMemo(
        () => debounce(handleZoom, 150),
        [handleZoom]
    );

    // Обработчик изменения размера
    const handleResize = useCallback((width: number) => {
        const currentView = viewRef.current; // Используем актуальное значение из ref

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
        <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <div>view.px: {view.px}</div>
            <div>directView.px: {directView?.px}</div>
            <ViewFieldChart
                originalRange={originalRange}
                fieldName={fieldName}
                chartOption={chartOption}
                stats={displayStats}
                loadingState={loadingState}
                error={errorMessage}
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