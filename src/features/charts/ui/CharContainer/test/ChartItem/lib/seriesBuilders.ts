// src/components/ChartCollection/ChartItem/seriesBuilders.ts
import type { SeriesOption, EChartsOption } from 'echarts';
import type { StylePreset } from './theme.ts';
import { decimatePoints, type RawPointForChart, type BinPointForChart } from './dataAdapters.ts';

export const viz = {
    showRawLineSymbolsIfSmall: true,
    rawSymbolCutoff: 300,
    showAvgLine: true,
    showMinMaxBand: true,
    showMinLine: false,
    showMaxLine: false,
    showCountBar: false,

    showAvgMarkers: true,
    showMinMarkers: false,
    showMaxMarkers: false,
    showRawMarkers: true,

    maxAvgMarkers: 800,
    maxRawMarkers: 1200,
};

export function buildBaseOption(
    fieldName: string,
    preset: StylePreset,
    hasCountAxis: boolean
): EChartsOption {
    const axis = preset.color.axis;      // глобальные цвета осей (опц.)
    const yL   = preset.axisYLeft ?? {}; // индивидуальные стили левой оси

    // xAxis
    const xAxis = {
        type: 'time' as const,
        axisLabel: axis?.label
            ? { hideOverlap: true, color: axis.label }
            : { hideOverlap: true },
        ...(axis?.line  ? { axisLine:  { lineStyle: { color: axis.line  } } } : {}),
        ...(axis?.split ? { splitLine: { lineStyle: { color: axis.split } } } : {}),
    };

    // Левая ось: yCommon + поверх неё — уточнения из axisYLeft
    const yLeft = {
        type: 'value' as const,
        scale: true,
        name: fieldName,
        ...(axis?.name ? { nameTextStyle: { color: axis.name } } : {}),

        // label
        axisLabel: {
            ...(axis?.label ? { color: axis.label } : {}),
            ...(yL.labelColor ? { color: yL.labelColor } : {}),
            ...(yL.fontSize ? { fontSize: yL.fontSize } : {}),
            ...(yL.fontFamily ? { fontFamily: yL.fontFamily } : {}),
            ...(yL.formatter ? { formatter: yL.formatter } : {}),
        },

        // line
        ...(axis?.line || yL.lineColor || yL.lineWidth
            ? {
                axisLine: {
                    lineStyle: {
                        ...(axis?.line ? { color: axis.line } : {}),
                        ...(yL.lineColor ? { color: yL.lineColor } : {}),
                        ...(yL.lineWidth ? { width: yL.lineWidth } : {}),
                    },
                },
            }
            : {}),

        // ticks
        ...(yL.tickShow != null || yL.tickLength || yL.tickInside != null
            ? {
                axisTick: {
                    ...(yL.tickShow != null ? { show: yL.tickShow } : {}),
                    ...(yL.tickLength ? { length: yL.tickLength } : {}),
                    ...(yL.tickInside != null ? { inside: yL.tickInside } : {}),
                },
            }
            : {}),

        // split line
        ...(axis?.split || yL.splitLineColor || yL.splitLineType
            ? {
                splitLine: {
                    lineStyle: {
                        ...(axis?.split ? { color: axis.split } : {}),
                        ...(yL.splitLineColor ? { color: yL.splitLineColor } : {}),
                        ...(yL.splitLineType ? { type: yL.splitLineType } : {}),
                    },
                },
            }
            : {}),

        // split area
        ...(yL.splitArea ? { splitArea: { show: true } } : {}),
    };

    // Правая ось (если нужна): только глобальные axis-цвета,
    // без axisYLeft — чтобы левая и правая могли отличаться
    const yRight = {
        type: 'value' as const,
        scale: true,
        name: 'Count',
        alignTicks: true as const,
        ...(axis?.name ? { nameTextStyle: { color: axis.name } } : {}),
        ...(axis?.label ? { axisLabel: { color: axis.label } } : {}),
        ...(axis?.line  ? { axisLine:  { lineStyle: { color: axis.line  } } } : {}),
        ...(axis?.split ? { splitLine: { lineStyle: { color: axis.split } } } : {}),
    };

    return {
        useUTC: true,
        color: preset.color.palette,
        grid: preset.grid,
        backgroundColor: preset.backgroundColor,
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' },
            extraCssText: `background:${preset.color.tooltip?.bg ?? '#fff'};border:1px solid ${
                preset.color.tooltip?.border ?? '#e5e7eb'
            };color:${preset.color.tooltip?.text ?? '#111'};border-radius:8px;box-shadow:none;padding:8px 10px;`,
        },
        xAxis,
        yAxis: hasCountAxis ? [yLeft, yRight] : yLeft,
        dataZoom: [{ type: 'inside', xAxisIndex: 0 }, { type: 'slider', xAxisIndex: 0 }],
    } as EChartsOption;
}



