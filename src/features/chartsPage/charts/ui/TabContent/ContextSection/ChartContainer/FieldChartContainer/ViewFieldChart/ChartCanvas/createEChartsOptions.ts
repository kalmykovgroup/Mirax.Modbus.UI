import {
    type EChartsPoint,
} from "@chartsPage/charts/core/store/selectors/visualization.selectors.ts";
import type {GapsInfo, OriginalRange} from "@chartsPage/charts/core/store/types/chart.types.ts";
import type {TimeSettings} from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import type {EChartsOption, LineSeriesOption, MarkAreaComponentOption} from "echarts";
import {formatDateWithTimezone} from "@chartsPage/charts/ui/TimeZonePicker/timezoneUtils.ts";
import type {
    YAxisRange
} from "@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/ChartCanvas/YAxisControls/useYAxisRange.ts";


interface AnimationConfig {
    readonly enabled: boolean;
    readonly duration: number;
    readonly easing: string;
    readonly staggerPoints: boolean;
    readonly updateDuration: number;
}

const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
    enabled: false,
    duration: 800,
    easing: 'cubicOut',
    staggerPoints: true,
    updateDuration: 200
};

export interface CreateOptionsParams {
    avgPoints: EChartsPoint[];
    minPoints: EChartsPoint[];
    maxPoints: EChartsPoint[];
    readonly fieldName: string;
    readonly originalRange: OriginalRange | undefined;
    readonly timeSettings: TimeSettings;
    readonly gapsInfo?: GapsInfo | undefined;
    readonly isZoomOnMouseWheelKeyCtrl?: boolean | undefined;
    readonly isEmphasis?: boolean | undefined;
    readonly animationConfig?: AnimationConfig | undefined;
    readonly customYAxisRange?: YAxisRange | undefined;
}

interface YAxisBounds {
    readonly min: number;
    readonly max: number;
}

/**
 * Вычисляет оптимальные границы Y-оси с учётом:
 * - Погрешности плавающей точки
 * - Масштаба значений (микро/милли/единицы/тысячи)
 * - Одинаковых или близких значений
 * - Пользовательских настроек
 */
