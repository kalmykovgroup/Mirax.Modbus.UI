// hooks/useYAxisRange.ts

import { useState, useCallback, useMemo } from 'react';
import type {EChartsPoint} from "@chartsPage/charts/core/store/selectors/visualization.selectors.ts";

export interface YAxisRange {
    readonly min: number;
    readonly max: number;
}

export interface YAxisRangeControl {
    readonly currentRange: YAxisRange;
    readonly optimalRange: YAxisRange;
    readonly isCustom: boolean;
    readonly setCustomMin: (min: number) => void;
    readonly setCustomMax: (max: number) => void;
    readonly multiplyMin: (factor: number) => void;
    readonly multiplyMax: (factor: number) => void;
    readonly reset: () => void;
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
export function calculateYAxisBounds(
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

export function useYAxisRange(
    optimalMin: number,
    optimalMax: number
): YAxisRangeControl {
    const [customMin, setCustomMin] = useState<number | undefined>(undefined);
    const [customMax, setCustomMax] = useState<number | undefined>(undefined);

    const optimalRange = useMemo<YAxisRange>(() => ({
        min: optimalMin,
        max: optimalMax
    }), [optimalMin, optimalMax]);

    const currentRange = useMemo<YAxisRange>(() => ({
        min: customMin ?? optimalMin,
        max: customMax ?? optimalMax
    }), [customMin, customMax, optimalMin, optimalMax]);

    const isCustom = customMin !== undefined || customMax !== undefined;

    const handleSetCustomMin = useCallback((min: number) => {
        setCustomMin(min);
    }, []);

    const handleSetCustomMax = useCallback((max: number) => {
        setCustomMax(max);
    }, []);

    const multiplyMin = useCallback((factor: number) => {
        const current = customMin ?? optimalMin;
        setCustomMin(current * factor);
    }, [customMin, optimalMin]);

    const multiplyMax = useCallback((factor: number) => {
        const current = customMax ?? optimalMax;
        setCustomMax(current * factor);
    }, [customMax, optimalMax]);

    const reset = useCallback(() => {
        setCustomMin(undefined);
        setCustomMax(undefined);
    }, []);

    return {
        currentRange,
        optimalRange,
        isCustom,
        setCustomMin: handleSetCustomMin,
        setCustomMax: handleSetCustomMax,
        multiplyMin,
        multiplyMax,
        reset
    };
}