// RAW
export function buildSeriesFromRaw(
    fieldName: string,
    data: RawPointForChart[],
    preset: StylePreset
): SeriesOption[] {
    const showSymbols = viz.showRawLineSymbolsIfSmall && data.length <= viz.rawSymbolCutoff;

    const line: SeriesOption = {
        name: fieldName,
        type: 'line',
        data,
        encode: { x: 0, y: 1 },
        symbol: showSymbols ? 'circle' : 'none',
        symbolSize: showSymbols ? preset.size.symbol.small : 0,
        showSymbol: showSymbols,
        smooth: false,
        connectNulls: true,
        lineStyle: {
            width: preset.width.line.raw,
            type: preset.dash.raw,
            opacity: preset.opacity.line,
            color: preset.color.line.raw,
        },
        itemStyle: {
            color: preset.color.point.raw,
            opacity: preset.opacity.point,
            shadowBlur: 8,
            shadowColor: preset.color.glow.raw,
        },
        emphasis: { focus: 'series' },
        yAxisIndex: 0,
        z: preset.z.line,
    };

    const series: SeriesOption[] = [line];

    if (viz.showRawMarkers && data.length) {
        const pts = decimatePoints(data, viz.maxRawMarkers);
        series.push({
            name: `${fieldName} raw pts`,
            type: 'scatter',
            data: pts,
            encode: { x: 0, y: 1 },
            symbol: 'circle',
            symbolSize: preset.size.symbol.raw,
            itemStyle: {
                color: preset.color.point.raw,
                opacity: preset.opacity.point,
                shadowBlur: 8,
                shadowColor: preset.color.glow.raw,
            },
            z: preset.z.points,
            tooltip: { show: false },
            emphasis: { scale: false },
        });
    }

    return series;
}

// BINS
export function buildSeriesFromBins(
    fieldName: string,
    bins: { avg: BinPointForChart[]; minLine: BinPointForChart[]; maxLine: BinPointForChart[]; bandMin: BinPointForChart[]; bandDelta: BinPointForChart[]; countBar: BinPointForChart[]; },
    preset: StylePreset
): SeriesOption[] {
    const series: SeriesOption[] = [];

    if (viz.showMinMaxBand) {
        series.push(
            {
                name: `${fieldName} min`,
                type: 'line',
                data: bins.bandMin,
                encode: { x: 0, y: 1 },
                stack: 'band',
                showSymbol: false,
                connectNulls: true,
                lineStyle: { width: preset.width.line.bandBase },
                areaStyle: { opacity: preset.opacity.bandBase },
                yAxisIndex: 0,
                z: preset.z.band,
            },
            {
                name: `${fieldName} max-min`,
                type: 'line',
                data: bins.bandDelta,
                encode: { x: 0, y: 1 },
                stack: 'band',
                showSymbol: false,
                connectNulls: true,
                lineStyle: { width: preset.width.line.bandBase },
                areaStyle: { opacity: preset.opacity.bandDelta },
                yAxisIndex: 0,
                z: preset.z.band,
            },
        );
    }

    if (viz.showMinLine) {
        series.push({
            name: `${fieldName} min`,
            type: 'line',
            data: bins.minLine,
            encode: { x: 0, y: 1 },
            showSymbol: false,
            connectNulls: true,
            lineStyle: {
                width: preset.width.line.minmax,
                type: preset.dash.min,
                opacity: preset.opacity.minmax,
                color: preset.color.line.min,
            },
            itemStyle: { opacity: preset.opacity.minmax },
            yAxisIndex: 0,
            z: preset.z.minmax,
        });
    }

    if (viz.showMaxLine) {
        series.push({
            name: `${fieldName} max`,
            type: 'line',
            data: bins.maxLine,
            encode: { x: 0, y: 1 },
            showSymbol: false,
            connectNulls: true,
            lineStyle: {
                width: preset.width.line.minmax,
                type: preset.dash.max,
                opacity: preset.opacity.minmax,
                color: preset.color.line.max,
            },
            itemStyle: { opacity: preset.opacity.minmax },
            yAxisIndex: 0,
            z: preset.z.minmax,
        });
    }

    if (viz.showAvgLine) {
        series.push({
            name: `${fieldName} avg`,
            type: 'line',
            data: bins.avg,
            encode: { x: 0, y: 1 },
            showSymbol: false,
            connectNulls: true,
            lineStyle: {
                width: preset.width.line.avg,
                type: preset.dash.avg,
                opacity: preset.opacity.line,
                color: preset.color.line.avg,
            },
            itemStyle: { opacity: preset.opacity.line },
            yAxisIndex: 0,
            z: preset.z.line,
            emphasis: { focus: 'series' },
        });

        if (viz.showAvgMarkers && bins.avg.length) {
            const avgPts = decimatePoints(bins.avg, viz.maxAvgMarkers);
            series.push({
                name: `${fieldName} avg pts`,
                type: 'scatter',
                data: avgPts,
                encode: { x: 0, y: 1 },
                symbol: 'circle',
                symbolSize: preset.size.symbol.avg,
                itemStyle: {
                    color: preset.color.point.avg,
                    opacity: preset.opacity.point,
                    shadowBlur: 8,
                    shadowColor: preset.color.glow.avg,
                },
                z: preset.z.points,
                tooltip: { show: false },
                emphasis: { scale: false },
            });
        }
    }

    return series;
}
