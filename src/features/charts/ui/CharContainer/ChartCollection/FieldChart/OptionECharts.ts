// charts/ui/CharContainer/ChartCollection/FieldChart/OptionECharts.ts

import type {EChartsOption, LineSeriesOption} from 'echarts';
import {formatTimeByBucket} from './utils';
import type {SeriesBinDto} from "@charts/shared/contracts/chart/Dtos/SeriesBinDto.ts";
import {
    createTooltipFormatter
} from "@charts/ui/CharContainer/ChartCollection/FieldChart/ChartTooltip/tooltipBuilder.ts";

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
    showMinMaxArea?: boolean;
    timeZone?: string;
    useTimeZone?: boolean;
}

// Утилита для поиска разрывов в данных
function findDataGaps(
    data: SeriesBinDto[],
    bucketMs: number,
    threshold = 2
): Array<{ from: number; to: number }> {
    const gaps: Array<{ from: number; to: number }> = [];

    if(data.length < 2) return gaps;

    for (let i = 1; i < data.length; i++) {
        const prevTime = new Date(data[i - 1]!.t).getTime();
        const currTime = new Date(data[i]!.t).getTime();
        const gap = currTime - prevTime;

        if (gap > bucketMs * threshold) {
            gaps.push({
                from: prevTime + bucketMs,
                to: currTime - bucketMs
            });
        }
    }

    return gaps;
}

// Подготовка данных для всех трёх линий
function prepareAllSeriesData(
    data: SeriesBinDto[],
    useTimeZone: boolean,
    timeZone?: string
): {
    avgData: Array<[number, number | null]>;
    minData: Array<[number, number | null]>;
    maxData: Array<[number, number | null]>;
} {
    // ВАЖНО: НЕ конвертируем временные метки, используем их как есть
    // ECharts работает с миллисекундами Unix timestamp, которые не зависят от временной зоны
    const avgData: Array<[number, number | null]> = data.map(bin =>
        [bin.t.getTime(), bin.avg] as [number, number | null]
    );
    const minData: Array<[number, number | null]> = data.map(bin =>
        [bin.t.getTime(), bin.min] as [number, number | null]
    );
    const maxData: Array<[number, number | null]> = data.map(bin =>
        [bin.t.getTime(), bin.max] as [number, number | null]
    );

    return { avgData, minData, maxData };
}

