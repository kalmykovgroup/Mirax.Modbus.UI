// hooks/useEChartsOptions.ts
// Мемоизация ECharts options для оптимизации рендеринга

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { EChartsPoint } from '@charts/charts/core/store/selectors/visualization.selectors';

// ============================================
// ТИПЫ
// ============================================

interface UseEChartsOptionsParams {
    readonly points: readonly EChartsPoint[];
    readonly fieldName: string;
    readonly isEmpty: boolean;
}

// ============================================
// ХУК
// ============================================

/**
 * Создаёт мемоизированные ECharts options
 * Пересоздаёт только при изменении данных
 */
export function useEChartsOptions({
                                      points,
                                      fieldName,
                                      isEmpty
                                  }: UseEChartsOptionsParams): EChartsOption {
    return useMemo(() => {
        if (isEmpty || points.length === 0) {
            return createEmptyOptions(fieldName);
        }

        return createChartOptions(points, fieldName);
    }, [points, fieldName, isEmpty]);
}

// ============================================
// СОЗДАНИЕ OPTIONS
// ============================================

function createChartOptions(
    points: readonly EChartsPoint[],
    fieldName: string
): EChartsOption {
    return {
        // UTC для корректной работы с временем
        useUTC: true,

        // Тайтл
        title: {
            text: fieldName,
            left: 'center',
            textStyle: {
                fontSize: 16,
                fontWeight: 'bold'
            }
        },

        // Тултип
        tooltip: {
            trigger: 'axis',
            formatter: (params: any) => {
                if (!Array.isArray(params) || params.length === 0) {
                    return '';
                }

                const point = params[0];
                const time = new Date(point.value[0]).toLocaleString('ru-RU');
                const value = point.value[1].toFixed(2);

                return `${time}<br/>${fieldName}: <b>${value}</b>`;
            }
        },

        // Ось X (время)
        xAxis: {
            type: 'time',
            axisLabel: {
                formatter: '{HH}:{mm}',
                rotate: 0
            },
            splitLine: {
                show: false
            }
        },

        // Ось Y (значения)
        yAxis: {
            type: 'value',
            scale: true,
            splitLine: {
                show: true,
                lineStyle: {
                    color: '#E0E0E0'
                }
            }
        },

        // Сетка
        grid: {
            left: 60,
            right: 20,
            top: 60,
            bottom: 60
        },

        // DataZoom (zoom/pan)
        dataZoom: [
            {
                type: 'inside',
                xAxisIndex: 0,
                minValueSpan: 60000  // ← Ограничение минимального диапазона
            },
            {
                type: 'slider',
                xAxisIndex: 0,
                minValueSpan: 60000
            }
        ],

        // Серия данных
        series: [
            {
                name: fieldName,
                type: 'line',
                data: points as any,
                sampling: 'lttb', // встроенный downsampling ECharts
                smooth: false,
                symbol: 'none', // не показываем точки
                lineStyle: {
                    width: 2,
                    color: '#4A90E2'
                },
                emphasis: {
                    lineStyle: {
                        width: 3
                    }
                }
            }
        ],

        // Анимация
        animation: true,
        animationDuration: 300,
        animationEasing: 'cubicOut'
    };
}

function createEmptyOptions(fieldName: string): EChartsOption {
    return {
        title: {
            text: fieldName,
            left: 'center',
            textStyle: {
                fontSize: 16,
                fontWeight: 'bold'
            }
        },
        xAxis: {
            type: 'time'
        },
        yAxis: {
            type: 'value'
        },
        series: []
    };
}