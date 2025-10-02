import type { EChartsOption } from 'echarts';
import {
    type EChartsPoint,
    selectChartRenderData,
    selectChartStats
} from '@chartsPage/charts/core/store/selectors/visualization.selectors';
import type {selectOptimalData} from "@chartsPage/charts/core/store/selectors/dataProxy.selectors.ts";
import type {TimeSettings} from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import {formatDateWithTimezone} from "@chartsPage/charts/ui/TimeZonePicker/timezoneUtils.ts";
import type {TimeRange} from "@chartsPage/charts/core/store/types/chart.types.ts";

export function createOptions(
    points: readonly EChartsPoint[],
    fieldName: string,
    originalRange: TimeRange | undefined,
    timeSettings: TimeSettings
): EChartsOption {
    if (points.length === 0) {
        return {
            title: { text: fieldName, left: 'center' },
            xAxis: { type: 'time' },
            yAxis: { type: 'value' },
            series: []
        };
    }

    const xAxisMin = originalRange?.from.getTime();
    const xAxisMax = originalRange?.to.getTime();

    return {
        useUTC: !timeSettings.useTimeZone || timeSettings.timeZone === 'UTC',
        title: {
            text: fieldName,
            left: 'center',
            textStyle: { fontSize: 16, fontWeight: 'bold' }
        },
        tooltip: {
            trigger: 'axis',
            formatter: (params: any) => {
                if (!Array.isArray(params) || params.length === 0) return '';
                const point = params[0];

                // Форматируем время с учётом зоны
                const time = formatDateWithTimezone(
                    point.value[0],
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

                const value = point.value[1].toFixed(2);
                return `${time}<br/>${fieldName}: <b>${value}</b>`;
            }
        },
        xAxis: {
            type: 'time',
            min: xAxisMin,
            max: xAxisMax,
            axisLabel: {
                formatter: (value: number) => {
                    return formatDateWithTimezone(
                        value,
                        timeSettings,
                        {
                            hour: '2-digit',
                            minute: '2-digit'
                        }
                    );
                }
            },
            splitLine: { show: false }
        } ,
        yAxis: {
            type: 'value',
            scale: true,
            splitLine: { show: true, lineStyle: { color: '#E0E0E0' } }
        },
        grid: { left: 60, right: 20, top: 60, bottom: 60 },
        dataZoom: [
            {
                type: 'inside',
                xAxisIndex: 0,
                minValueSpan: 60000,
                filterMode: 'none',
                zoomLock: false
            },
            {
                type: 'slider',
                xAxisIndex: 0,
                minValueSpan: 60000,
                filterMode: 'none'
            }
        ],
        series: [{
            name: fieldName,
            type: 'line',
            data: points as any,
            sampling: 'lttb',
            smooth: false,
            symbol: 'none',
            lineStyle: { width: 2, color: '#4A90E2' },
            animation: false // ← Отключаем анимацию для производительности
        }],
        animation: false // ← Отключаем глобальную анимацию
    };
}

// ============================================
// УТИЛИТЫ
// ============================================

type ChartRenderData = ReturnType<typeof selectChartRenderData>;
type ChartStatsType = ReturnType<typeof selectChartStats>;
type OptimalDataResult = ReturnType<typeof selectOptimalData>;

export function getOverlayType(
    chartData: ChartRenderData,
    stats: ChartStatsType,
    optimalData: OptimalDataResult
): 'loading' | 'empty' | 'stale' | null {
    if (stats.isLoading && chartData.isEmpty) return 'loading';
    if (chartData.isEmpty && !stats.isLoading) return 'empty';
    if (optimalData.isStale && stats.isLoading) return 'stale';
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