export function createChartOption(params: ChartOptionParams): EChartsOption {
    const {
        data,
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
        showMinMaxArea = true,
        timeZone = 'UTC',
        useTimeZone = false
    } = params;


    // Темы с улучшенной видимостью
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
    const gaps = showDataGaps ? findDataGaps(data, bucketMs) : [];
    const { avgData, minData, maxData } = prepareAllSeriesData(data, useTimeZone, timeZone);

    const series: LineSeriesOption[] = [];

    // Область между min и max с улучшенной видимостью
    if (showMinMaxArea && data.length > 0) {
        // Заполнение области между min и max
        series.push({
            name: `${fieldName} Range`,
            type: 'line',
            data: minData,
            lineStyle: { opacity: 0 },
            stack: 'confidence',
            symbol: 'none',
            areaStyle: {
                color: currentTheme.minMaxArea,
                opacity: 0.7
            },
            z: 1,
            silent: true,
            animation: false
        });

        series.push({
            name: `${fieldName} Range Top`,
            type: 'line',
            data: maxData.map((point, index) => {
                const minValue = minData[index]?.[1];
                const maxValue = point[1];
                if (minValue === null || minValue == undefined || maxValue === null) return [point[0], null];
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
    series.push({
        name: `${fieldName} (min)`,
        type: 'line',
        data: minData || [],
        symbol: 'circle',
        symbolSize: 4,
        sampling: 'lttb',
        lineStyle: {
            width: 1.5,
            color: currentTheme.minLine,
            type: 'dashed',
            opacity: 0.8
        },
        itemStyle: {
            color: currentTheme.minLine,
            borderColor: currentTheme.pointBorder,
            borderWidth: 1
        },
        emphasis: {
            focus: 'series',
            lineStyle: {
                width: 2.5
            },
            itemStyle: {
                borderWidth: 2,
                shadowBlur: 10,
                shadowColor: currentTheme.minLine
            }
        },
        connectNulls: false,
        smooth: false,
        large: true,
        largeThreshold: 2000,
        z: 3,
        animation: true,
        animationDuration: 300,
        showSymbol: true,
        showAllSymbol: data.length < 100
    });

// Линия максимума
    series.push({
        name: `${fieldName} (max)`,
        type: 'line',
        data: maxData || [],
        symbol: 'circle',
        symbolSize: 4,
        sampling: 'lttb',
        lineStyle: {
            width: 1.5,
            color: currentTheme.maxLine,
            type: 'dashed',
            opacity: 0.8
        },
        itemStyle: {
            color: currentTheme.maxLine,
            borderColor: currentTheme.pointBorder,
            borderWidth: 1
        },
        emphasis: {
            focus: 'series',
            lineStyle: {
                width: 2.5
            },
            itemStyle: {
                borderWidth: 2,
                shadowBlur: 10,
                shadowColor: currentTheme.maxLine
            }
        },
        connectNulls: false,
        smooth: false,
        large: true,
        largeThreshold: 2000,
        z: 3,
        animation: true,
        animationDuration: 300,
        showSymbol: true,
        showAllSymbol: data.length < 100
    });

// Основная линия среднего значения
    series.push({
        name: `${fieldName} (avg)`,
        type: 'line',
        data: avgData || [],
        symbol: 'circle',
        symbolSize: 6,
        sampling: 'lttb',
        lineStyle: {
            width: 2.5,
            color: currentTheme.avgLine,
            shadowBlur: 2,
            shadowColor: currentTheme.avgLine,
            shadowOffsetY: 2
        },
        itemStyle: {
            color: currentTheme.avgLine,
            borderColor: currentTheme.pointBorder,
            borderWidth: 2
        },
        emphasis: {
            focus: 'series',
            scale: 1.5,
            lineStyle: {
                width: 3.5
            },
            itemStyle: {
                borderWidth: 3,
                shadowBlur: 20,
                shadowColor: currentTheme.avgLine
            }
        },
        connectNulls: false,
        smooth: 0.1,
        large: true,
        largeThreshold: 2000,
        progressive: 5000,
        progressiveThreshold: 10000,
        z: 5,
        animation: true,
        animationDuration: 300,
        showSymbol: true,
        showAllSymbol: data.length < 100,

        markArea: {
            silent: true,
            data: [
                // Разрывы в данных
                ...gaps.map(gap => [
                    {
                        xAxis: gap.from,
                        itemStyle: {
                            color: 'rgba(255, 120, 117, 0.1)',
                            borderColor: currentTheme.gap,
                            borderWidth: 1,
                            borderType: 'dashed'
                        }
                    },
                    { xAxis: gap.to }
                ])
            ]
        },

        markLine: {
            silent: true,
            symbol: ['none', 'none'],
            label: {
                position: 'insideEndTop',
                formatter: '{b}: {c}'
            },
            lineStyle: {
                color: currentTheme.avgLine,
                type: 'dashed',
                opacity: 0.5
            },
            data: [
                { type: 'average', name: 'Среднее' }
            ]
        }
    });

    // Вычисляем начальную позицию слайдера
    let sliderStart = 0;
    let sliderEnd = 100;

    if (visibleRange) {
        const domainStart = domain.from.getTime();
        const domainEnd = domain.to.getTime();
        const domainSpan = domainEnd - domainStart;

        const visibleStart = visibleRange.from.getTime();
        const visibleEnd = visibleRange.to.getTime();

        // Вычисляем проценты для слайдера
        sliderStart = ((visibleStart - domainStart) / domainSpan) * 100;
        sliderEnd = ((visibleEnd - domainStart) / domainSpan) * 100;

        // Ограничиваем значения диапазоном 0-100
        sliderStart = Math.max(0, Math.min(100, sliderStart));
        sliderEnd = Math.max(0, Math.min(100, sliderEnd));
    }

    return {
        backgroundColor: currentTheme.background,
        animation: true,
        animationDuration: 300,
        animationEasing: 'cubicOut',

        grid: {
            top: 60,
            left: 70,
            right: 30,
            bottom: showMinimap ? 90 : 50,
            containLabel: true
        },

        tooltip: {
            trigger: 'axis',
            confine: true,
            transitionDuration: 0,
            axisPointer: {
                type: 'cross',
                animation: true,
                snap: true,
                label: {
                    backgroundColor: '#6a7985',
                    borderColor: '#6a7985',
                    shadowBlur: 0
                },
                crossStyle: {
                    color: '#999',
                    width: 1,
                    type: 'dashed'
                }
            },
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderWidth: 1,
            borderColor: '#ccc',
            padding: 10,
            textStyle: {
                color: '#333'
            },
            formatter: (params: any) => {
                try {
                    // Дополнительная проверка валидности params
                    if (!params || !Array.isArray(params) || params.length === 0) {
                        return '';
                    }

                    // Проверяем что у каждого элемента есть необходимые данные
                    const validParams = params.filter((item: any) =>
                        item &&
                        item.data !== undefined &&
                        item.seriesName !== undefined
                    );

                    if (validParams.length === 0) {
                        return '';
                    }

                    const formatter = createTooltipFormatter({
                        fieldName,
                        data,
                        bucketMs,
                        timeZone,
                        useTimeZone
                    });

                    return formatter(validParams);
                } catch (error) {
                    console.warn('Tooltip formatter error:', error);
                    if (params && params[0]) {
                        const date = new Date(params[0].axisValue);
                        return `${fieldName}<br/>${date.toLocaleString()}`;
                    }
                    return '';
                }
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
                restore: {
                    title: 'Восстановить'
                },
                saveAsImage: {
                    pixelRatio: 2,
                    title: 'Сохранить как изображение'
                }
            },
            right: 10,
            top: 10
        },

        xAxis: {
            type: 'time',
            boundaryGap: false,
            min: domain.from.getTime(),
            max: domain.to.getTime(),
            axisLine: {
                lineStyle: {
                    color: currentTheme.grid
                }
            },
            axisLabel: {
                color: currentTheme.text,
                rotate: 45,  // Поворот меток на 45 градусов
                interval: 'auto',  // Автоматический интервал или 0 для показа всех меток
                showMinLabel: true,  // Всегда показывать первую метку
                showMaxLabel: true,  // Всегда показывать последнюю метку
                fontSize: 11,  // Размер шрифта
                formatter: (value: number) => {
                    try {
                        const date = new Date(value);
                        if (useTimeZone && timeZone) {
                            // Упрощенный формат для вертикальных меток
                            return date.toLocaleString('ru-RU', {
                                timeZone: timeZone,
                                month: 'short',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                        }
                        return formatTimeByBucket(date, bucketMs);
                    } catch {
                        return '';
                    }
                }
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: currentTheme.grid,
                    type: 'dashed',
                    opacity: 0.3
                }
            },
            axisPointer: {
                show: true,
                snap: true,
                label: {
                    formatter: (params: { value: number }) => {
                        try {
                            const date = new Date(params.value);
                            if (useTimeZone && timeZone) {
                                return date.toLocaleString('ru-RU', {
                                    timeZone: timeZone,
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                });
                            }
                            return formatTimeByBucket(date, bucketMs);
                        } catch (error) {
                            return '';
                        }
                    }
                }
            }
        },

        yAxis: {
            type: 'value',
            name: fieldName,
            nameTextStyle: {
                color: currentTheme.text,
                fontSize: 14,
                fontWeight: 'bold'
            },
            scale: true,
            axisLine: {
                show: true,
                lineStyle: {
                    color: currentTheme.grid
                }
            },
            axisLabel: {
                color: currentTheme.text,
                formatter: (value: number) => {
                    try {
                        if (value === 0) return '0';
                        const absValue = Math.abs(value);
                        if (absValue >= 1000000000) {
                            return (value / 1000000000).toFixed(1) + 'B';
                        }
                        if (absValue >= 1000000) {
                            return (value / 1000000).toFixed(1) + 'M';
                        }
                        if (absValue >= 1000) {
                            return (value / 1000).toFixed(1) + 'K';
                        }
                        if (absValue < 0.01) {
                            return value.toExponential(2);
                        }
                        return value.toFixed(2);
                    } catch {
                        return String(value);
                    }
                }
            },
            splitLine: {
                lineStyle: {
                    color: currentTheme.grid,
                    type: 'dashed',
                    opacity: 0.3
                }
            },
            axisPointer: {
                show: true,
                label: {
                    formatter: (params: { value: number }) => {
                        try {
                            return Number(params.value).toFixed(2);
                        } catch {
                            return '';
                        }
                    }
                }
            }
        },

        dataZoom: [
            {
                type: 'inside',
                xAxisIndex: 0,
                start: sliderStart,
                end: sliderEnd,
                filterMode: 'filter', // ВЕРНУЛИ обратно 'filter'
                zoomOnMouseWheel: true,
                moveOnMouseMove: true,
                moveOnMouseWheel: false,
                preventDefaultMouseMove: false,
                zoomLock: false,
                throttle: 100,
                minValueSpan: 1000, // Минимальный диапазон в миллисекундах
                maxValueSpan: domain.to.getTime() - domain.from.getTime() // Максимальный диапазон
            },
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
                    lineStyle: {
                        color: currentTheme.avgLine,
                        width: 1
                    },
                    areaStyle: {
                        color: currentTheme.avgLine,
                        opacity: 0.2
                    }
                },
                fillerColor: 'rgba(70,130,180,0.15)',
                handleIcon: 'path://M10.7,11.9H9.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4h1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z',
                handleSize: '100%',
                handleStyle: {
                    color: currentTheme.avgLine,
                    shadowBlur: 3,
                    shadowColor: 'rgba(0, 0, 0, 0.3)',
                    shadowOffsetX: 2,
                    shadowOffsetY: 2
                },
                textStyle: {
                    color: currentTheme.text,
                    fontSize: 11
                },
                moveHandleSize: 7,
                emphasis: {
                    handleStyle: {
                        borderColor: currentTheme.avgLine,
                        shadowBlur: 10,
                        shadowColor: currentTheme.avgLine
                    }
                },
                filterMode: 'filter', // ВЕРНУЛИ обратно 'filter'
                realtime: true,
                throttle: 100
            }] : [])
        ],

        ...(enableBrush ? {
            brush: {
                xAxisIndex: 0,
                brushLink: 'all',
                outOfBrush: {
                    colorAlpha: 0.1
                }
            }
        } : {}),

        series: series
    };
}