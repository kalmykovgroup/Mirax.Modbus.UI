// charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/createEChartsOptions.ts

import type { EChartsOption, LineSeriesOption } from 'echarts';
import type { EChartsPoint } from '@chartsPage/charts/core/store/selectors/visualization.selectors';
import type { TimeSettings } from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import { formatDateWithTimezone } from "@chartsPage/charts/ui/TimeZonePicker/timezoneUtils.ts";
import type { TimeRange } from "@chartsPage/charts/core/store/types/chart.types.ts";
import {
    selectChartRenderData,
    selectChartStats
} from '@chartsPage/charts/core/store/selectors/visualization.selectors';

// ============================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================

export function createOptions(
    avgPoints: readonly EChartsPoint[],
    minPoints: readonly EChartsPoint[],
    maxPoints: readonly EChartsPoint[],
    fieldName: string,
    originalRange: TimeRange | undefined,
    timeSettings: TimeSettings
): EChartsOption {
    if (avgPoints.length === 0) {
        return {
            title: { text: fieldName, left: 'center' },
            xAxis: { type: 'time' },
            yAxis: { type: 'value' },
            series: []
        };
    }

    const xAxisMin = originalRange?.from.getTime();
    const xAxisMax = originalRange?.to.getTime();
    const showSymbols = avgPoints.length < 100;
    const symbolSize = avgPoints.length < 50 ? 6 : 4;

    //  КРИТИЧНО: Вычисляем min/max ТОЛЬКО из avg точек
    // Это гарантирует, что шкала не прыгнет из-за выбросов в min/max линиях
    let globalMin = Number.POSITIVE_INFINITY;
    let globalMax = Number.NEGATIVE_INFINITY;

    for (const point of avgPoints) {
        const value = point[1];
        if (Number.isFinite(value)) {
            if (value < globalMin) globalMin = value;
            if (value > globalMax) globalMax = value;
        }
    }

    // Если все точки одинаковые или диапазон слишком мал
    if (globalMin === globalMax) {
        const base = globalMin !== 0 ? Math.abs(globalMin) * 0.1 : 1;
        globalMin -= base;
        globalMax += base;
    }

    // Добавляем 5% padding для визуального комфорта
    const range = globalMax - globalMin;
    const padding = range * 0.05;
    const yMin = globalMin - padding;
    const yMax = globalMax + padding;

    const series: LineSeriesOption[] = [];

    // ============================================
    //  ИСПРАВЛЕНО: Область min-max БЕЗ stack
    // ============================================

    // Используем подход из старой версии:
    // 1. Две невидимые линии (min и max)
    // 2. С areaStyle для создания заливки между ними
    // 3. БЕЗ stack (чтобы не суммировались значения)

    if (minPoints.length > 0 && maxPoints.length > 0) {
        // Нижняя граница (invisible line + area)
        series.push({
            name: `${fieldName} (область)`,
            type: 'line',
            data: minPoints,
            lineStyle: { opacity: 0 },
            symbol: 'none',
            areaStyle: {
                color: 'rgba(74, 144, 226, 0.15)',
                opacity: 0.7
            },
            z: 0,
            silent: true,
            animation: false
        } as LineSeriesOption);

        // Верхняя граница (invisible line, NO areaStyle to avoid double fill)
        series.push({
            name: `${fieldName} (область верх)`,
            type: 'line',
            data: maxPoints,
            lineStyle: { opacity: 0 },
            symbol: 'none',
            z: 0,
            silent: true,
            animation: false
        } as LineSeriesOption);
    }

    // ============================================
    // ЛИНИЯ МИНИМУМА
    // ============================================

    if (minPoints.length > 0) {
        series.push({
            name: `${fieldName} (min)`,
            type: 'line',
            data: minPoints,
            sampling: 'lttb',
            smooth: false,
            connectNulls: true,
            symbol: showSymbols ? 'diamond' : 'none',
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
                focus: 'series',
                lineStyle: { width: 2 },
                itemStyle: {
                    borderWidth: 2,
                    shadowBlur: 10,
                    shadowColor: '#82ca9d'
                }
            },
            animation: false,
            z: 2
        } as LineSeriesOption);
    }

    // ============================================
    // ЛИНИЯ МАКСИМУМА
    // ============================================

    if (maxPoints.length > 0) {
        series.push({
            name: `${fieldName} (max)`,
            type: 'line',
            data: maxPoints,
            sampling: 'lttb',
            smooth: false,
            connectNulls: true,
            symbol: showSymbols ? 'triangle' : 'none',
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
                focus: 'series',
                lineStyle: { width: 2 },
                itemStyle: {
                    borderWidth: 2,
                    shadowBlur: 10,
                    shadowColor: '#ff6b6b'
                }
            },
            animation: false,
            z: 2
        } as LineSeriesOption);
    }

    // ============================================
    // ОСНОВНАЯ ЛИНИЯ СРЕДНЕГО
    // ============================================

    series.push({
        name: fieldName,
        type: 'line',
        data: avgPoints,
        sampling: 'lttb',
        smooth: false,
        connectNulls: true,
        symbol: showSymbols ? 'circle' : 'none',
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
            focus: 'series',
            lineStyle: { width: 3.5 },
            itemStyle: {
                borderWidth: 3,
                shadowBlur: 10,
                shadowColor: '#4A90E2'
            }
        },
        animation: false,
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
                    p.seriesName === fieldName ||
                    p.seriesName === `${fieldName} (min)` ||
                    p.seriesName === `${fieldName} (max)`
                );

                const avgSeries = visibleParams.find((p: any) => p.seriesName === fieldName);
                const minSeries = visibleParams.find((p: any) => p.seriesName === `${fieldName} (min)`);
                const maxSeries = visibleParams.find((p: any) => p.seriesName === `${fieldName} (max)`);

                if (!avgSeries) return '';

                const time = formatDateWithTimezone(
                    avgSeries.value[0],
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

                // ✅ ЗАЩИТА ОТ NULL
                const avgValue = avgSeries.value?.[1];
                const minValue = minSeries?.value?.[1];
                const maxValue = maxSeries?.value?.[1];

                const avg = avgValue != null ? avgValue.toFixed(2) : 'N/A';
                const min = minValue != null ? minValue.toFixed(2) : 'N/A';
                const max = maxValue != null ? maxValue.toFixed(2) : 'N/A';

                return `
        <div style="padding: 4px;">
            <div style="margin-bottom: 6px; font-weight: bold; font-size: 12px;">${time}</div>
            <div style="color: #4A90E2; margin: 3px 0; font-size: 11px;">● Среднее: <b>${avg}</b></div>
            <div style="color: #82ca9d; margin: 3px 0; font-size: 11px;">▼ Минимум: ${min}</div>
            <div style="color: #ff6b6b; margin: 3px 0; font-size: 11px;">▲ Максимум: ${max}</div>
        </div>
    `;
            }
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
            scale: true,        //  Включаем scale mode
            min: yMin,          //  ФИКСИРУЕМ на основе avg точек
            max: yMax,          //  ФИКСИРУЕМ на основе avg точек
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
                minValueSpan: 60000,
                filterMode: 'none',
                zoomLock: false,
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

// ============================================
// УТИЛИТЫ
// ============================================

type ChartRenderData = ReturnType<typeof selectChartRenderData>;
type ChartStatsType = ReturnType<typeof selectChartStats>;

export function getOverlayType(
    chartData: ChartRenderData,
    stats: ChartStatsType
): 'loading' | 'empty' | 'stale' | null {
    const hasPoints = chartData.avgPoints.length > 0;

    if (!hasPoints && !stats.isLoading) {
        return 'empty';
    }

    if (!hasPoints && stats.isLoading) {
        return 'loading';
    }

    return null;
}

export function getOverlayMessage(
    type: 'loading' | 'empty' | 'stale',
    stats: ChartStatsType
): string {
    switch (type) {
        case 'loading':
            return stats.loadingProgress > 0
                ? `Загрузка: ${stats.loadingProgress}%`
                : 'Загрузка данных...';
        case 'stale':
            return 'Загрузка точных данных...';
        case 'empty':
            return 'Нет данных';
        default:
            return '';
    }
}