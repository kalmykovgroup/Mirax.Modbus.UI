// charts/ui/CharContainer/ChartCollection/FieldChart/OptionECharts.ts

import type {EChartsOption, LineSeriesOption} from 'echarts';
import {formatTimeByBucket} from './utils';
import type {SeriesBinDto} from "@chartsPage/template/shared/contracts/chart/Dtos/SeriesBinDto.ts";
import {
    createTooltipFormatter
} from "@chartsPage/ui/CharContainer/ChartCollection/FieldChart/ViewFieldChart/ChartTooltip/tooltipBuilder.ts";

import type { ScaleDataValue, LabelFormatterParams } from 'echarts/types/dist/shared';


interface ChartOptionParams {
    data: SeriesBinDto[];
    fieldName: string;
    domain: { from: Date; to: Date };
    visibleRange?: { from: Date; to: Date } | undefined;
    bucketMs: number;
    theme?: 'light' | 'dark';
    showDataGaps?: boolean;
    enableBrush?: boolean;
    showMinimap?: boolean;
    coverage?: Array<{ from: number; to: number }>;
    loadingZones?: Array<{ from: number; to: number }>;
    showMin?: boolean | undefined;
    showMax?: boolean | undefined;
    showArea?: boolean | undefined;
    timeZone?: string | undefined;
    useTimeZone?: boolean | undefined;
    opacity?: number | undefined;
    lineStyle?: {
        width?: number | undefined;
        type?: 'solid' | 'dashed' | 'dotted' | undefined;
    } | undefined;
}

// Утилита для поиска разрывов в данных
function findDataGaps(
    data: SeriesBinDto[],
    bucketMs: number,
    threshold = 2
): Array<{ from: number; to: number }> {
    const gaps: Array<{ from: number; to: number }> = [];

    if(!data || data.length < 2) return gaps;

    for (let i = 1; i < data.length; i++) {
        try {
            const prevTime = new Date(data[i - 1]!.t).getTime();
            const currTime = new Date(data[i]!.t).getTime();

            if (isNaN(prevTime) || isNaN(currTime)) continue;

            const gap = currTime - prevTime;

            if (gap > bucketMs * threshold) {
                gaps.push({
                    from: prevTime + bucketMs,
                    to: currTime - bucketMs
                });
            }
        } catch (error) {
            console.warn('Error calculating gap:', error);
        }
    }

    return gaps;
}

// Подготовка данных с защитой от некорректных значений
function prepareAllSeriesData(data: SeriesBinDto[]): {
    avgData: Array<[number, number | undefined]>;
    minData: Array<[number, number | undefined]>;
    maxData: Array<[number, number | undefined]>;
} {
   if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('[prepareAllSeriesData] No shared provided');
        return { avgData: [], minData: [], maxData: [] };
    }

    const avgData: Array<[number, number | undefined]> = [];
    const minData: Array<[number, number | undefined]> = [];
    const maxData: Array<[number, number | undefined]> = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const bin of data) {
        if (!bin || bin.t === null || bin.t === undefined) {
            invalidCount++;
            continue;
        }

        try {
            const timestamp = bin.t.getTime();

            if (isNaN(timestamp)) {
                invalidCount++;
                continue;
            }

            avgData.push([timestamp, bin.avg]);
            minData.push([timestamp, bin.min]);
            maxData.push([timestamp, bin.max]);
            validCount++;
        } catch (error) {
            console.warn('Invalid bin shared:', bin, error);
            invalidCount++;
        }
    }


    return { avgData, minData, maxData };
}