function calculateYAxisBounds(
    points: readonly EChartsPoint[],
    customRange: YAxisRange | undefined
): YAxisBounds {
    // Собираем все конечные значения
    const finiteValues: number[] = [];

    for (const point of points) {
        const value = point[1];
        if (Number.isFinite(value)) {
            finiteValues.push(value);
        }
    }

    // Если нет данных - дефолтные границы
    if (finiteValues.length === 0) {
        return {
            min: customRange?.min ?? 0,
            max: customRange?.max ?? 100
        };
    }

    // Находим min/max и вычисляем статистику
    let dataMin = Number.POSITIVE_INFINITY;
    let dataMax = Number.NEGATIVE_INFINITY;

    for (const value of finiteValues) {
        if (value < dataMin) dataMin = value;
        if (value > dataMax) dataMax = value;
    }

    const range = dataMax - dataMin;
    const absMax = Math.max(Math.abs(dataMin), Math.abs(dataMax));

    // Вычисляем среднее и стандартное отклонение для анализа разброса
    const mean = finiteValues.reduce((sum, v) => sum + v, 0) / finiteValues.length;
    const variance = finiteValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / finiteValues.length;
    const stdDev = Math.sqrt(variance);

    // Относительная толерантность с учётом погрешности float
    const tolerance = Math.max(absMax * 1e-10, 1e-10);

    // Проверяем, насколько значимый разброс данных
    const isEffectivelyConstant = range < tolerance || stdDev < tolerance;

    let yMin: number;
    let yMax: number;

    if (isEffectivelyConstant) {
        // ============================================
        // СЛУЧАЙ 1: Все значения практически одинаковые
        // ============================================
        const centerValue = mean;
        const absMean = Math.abs(centerValue);

        // Определяем зазор на основе порядка величины
        const orderOfMagnitude = absMean > 0
            ? Math.floor(Math.log10(absMean))
            : 0;

        let delta: number;

        if (absMean < 1e-10) {
            // Практически ноль
            delta = 1;
        } else if (absMean < 1e-6) {
            // Микро-значения: 10^-6 ... 10^-10
            delta = Math.pow(10, orderOfMagnitude - 1);
        } else if (absMean < 1e-3) {
            // Милли-значения: 10^-3 ... 10^-6
            delta = Math.pow(10, orderOfMagnitude - 1);
        } else if (absMean < 1) {
            // Дробные: 0.001 ... 1
            delta = Math.max(0.1, Math.pow(10, orderOfMagnitude - 1));
        } else if (absMean < 100) {
            // Обычные значения: 1 ... 100
            // Для 20.9 → orderOfMagnitude = 1 → delta = 2
            delta = Math.max(1, Math.pow(10, orderOfMagnitude - 1) * 2);
        } else {
            // Большие значения >= 100
            delta = Math.pow(10, orderOfMagnitude - 1) * 5;
        }

        // Создаём симметричный диапазон
        yMin = centerValue - delta;
        yMax = centerValue + delta;

        console.log('[calculateYAxisBounds] Константные значения:', {
            centerValue,
            absMean,
            orderOfMagnitude,
            delta,
            bounds: { min: yMin, max: yMax }
        });

    } else {
        // ============================================
        // СЛУЧАЙ 2: Есть значимый разброс данных
        // ============================================

        // Используем std для определения "умного" padding
        const isLowVariance = stdDev < absMax * 0.05; // < 5% от макс. значения

        let paddingFactor: number;

        if (isLowVariance) {
            // Малая вариация - больший padding для удобства скролла
            paddingFactor = 0.15; // 15%
        } else if (absMax < 1e-3) {
            // Милли-значения
            paddingFactor = 0.25; // 25%
        } else if (absMax < 1) {
            // Дробные
            paddingFactor = 0.15; // 15%
        } else {
            // Обычные значения
            paddingFactor = 0.10; // 10%
        }

        // Два подхода к padding - выбираем больший
        const stdPadding = stdDev * 0.5; // Половина стандартного отклонения
        const rangePadding = range * paddingFactor;
        const padding = Math.max(stdPadding, rangePadding);

        yMin = dataMin - padding;
        yMax = dataMax + padding;

        // Округление границ для "красивых" чисел (опционально)
        const roundToNice = (value: number): number => {
            if (Math.abs(value) < 1e-6) return value;

            const absValue = Math.abs(value);
            const orderOfMagnitude = Math.floor(Math.log10(absValue));
            const powerOf10 = Math.pow(10, orderOfMagnitude - 1);

            return Math.round(value / powerOf10) * powerOf10;
        };

        // Округляем только если это улучшит читаемость
        if (absMax >= 10) {
            yMin = roundToNice(yMin);
            yMax = roundToNice(yMax);
        }

        console.log('[calculateYAxisBounds] Переменные данные:', {
            dataMin,
            dataMax,
            mean,
            stdDev,
            padding,
            bounds: { min: yMin, max: yMax }
        });
    }

    // Финальная проверка минимального зазора для скролла
    const finalRange = yMax - yMin;
    const minRequiredRange = Math.max(absMax * 0.05, 1e-6); // Минимум 5%

    if (finalRange < minRequiredRange) {
        const center = (yMin + yMax) / 2;
        const halfRange = minRequiredRange / 2;
        yMin = center - halfRange;
        yMax = center + halfRange;

        console.log('[calculateYAxisBounds] Применён минимальный зазор:', {
            minRequiredRange,
            adjustedBounds: { min: yMin, max: yMax }
        });
    }

    // Применяем пользовательские границы (они имеют приоритет)
    const finalMin = customRange?.min ?? yMin;
    const finalMax = customRange?.max ?? yMax;

    // Защита от некорректных границ
    if (finalMax <= finalMin) {
        console.error('[calculateYAxisBounds] Некорректные границы:', { finalMin, finalMax });
        const corrected = finalMin + Math.max(1, absMax * 0.1);
        return { min: finalMin, max: corrected };
    }

    return { min: finalMin, max: finalMax };
}


