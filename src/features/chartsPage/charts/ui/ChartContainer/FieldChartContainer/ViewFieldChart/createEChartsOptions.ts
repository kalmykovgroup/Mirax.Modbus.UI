
import {
    type EChartsPoint,
} from "@chartsPage/charts/core/store/selectors/visualization.selectors.ts";
import type {GapsInfo, OriginalRange} from "@chartsPage/charts/core/store/types/chart.types.ts";
import type {TimeSettings} from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import type {EChartsOption, LineSeriesOption, MarkAreaComponentOption} from "echarts";
import {formatDateWithTimezone} from "@chartsPage/charts/ui/TimeZonePicker/timezoneUtils.ts";

export function createOptions(
    avgPoints: EChartsPoint[],
    minPoints: EChartsPoint[],
    maxPoints: EChartsPoint[],
    fieldName: string,
    originalRange: OriginalRange | undefined,
    timeSettings: TimeSettings,
    gapsInfo?: GapsInfo | undefined
): EChartsOption {
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

    // Вычисляем min/max ТОЛЬКО из avg точек
    let globalMin = Number.POSITIVE_INFINITY;
    let globalMax = Number.NEGATIVE_INFINITY;

    for (const point of avgPoints) {
        const value = point[1];
        if (Number.isFinite(value)) {
            if (value < globalMin) globalMin = value;
            if (value > globalMax) globalMax = value;
        }
    }

    if (globalMin === globalMax) {
        const base = globalMin !== 0 ? Math.abs(globalMin) * 0.1 : 1;
        globalMin -= base;
        globalMax += base;
    }

    const range = globalMax - globalMin;
    const padding = range * 0.05;
    const yMin = globalMin - padding;
    const yMax = globalMax + padding;

    const series: LineSeriesOption[] = [];

    // Область min-max БЕЗ stack
    if (minPoints.length > 0 && maxPoints.length > 0) {
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
                focus: 'series',
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
                focus: 'series',
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
            focus: 'series',
            lineStyle: { width: 3.5 },
            itemStyle: {
                borderWidth: 3,
                shadowBlur: 10,
                shadowColor: '#4A90E2'
            }
        },
        connectNulls: false,
        markArea, // markArea
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
                // Усиленная защита от undefined
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

                //   КРИТИЧНО: Проверка наличия avgSeries и его value
                if (!avgSeries || !avgSeries.value || !Array.isArray(avgSeries.value) || avgSeries.value.length < 2) {
                    console.warn('[createOptions] Invalid avgSeries in tooltip:', avgSeries);
                    return '';
                }

                const timestamp = avgSeries.value[0];

                // Дополнительная проверка timestamp
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

                //   ЗАЩИТА ОТ NULL
                const avgValue = avgSeries.value[1];
                const minValue = minSeries?.value?.[1];
                const maxValue = maxSeries?.value?.[1];

                const avg = avgValue != null && Number.isFinite(avgValue)
                    ? avgValue.toFixed(2)
                    : 'N/A';
                const min = minValue != null && Number.isFinite(minValue)
                    ? minValue.toFixed(2)
                    : 'N/A';
                const max = maxValue != null && Number.isFinite(maxValue)
                    ? maxValue.toFixed(2)
                    : 'N/A';

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
            min: xAxisMin,
            max: xAxisMax,
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


//
// Создание markArea для gaps
//

function createGapsMarkArea(
    gapsInfo: GapsInfo | undefined,
    yMin: number,
    yMax: number
): MarkAreaComponentOption | undefined {
    if (!gapsInfo || (gapsInfo.dataGaps.length === 0 && gapsInfo.loadingGaps.length === 0)) {
        return undefined;
    }

    const data: any[] = [];

    // Gaps без данных (красноватый оттенок)
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

    // Gaps в процессе загрузки (жёлтый оттенок)
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