export function createChartOption(params: ChartOptionParams): EChartsOption {
    const {
        data = [],
        fieldName,
        domain,
        visibleRange,
        bucketMs,
        theme = 'light',
        showDataGaps = true,
        enableBrush = false,
        showMinimap = true,
        coverage = [],
        loadingZones = [],
        showMin = true,
        showMax = true,
        showArea = true,
        timeZone = 'UTC',
        useTimeZone = false,
        opacity = 1,
        lineStyle = {},
    } = params;


    // Валидация обязательных параметров
    if (!domain || !domain.from || !domain.to) {
        console.error('Invalid domain provided to createChartOption');
        return {} as EChartsOption;
    }

    // Темы
    const themes = {
        light: {
            background: '#ffffff',
            avgLine: '#5470c6',
            minLine: '#91cc75',
            maxLine: '#ee6666',
            minMaxArea: 'rgba(84, 112, 198, 0.12)',
            grid: '#e0e6f1',
            text: '#333',
            gap: '#ff7875',
            pointBorder: '#fff'
        },
        dark: {
            background: '#1f1f1f',
            avgLine: '#91cc75',
            minLine: '#73c0de',
            maxLine: '#fc8452',
            minMaxArea: 'rgba(145, 204, 117, 0.12)',
            grid: '#333',
            text: '#ccc',
            gap: '#ff4d4f',
            pointBorder: '#1f1f1f'
        }
    };

    const currentTheme = themes[theme];

    // Подготавливаем данные
    const { avgData, minData, maxData } = prepareAllSeriesData(data);
    const hasData = avgData.length > 0 || minData.length > 0 || maxData.length > 0;


    const gaps = showDataGaps && hasData ? findDataGaps(data, bucketMs) : [];
    const series: LineSeriesOption[] = [];

    // Область между min и max
    if (showMin && showMax && minData.length > 0 && maxData.length > 0) {
        series.push({
            name: `${fieldName} Range`,
            type: 'line',
            data: minData,
            lineStyle: { opacity: 0 },
            stack: 'confidence',
            symbol: 'none',
            areaStyle: {
                color: currentTheme.minMaxArea,
                opacity: 0.7 * opacity
            },
            z: 1,
            silent: true,
            animation: false
        });

        series.push({
            name: `${fieldName} Range Top`,
            type: 'line',
            data: maxData.map((point, index) => {
                const minValue: number | undefined  = minData[index]?.[1];
                const maxValue: number | undefined = point[1];
                if (minValue === null || minValue === undefined || maxValue === null || maxValue == undefined) {
                    return [point[0], null];
                }
                return [point[0], maxValue - minValue];
            }),
            lineStyle: { opacity: 0 },
            stack: 'confidence',
            symbol: 'none',
            areaStyle: {
                color: currentTheme.minMaxArea,
                opacity: 0
            },
            z: 1,
            silent: true,
            animation: false
        });
    }

    // Линия минимума
    if (showMin && minData.length > 0) {
        series.push({
            name: `${fieldName} (min)`,
            type: 'line',
            data: minData,
            symbol: 'circle',
            symbolSize: 4,
            sampling: 'lttb',
            lineStyle: {
                width: (lineStyle.width || 1.5) * 0.8,
                color: currentTheme.minLine,
                type: lineStyle.type || 'dashed',
                opacity: 0.8 * opacity
            },
            itemStyle: {
                color: currentTheme.minLine,
                borderColor: currentTheme.pointBorder,
                borderWidth: 1
            },
            emphasis: {
                focus: 'series',
                lineStyle: { width: 2.5 },
                itemStyle: {
                    borderWidth: 2,
                    shadowBlur: 10,
                    shadowColor: currentTheme.minLine
                }
            },
            connectNulls: false,
            smooth: false,
            z: 3,
            animation: true,
            animationDuration: 700,
            showSymbol: true,
            showAllSymbol: data.length < 100
        });
    }

    // Линия максимума
    if (showMax && maxData.length > 0) {
        series.push({
            name: `${fieldName} (max)`,
            type: 'line',
            data: maxData,
            symbol: 'circle',
            symbolSize: 4,
            sampling: 'lttb',
            lineStyle: {
                width: (lineStyle.width || 1.5) * 0.8,
                color: currentTheme.maxLine,
                type: lineStyle.type || 'dashed',
                opacity: 0.8 * opacity
            },
            itemStyle: {
                color: currentTheme.maxLine,
                borderColor: currentTheme.pointBorder,
                borderWidth: 1
            },
            emphasis: {
                focus: 'series',
                lineStyle: { width: 2.5 },
                itemStyle: {
                    borderWidth: 2,
                    shadowBlur: 10,
                    shadowColor: currentTheme.maxLine
                }
            },
            connectNulls: false,
            smooth: false,
            z: 3,
            animation: true,
            animationDuration: 700,
            showSymbol: true,
            showAllSymbol: data.length < 100
        });
    }

    // Основная линия среднего значения
    // avgData: Array<[number, number | null]>  // важно: null, не undefined

    if (showArea && avgData.length > 0) {
        const avgSeriesBase = {
            name: `${fieldName} (avg)`,
            type: 'line' as const,
            data: avgData,
            symbol: 'circle' as const,
            symbolSize: 6,
            sampling: 'lttb' as const,
            lineStyle: {
                width: lineStyle.width ?? 2.5,
                color: currentTheme.avgLine,
                type: lineStyle.type ?? 'solid',
                opacity: opacity,
                shadowBlur: 2,
                shadowColor: currentTheme.avgLine,
                shadowOffsetY: 2,
            },
            itemStyle: {
                color: currentTheme.avgLine,
                borderColor: currentTheme.pointBorder,
                borderWidth: 2,
            },
            emphasis: {
                focus: 'series' as const,
                lineStyle: { width: 3.5 },
                itemStyle: {
                    borderWidth: 3,
                    shadowBlur: 20,
                    shadowColor: currentTheme.avgLine,
                },
            },
            connectNulls: false,
            smooth: 0.1,
            progressive: 5000,
            progressiveThreshold: 10000,
            z: 5,
            animation: true,
            animationDuration: 700,
            showSymbol: true,
            showAllSymbol: data.length < 100,
            markLine: {
                silent: true,
                symbol: ['none', 'none'] as const,
                label: { position: 'insideEndTop', formatter: '{b}: {c}' },
                lineStyle: { color: currentTheme.avgLine, type: 'dashed', opacity: 0.5 },
                data: [{ type: 'average' as const, name: 'Среднее' }],
            },
        };

        // Собираем markArea только если есть разрывы,
        // иначе СОВСЕМ не добавляем свойство (из-за exactOptionalPropertyTypes)
        const markAreaPart =
            gaps.length > 0
                ? {
                    markArea: {
                        silent: true,
                        // общий стиль области (задаём на уровне markArea)
                        itemStyle: {
                            color: 'rgba(255, 120, 117, 0.1)',
                            borderColor: currentTheme.gap,
                            borderWidth: 1,
                            borderType: 'dashed' as const,
                        },
                        // пары [from, to] по оси x
                        data: gaps.map(gap => [
                            { xAxis: gap.from },
                            { xAxis: gap.to },
                        ]),
                    },
                } as LineSeriesOption
                : {} as LineSeriesOption;

        series.push({
            ...avgSeriesBase,
            ...markAreaPart,
        } as LineSeriesOption);
    }



    // Вычисляем позицию слайдера
    let sliderStart = 0;
    let sliderEnd = 100;

    if (visibleRange) {
        try {
            const domainStart = domain.from.getTime();
            const domainEnd = domain.to.getTime();
            const domainSpan = domainEnd - domainStart;

            const visibleStart = visibleRange.from.getTime();
            const visibleEnd = visibleRange.to.getTime();

            sliderStart = ((visibleStart - domainStart) / domainSpan) * 100;
            sliderEnd = ((visibleEnd - domainStart) / domainSpan) * 100;

            sliderStart = Math.max(0, Math.min(100, sliderStart));
            sliderEnd = Math.max(0, Math.min(100, sliderEnd));
        } catch (error) {
            console.warn('Error calculating slider position:', error);
        }
    }

    // Конфигурация графика
    return {
        backgroundColor: currentTheme.background,
        animation: true,
        animationDuration: 700,
        animationEasing: 'cubicOut',

        grid: {
            top: 60,
            left: 70,
            right: 30,
            bottom: showMinimap ? 90 : 50,
            containLabel: true
        },

        // В createChartOption, секция tooltip
        tooltip: hasData ? {
            trigger: 'axis',
            confine: true,
            transitionDuration: 0,
            axisPointer: {
                type: 'cross',
                animation: false, // Отключаем анимацию
                snap: true,
                label: {
                    backgroundColor: '#6a7985',
                    borderColor: '#6a7985',
                    shadowBlur: 0
                }
            },
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderWidth: 1,
            borderColor: '#ccc',
            padding: 10,
            textStyle: { color: '#333' },
            formatter: (params: any) => {
                try {
                    // КРИТИЧЕСКАЯ ПРОВЕРКА: есть ли вообще данные в series
                    if (!series || series.length === 0) {
                        return 'Нет данных';
                    }

                    // Проверяем что есть хотя бы одна серия с данными
                    const hasSeriesData = series.some(s =>
                        s.data && Array.isArray(s.data) && s.data.length > 0
                    );

                    if (!hasSeriesData) {
                        return 'Загрузка...';
                    }

                    if (!params) return '';

                    const paramsArray = Array.isArray(params) ? params : [params];
                    if (paramsArray.length === 0) return 'Нет данных';

                    // Фильтруем только валидные параметры
                    const validParams = paramsArray.filter((item: any) => {
                        // Проверяем что у параметра есть shared и seriesIndex
                        return item &&
                            item.data !== undefined &&
                            item.seriesIndex !== undefined &&
                            item.seriesIndex < series.length;
                    });

                    if (validParams.length === 0) return 'Нет данных';

                    // Безопасно вызываем formatter
                    const formatter = createTooltipFormatter({
                        fieldName,
                        data: data || [], // Защита от undefined
                        bucketMs,
                        timeZone,
                        useTimeZone
                    });

                    return formatter(validParams);
                } catch (error) {
                    console.error('Tooltip formatter error:', error);
                    return fieldName;
                }
            }
        } : { show: false }, // Если нет данных - отключаем tooltip полностью

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

        xAxis: {
            type: 'time' as const,
            boundaryGap: [0, 0] as const,   // <= для time/value осей нужен кортеж, не boolean
            min: domain.from.getTime(),
            max: domain.to.getTime(),

            axisLine: { lineStyle: { color: currentTheme.grid } },

            axisLabel: {
                color: currentTheme.text,
                rotate: 45,
                interval: 'auto' as const,
                showMinLabel: true,
                showMaxLabel: true,
                fontSize: 11,
                // (value, index) => string; value: ScaleDataValue (number|string|Date)
                formatter: (value: number | string | Date, _index: number) => {
                    try {
                        const ts =
                            value instanceof Date
                                ? value.getTime()
                                : typeof value === 'string'
                                    ? Number(value)
                                    : value; // number

                        if (!Number.isFinite(ts)) return '';

                        const date = new Date(ts);
                        if (Number.isNaN(date.getTime())) return '';

                        if (useTimeZone && timeZone) {
                            return date.toLocaleString('ru-RU', {
                                timeZone,
                                month: 'short',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                            });
                        }
                        return formatTimeByBucket(date, bucketMs);
                    } catch {
                        return '';
                    }
                },
            },

            splitLine: {
                show: true,
                lineStyle: {
                    color: currentTheme.grid,
                    type: 'dashed' as const,
                    opacity: 0.3,
                },
            },

            axisPointer: {
                show: true,
                snap: true,
                label: {
                    // formatter(params) => string; params.value: ScaleDataValue
                    formatter: (params: { value: number | string | Date }) => {
                        try {
                            const raw = params.value;
                            const ts =
                                raw instanceof Date
                                    ? raw.getTime()
                                    : typeof raw === 'string'
                                        ? Number(raw)
                                        : raw; // number

                            if (!Number.isFinite(ts)) return '';

                            const date = new Date(ts);
                            if (Number.isNaN(date.getTime())) return '';

                            if (useTimeZone && timeZone) {
                                return date.toLocaleString('ru-RU', {
                                    timeZone,
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                });
                            }
                            return formatTimeByBucket(date, bucketMs);
                        } catch {
                            return '';
                        }
                    },
                },
            },
        },

        yAxis: {
            type: 'value' as const,
            name: fieldName,
            nameTextStyle: {
                color: currentTheme.text,
                fontSize: 14,
                fontWeight: 'bold',
            },
            scale: true,
            axisLine: {
                show: true,
                lineStyle: { color: currentTheme.grid },
            },
            axisLabel: {
                color: currentTheme.text,
                // для value-оси форматтер (value, index) => string | number
                formatter: (value: number | string , _index?: number) => {
                    try {
                        const v = typeof value === 'string' ? Number(value) : value;
                        if (!Number.isFinite(v)) return '';
                        if (v === 0) return '0';
                        const abs = Math.abs(v);
                        if (abs >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B';
                        if (abs >= 1_000_000)     return (v / 1_000_000).toFixed(1) + 'M';
                        if (abs >= 1_000)         return (v / 1_000).toFixed(1) + 'K';
                        if (abs < 0.01)           return v.toExponential(2);
                        return v.toFixed(2);
                    } catch {
                        return String(value);
                    }
                },
            },
            splitLine: {
                lineStyle: {
                    color: currentTheme.grid,
                    type: 'dashed' as const,
                    opacity: 0.3,
                },
            },
            axisPointer: {
                show: true,
                label: {
                    // СТРОГО: принимает LabelFormatterParams из echarts v6
                    formatter: (params: LabelFormatterParams): string => {
                        try {
                            const raw = params.value as ScaleDataValue;
                            const num =
                                raw instanceof Date
                                    ? raw.getTime()
                                    : typeof raw === 'string'
                                        ? Number(raw)
                                        : raw; // number

                            if (!Number.isFinite(num)) return '';
                            return num.toFixed(2);
                        } catch {
                            return '';
                        }
                    },
                },
            },
        },


        // КРИТИЧНО: всегда используем filterMode: 'none' чтобы избежать getRawIndex ошибок
        dataZoom: hasData ? [
            // X: Ctrl + колесо — зум по времени
            {
                type: 'inside' as const,
                xAxisIndex: 0,
                start: sliderStart,
                end: sliderEnd,
                filterMode: 'none' as const,
                zoomOnMouseWheel: 'ctrl' as const,
                moveOnMouseMove: true,
                moveOnMouseWheel: false,
                preventDefaultMouseMove: false,
                zoomLock: false,
                throttle: 100,
                minValueSpan: 1000,
                maxValueSpan: domain.to.getTime() - domain.from.getTime(),
            },

            // Y: Shift + колесо — «растяжка» по вертикали
            {
                type: 'inside' as const,
                yAxisIndex: 0,
                filterMode: 'none' as const,
                zoomOnMouseWheel: 'shift' as const,
                moveOnMouseWheel: false,
                throttle: 100,
            },

            // Слайдер-минимап по X
            ...(showMinimap ? [{
                type: 'slider' as const,
                xAxisIndex: 0,
                start: sliderStart,
                end: sliderEnd,
                height: 30,
                bottom: 10,
                borderColor: currentTheme.grid,
                backgroundColor: 'rgba(47,69,84,0.05)',
                dataBackground: {
                    lineStyle: { color: currentTheme.avgLine, width: 1 },
                    areaStyle: { color: currentTheme.avgLine, opacity: 0.2 },
                },
                fillerColor: 'rgba(70,130,180,0.15)',
                handleIcon:
                    'path://M10.7,11.9H9.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4h1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z',
                handleSize: '100%',
                handleStyle: {
                    color: currentTheme.avgLine,
                    shadowBlur: 3,
                    shadowColor: 'rgba(0, 0, 0, 0.3)',
                    shadowOffsetX: 2,
                    shadowOffsetY: 2,
                },
                textStyle: { color: currentTheme.text, fontSize: 11 },
                moveHandleSize: 7,

                // ВАЖНО: в v6 handleLabel обязателен внутри emphasis
                emphasis: {
                    handleLabel: { show: false }, // минимально допустимый объект
                    handleStyle: {
                        borderColor: currentTheme.avgLine,
                        shadowBlur: 10,
                        shadowColor: currentTheme.avgLine,
                    },
                    // moveHandleStyle можно не задавать — он опционален
                },

                filterMode: 'none' as const,
                realtime: true,
                throttle: 100,
            }] : []),
        ] : [],


        ...(enableBrush ? {
            brush: {
                xAxisIndex: 0,
                brushLink: 'all',
                outOfBrush: { colorAlpha: 0.1 }
            }
        } : {}),

        series: series
    } as EChartsOption;


}