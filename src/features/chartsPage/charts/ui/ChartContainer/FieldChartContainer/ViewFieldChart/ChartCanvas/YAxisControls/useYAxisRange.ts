// hooks/useYAxisRange.ts

import { useState, useCallback, useMemo } from 'react';

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