export function createOptions(params: CreateOptionsParams): EChartsOption {
    const {
        avgPoints,
        minPoints,
        maxPoints,
        fieldName,
        originalRange,
        timeSettings,
        gapsInfo,
        isZoomOnMouseWheelKeyCtrl = true,
        isEmphasis = false,
        animationConfig = DEFAULT_ANIMATION_CONFIG,
        customYAxisRange
    } = params;

    if (avgPoints.length === 0) {
        return {
            title: { text: fieldName, left: 'center' },
            xAxis: { type: 'time' },
            yAxis: { type: 'value' },
            series: []
        };
    }

    const xAxisMin = originalRange?.fromMs;
    const xAxisMax = originalRange?.toMs;
    const symbolSize = avgPoints.length < 50 ? 6 : 4;
    const shouldAnimate = animationConfig.enabled && avgPoints.length < 2000;

    // ============================================
    // РАСЧЁТ ГРАНИЦ Y-ОСИ
    // ============================================
    const yAxisBounds = calculateYAxisBounds(avgPoints, customYAxisRange);
    const yMin = yAxisBounds.min;
    const yMax = yAxisBounds.max;

    const series: LineSeriesOption[] = [];

    // Область min-max БЕЗ stack
    if (minPoints.length > 0 && maxPoints.length > 0) {
        series.push({
            name: `${fieldName} (область)`,
            type: 'line',
            data: minPoints,
            lineStyle: { opacity: 0 },
            stack: 'confidence',
            symbol: 'none',
            areaStyle: {
                color: 'rgba(74, 144, 226, 0.15)',
                opacity: 0.7
            },
            z: 0,
            silent: true,
            animation: false
        } as LineSeriesOption);

        series.push({
            name: `${fieldName} (область верх)`,
            type: 'line',
            data: maxPoints,
            lineStyle: { opacity: 0 },
            stack: 'confidence',
            symbol: 'none',
            z: 0,
            silent: true,
            animation: false
        } as LineSeriesOption);
    }

    // Линия минимума
    if (minPoints.length > 0) {
        series.push({
            name: `${fieldName} (min)`,
            type: 'line',
            data: minPoints,
            smooth: false,
            symbol: 'circle',
            symbolSize: symbolSize - 1,
            lineStyle: {
                width: 1.5,
                color: '#82ca9d',
                type: 'dashed',
                opacity: 0.8
            },
            itemStyle: {
                color: '#82ca9d',
                borderColor: '#fff',
                borderWidth: 1
            },
            emphasis: {
                focus: isEmphasis ? 'series': 'none',
                lineStyle: { width: 2 },
                itemStyle: {
                    borderWidth: 2,
                    shadowBlur: 10,
                    shadowColor: '#82ca9d'
                }
            },
            connectNulls: false,
            animation: false,
            z: 2
        } as LineSeriesOption);
    }

    // Линия максимума
    if (maxPoints.length > 0) {
        series.push({
            name: `${fieldName} (max)`,
            type: 'line',
            data: maxPoints,
            smooth: false,
            symbol: 'circle',
            symbolSize: symbolSize - 1,
            lineStyle: {
                width: 1.5,
                color: '#ff6b6b',
                type: 'dashed',
                opacity: 0.8
            },
            itemStyle: {
                color: '#ff6b6b',
                borderColor: '#fff',
                borderWidth: 1
            },
            emphasis: {
                focus: isEmphasis ? 'series': 'none',
                lineStyle: { width: 2 },
                itemStyle: {
                    borderWidth: 2,
                    shadowBlur: 10,
                    shadowColor: '#ff6b6b'
                }
            },
            connectNulls: false,
            animation: false,
            z: 2
        } as LineSeriesOption);
    }

    const markArea = createGapsMarkArea(gapsInfo, yMin, yMax);

    // Основная линия среднего
    series.push({
        name: fieldName,
        type: 'line',
        data: avgPoints,
        smooth: false,
        symbol: 'circle',
        symbolSize: symbolSize,
        lineStyle: {
            width: 2.5,
            color: '#4A90E2',
            shadowBlur: 2,
            shadowColor: '#4A90E2',
            shadowOffsetY: 1
        },
        itemStyle: {
            color: '#4A90E2',
            borderColor: '#fff',
            borderWidth: 2
        },
        emphasis: {
            focus: isEmphasis ? 'series' : 'none',
            lineStyle: { width: 3.5 },
            itemStyle: {
                borderWidth: 3,
                shadowBlur: 10,
                shadowColor: '#4A90E2'
            }
        },
        connectNulls: false,
        markArea,

        // ============ НАСТРОЙКИ АНИМАЦИИ ============
        animation: shouldAnimate,

        animationDuration: shouldAnimate
            ? (animationConfig.staggerPoints
                ? (idx: number) => {
                    const progress = idx / Math.max(1, avgPoints.length - 1);
                    return progress * animationConfig.duration;
                }
                : animationConfig.duration)
            : 0,

        animationEasing: animationConfig.easing,

        animationDelay: shouldAnimate && animationConfig.staggerPoints
            ? (idx: number) => idx * 2
            : 0,

        animationDurationUpdate: shouldAnimate
            ? animationConfig.updateDuration
            : 0,
        animationEasingUpdate: 'cubicInOut',
        animationDelayUpdate: 0,

        z: 3
    } as LineSeriesOption);

    return {
        useUTC: !timeSettings.useTimeZone || timeSettings.timeZone === 'UTC',

        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross',
                label: { backgroundColor: '#6a7985' },
                animation: false
            },
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderWidth: 1,
            borderColor: '#ccc',
            padding: 10,
            textStyle: { color: '#333' },
            formatter: (params: any) => {
                if (!Array.isArray(params) || params.length === 0) return '';

                const visibleParams = params.filter((p: any) =>
                        p && p.seriesName && (
                            p.seriesName === fieldName ||
                            p.seriesName === `${fieldName} (min)` ||
                            p.seriesName === `${fieldName} (max)`
                        )
                );

                if (visibleParams.length === 0) return '';

                const avgSeries = visibleParams.find((p: any) => p.seriesName === fieldName);
                const minSeries = visibleParams.find((p: any) => p.seriesName === `${fieldName} (min)`);
                const maxSeries = visibleParams.find((p: any) => p.seriesName === `${fieldName} (max)`);

                if (!avgSeries || !avgSeries.value || !Array.isArray(avgSeries.value) || avgSeries.value.length < 2) {
                    console.warn('[createOptions] Invalid avgSeries in tooltip:', avgSeries);
                    return '';
                }

                const timestamp = avgSeries.value[0];

                if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
                    console.warn('[createOptions] Invalid timestamp:', timestamp);
                    return '';
                }

                const time = formatDateWithTimezone(
                    timestamp,
                    timeSettings,
                    {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    }
                );

                const avgValue = avgSeries.value[1];
                const minValue = minSeries?.value?.[1];
                const maxValue = maxSeries?.value?.[1];
                const count = avgSeries.value[2] ?? 0;

                const avg = avgValue != null && Number.isFinite(avgValue) ? avgValue : 'N/A';
                const min = minValue != null && Number.isFinite(minValue) ? minValue : 'N/A';
                const max = maxValue != null && Number.isFinite(maxValue) ? maxValue : 'N/A';

                return `
        <div style="padding: 4px;">
            <div style="margin-bottom: 6px; font-weight: bold; font-size: 12px;">${time}</div>
            <div style="color: #4A90E2; margin: 3px 0; font-size: 11px;">● Среднее: <b>${avg}</b></div>
            <div style="color: #82ca9d; margin: 3px 0; font-size: 11px;">▼ Минимум: ${min}</div>
            <div style="color: #ff6b6b; margin: 3px 0; font-size: 11px;">▲ Максимум: ${max}</div>
            <div style="color: #000000; margin: 3px 0; font-size: 11px;">Кол-во точек в ведре: ${count}</div> 
        </div>
    `;
            }
        },

        toolbox: {
            feature: {
                dataZoom: {
                    yAxisIndex: 'none',
                    title: {
                        zoom: 'Выделить область',
                        back: 'Сбросить масштаб'
                    }
                },
                restore: { title: 'Восстановить' },
                saveAsImage: {
                    pixelRatio: 2,
                    title: 'Сохранить как изображение'
                }
            },
            right: 10,
            top: 10
        },

        legend: {
            data: [fieldName, `${fieldName} (min)`, `${fieldName} (max)`],
            top: 30,
            selected: {
                [fieldName]: true,
                [`${fieldName} (min)`]: true,
                [`${fieldName} (max)`]: true
            }
        },

        xAxis: {
            type: 'time',
            min: xAxisMin!,
            max: xAxisMax!,
            axisLabel: {
                formatter: (value: number) => {
                    return formatDateWithTimezone(
                        value,
                        timeSettings,
                        { hour: '2-digit', minute: '2-digit' }
                    );
                },
                rotate: 0,
                fontSize: 11
            },
            splitLine: { show: false },
            axisLine: { lineStyle: { color: '#ddd' } }
        },

        yAxis: {
            type: 'value',
            scale: true,
            min: yMin,
            max: yMax,
            name: 'Значение',
            nameTextStyle: {
                fontSize: 12,
                color: '#666'
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: '#E0E0E0',
                    type: 'dashed'
                }
            },
            axisLine: {
                show: true,
                lineStyle: { color: '#ddd' }
            },
            axisLabel: {
                fontSize: 11,
                formatter: (value: number) => {
                    if (value === 0) return '0';
                    const abs = Math.abs(value);
                    if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
                    if (abs >= 1_000) return (value / 1_000).toFixed(1) + 'K';
                    if (abs < 0.01) return value.toExponential(2);
                    return value.toFixed(2);
                }
            }
        },

        grid: {
            left: 70,
            right: 30,
            top: 80,
            bottom: 60,
            containLabel: true
        },

        dataZoom: [
            {
                type: 'inside',
                xAxisIndex: 0,
                zoomOnMouseWheel: isZoomOnMouseWheelKeyCtrl ? 'ctrl' as const : true,
                moveOnMouseWheel: false,
                minValueSpan: 60000,
                filterMode: 'none',
                zoomLock: false,
            },
            {
                type: 'inside' as const,
                yAxisIndex: 0,
                filterMode: 'none' as const,
                zoomOnMouseWheel: 'shift' as const,
                moveOnMouseWheel: false,
                throttle: 100,
            },
            {
                type: 'slider',
                xAxisIndex: 0,
                minValueSpan: 60000,
                filterMode: 'none',
                height: 30,
                bottom: 10,
                borderColor: '#ddd',
                backgroundColor: 'rgba(47, 69, 84, 0.05)',
                fillerColor: 'rgba(70, 130, 180, 0.15)',
                handleStyle: {
                    color: '#4A90E2',
                    shadowBlur: 3,
                    shadowColor: 'rgba(0, 0, 0, 0.3)'
                },
                textStyle: { fontSize: 11 }
            }
        ],

        series,
        animation: false
    };
}


