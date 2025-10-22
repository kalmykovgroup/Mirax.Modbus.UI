import {
    type EChartsPoint,
} from "@chartsPage/charts/core/store/selectors/visualization.selectors.ts";
import type {GapsInfo, OriginalRange} from "@chartsPage/charts/core/store/types/chart.types.ts";
import type {TimeSettings} from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import type {EChartsOption, LineSeriesOption, MarkAreaComponentOption} from "echarts";
import {formatDateWithTimezone} from "@chartsPage/charts/ui/TimeZonePicker/timezoneUtils.ts";
import {
    calculateYAxisBounds,
    type YAxisRange
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

    const xAxisMin = originalRange?.fromMs ?? 0;
    const xAxisMax = originalRange?.toMs ?? 0;
    const symbolSize = avgPoints.length < 50 ? 6 : 4;
    const shouldAnimate = animationConfig.enabled && avgPoints.length < 2000;



    // ============================================
    // РАСЧЁТ ГРАНИЦ Y-ОСИ (ИСПРАВЛЕНО)
    // ============================================
    // Собираем ВСЕ точки из всех трёх серий для правильного расчёта границ
    const allPoints: EChartsPoint[] = [];

    avgPoints.forEach(point => {
        if (Array.isArray(point) && point.length >= 2 && typeof point[1] === 'number' && Number.isFinite(point[1])) {
            allPoints.push(point);
        }
    });

    minPoints.forEach(point => {
        if (Array.isArray(point) && point.length >= 2 && typeof point[1] === 'number' && Number.isFinite(point[1])) {
            allPoints.push(point);
        }
    });

    maxPoints.forEach(point => {
        if (Array.isArray(point) && point.length >= 2 && typeof point[1] === 'number' && Number.isFinite(point[1])) {
            allPoints.push(point);
        }
    });

    // Если нет валидных точек вообще
    if (allPoints.length === 0) {
        return {
            title: { text: fieldName, left: 'center' },
            xAxis: {
                type: 'time' as const,
                ...(xAxisMin !== undefined && { min: xAxisMin }),
                ...(xAxisMax !== undefined && { max: xAxisMax })
            },
            yAxis: { type: 'value' as const },
            series: []
        };
    }

    const yAxisBounds = calculateYAxisBounds(allPoints, customYAxisRange);
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
            className: 'echarts-tooltip',
            backgroundColor: 'transparent',
            borderWidth: 0,
            padding: 0,
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



                return `
                    <div class="echarts-tooltip-container">
                        <div class="echarts-tooltip-time">${time}</div>
                        
                        <div class="echarts-tooltip-row">
                            <span class="echarts-tooltip-marker" style="background-color: #4A90E2;"></span>
                            <span class="echarts-tooltip-label">Среднее:</span>
                            <span class="echarts-tooltip-value">${avgValue}</span>
                        </div>
                        
                        <div class="echarts-tooltip-row">
                            <span class="echarts-tooltip-marker" style="background-color: #82ca9d;"></span>
                            <span class="echarts-tooltip-label">Минимум:</span>
                            <span class="echarts-tooltip-value">${minValue}</span>
                        </div>
                        
                        <div class="echarts-tooltip-row">
                            <span class="echarts-tooltip-marker" style="background-color: #ff6b6b;"></span>
                            <span class="echarts-tooltip-label">Максимум:</span>
                            <span class="echarts-tooltip-value">${maxValue}</span>
                        </div>
                        
                        <div class="echarts-tooltip-count">
                            <span class="echarts-tooltip-label">Кол-во точек в ведре:</span>
                            <span class="echarts-tooltip-value">${count}</span>
                        </div>
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
            min: xAxisMin,
            max: xAxisMax,
            axisLabel: {
                show: false // Полностью скрываем все метки оси X
            },
            // Настройка указателя оси (всплывающая подсказка внизу при наведении)
            axisPointer: {
                show: true,
                type: 'line',
                snap: true,
                lineStyle: {
                    color: '#4A90E2',
                    width: 1,
                    type: 'dashed'
                },
                label: {
                    show: true,
                    formatter: (params: any) => {
                        const value = params.value;
                        if (typeof value !== 'number') return '';

                        return formatDateWithTimezone(
                            value,
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
                    },
                    backgroundColor: 'rgba(74, 144, 226, 0.9)',
                    color: '#fff',
                    padding: [8, 12],
                    fontSize: 12,
                    fontWeight: 'bold' as const,
                    borderRadius: 4
                }
            },
            splitLine: { show: false },
            axisLine: { lineStyle: { color: '#ddd' } },
            axisTick: {
                show: false // Скрываем засечки оси
            }
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
            left: 50,
            right: 20,
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