function createGapsMarkArea(
    gapsInfo: GapsInfo | undefined,
    yMin: number,
    yMax: number
): MarkAreaComponentOption | undefined {
    if (!gapsInfo || (gapsInfo.dataGaps.length === 0 && gapsInfo.loadingGaps.length === 0)) {
        return undefined;
    }

    const data: any[] = [];

    for (const gap of gapsInfo.dataGaps) {
        data.push([
            {
                name: 'Нет данных',
                xAxis: gap.fromMs,
                yAxis: yMin,
                itemStyle: {
                    color: 'rgba(255, 107, 107, 0.1)',
                    borderColor: 'rgba(255, 107, 107, 0.3)',
                    borderWidth: 1,
                    borderType: 'dashed'
                }
            },
            {
                xAxis: gap.toMs,
                yAxis: yMax
            }
        ]);
    }

    for (const gap of gapsInfo.loadingGaps) {
        data.push([
            {
                name: 'Загрузка...',
                xAxis: gap.fromMs,
                yAxis: yMin,
                itemStyle: {
                    color: 'rgba(251, 191, 36, 0.08)',
                    borderColor: 'rgba(251, 191, 36, 0.4)',
                    borderWidth: 1,
                    borderType: 'dotted'
                }
            },
            {
                xAxis: gap.toMs,
                yAxis: yMax
            }
        ]);
    }

    return {
        silent: true,
        data
    };
}