// charts/ui/CharContainer/ChartCollection/FieldChart/utils.ts

import type { ChartBucketingConfig } from '@charts/store/chartsSettingsSlice';

/**
 * Форматирует размер bucket в человекочитаемый вид
 */
export function formatBucketSize(bucketMs: number): string {
    const seconds = Math.floor(bucketMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years} год${years > 1 ? 'а' : ''}`;
    if (months > 0) return `${months} мес.`;
    if (weeks > 0) return `${weeks} нед.`;
    if (days > 0) return `${days} д.`;
    if (hours > 0) return `${hours} ч.`;
    if (minutes > 0) return `${minutes} мин.`;
    if (seconds > 0) return `${seconds} сек.`;
    return `${bucketMs} мс`;
}

/**
 * Форматирует время в зависимости от размера bucket
 */
export function formatTimeByBucket(date: Date, bucketMs: number): string {
    const seconds = Math.floor(bucketMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        // Для дней и больше - показываем дату без времени
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } else if (hours > 0) {
        // Для часов - показываем дату и часы
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        // Для минут и секунд - полное время
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

/**
 * Интерфейс для параметров расчета bucket
 */
export interface BucketCalculationParams {
    containerWidthPx: number;
    from: Date;
    to: Date;
    config: ChartBucketingConfig;
    maxBucketMs?: number | undefined;
    availableBuckets?: number[] | undefined;
}

/**
 * Результат расчета bucket
 */
interface BucketCalculationResult {
    selectedBucket: number;
    estimatedPoints: number;
    targetPoints: number;
    availableBuckets: number[];
    reason: 'optimal' | 'limited-by-max' | 'limited-by-min' | 'fallback';
}

/**
 * Фильтрует и подготавливает список доступных buckets
 */
export function getAvailableBuckets(
    config: ChartBucketingConfig,
    maxBucketMs?: number,
    customBuckets?: number[]
): number[] {
    // Используем buckets из конфига или кастомный список
    let buckets = customBuckets || config.niceMilliseconds;

    // Фильтруем по максимальному значению если задано
    if (maxBucketMs && maxBucketMs > 0) {
        buckets = buckets.filter(ms => ms <= maxBucketMs);

        // Добавляем максимальный bucket если его нет в списке
        if (!buckets.includes(maxBucketMs)) {
            buckets.push(maxBucketMs);
        }
    }

    // Сортируем и убираем дубликаты
    return [...new Set(buckets)].sort((a, b) => a - b);
}

/**
 * Вычисляет целевое количество точек на основе конфигурации
 */
export function calculateTargetPoints(
    containerWidthPx: number,
    config: ChartBucketingConfig
): number {
    const targetPointsPerPx = config.targetPointsPerPx || 0.1;
    const minTargetPoints = config.minTargetPoints || 20;

    return Math.max(
        minTargetPoints,
        Math.floor(containerWidthPx * targetPointsPerPx)
    );
}

/**
 * Основная функция расчета оптимального bucket
 * Централизованная логика без дублирования
 */
export function calculateOptimalBucket(params: BucketCalculationParams): BucketCalculationResult {
    const { containerWidthPx, from, to, config, maxBucketMs, availableBuckets: customBuckets } = params;

    // Защита от некорректных параметров
    if (!from || !to || containerWidthPx <= 0) {
        console.warn('Invalid parameters for bucket calculation');
        return {
            selectedBucket: 60000,
            estimatedPoints: 0,
            targetPoints: 0,
            availableBuckets: [],
            reason: 'fallback'
        };
    }

    const rangeMs = to.getTime() - from.getTime();

    // Защита от нулевого или отрицательного диапазона
    if (rangeMs <= 0) {
        console.warn('Invalid time range for bucket calculation');
        return {
            selectedBucket: 60000,
            estimatedPoints: 0,
            targetPoints: 0,
            availableBuckets: [],
            reason: 'fallback'
        };
    }

    // Получаем список доступных buckets
    const availableBuckets = getAvailableBuckets(config, maxBucketMs, customBuckets);

    if (availableBuckets.length === 0) {
        console.warn('No available buckets');
        return {
            selectedBucket: 60000,
            estimatedPoints: 0,
            targetPoints: 0,
            availableBuckets: [],
            reason: 'fallback'
        };
    }

    // Вычисляем целевое количество точек
    const targetPoints = calculateTargetPoints(containerWidthPx, config);

    // Вычисляем идеальный bucket
    const idealBucketMs = rangeMs / targetPoints;

    // Находим оптимальный bucket из доступных
    let selectedBucket = availableBuckets[availableBuckets.length - 1]!;
    let reason: BucketCalculationResult['reason'] = 'optimal';

    // Стратегия выбора: ищем bucket, который даст количество точек близкое к целевому
    for (const bucketMs of availableBuckets) {
        const pointsCount = Math.floor(rangeMs / bucketMs);

        // Выбираем bucket если он дает приемлемое количество точек
        // Коэффициент 1.5 дает небольшой запас для избежания слишком частых переключений
        if (pointsCount <= targetPoints * 1.5) {
            selectedBucket = bucketMs;
            break;
        }
    }

    // Проверка ограничений
    const estimatedPoints = Math.floor(rangeMs / selectedBucket);

    // Проверка на слишком мало точек
    if (estimatedPoints < config.minTargetPoints) {
        const index = availableBuckets.indexOf(selectedBucket);
        if (index > 0) {
            const smallerBucket = availableBuckets[index - 1]!;
            const newPoints = Math.floor(rangeMs / smallerBucket);

            // Максимум 5000 точек для производительности
            const MAX_POINTS = 5000;
            if (newPoints <= MAX_POINTS) {
                selectedBucket = smallerBucket;
                reason = 'limited-by-min';
            }
        }
    }

    // Проверка на слишком много точек
    const MAX_POINTS = 5000;
    if (estimatedPoints > MAX_POINTS) {
        // Ищем больший bucket
        for (let i = availableBuckets.length - 1; i >= 0; i--) {
            const bucketMs = availableBuckets[i]!;
            const points = Math.floor(rangeMs / bucketMs);
            if (points <= MAX_POINTS) {
                selectedBucket = bucketMs;
                reason = 'limited-by-max';
                break;
            }
        }
    }

    const finalEstimatedPoints = Math.floor(rangeMs / selectedBucket);

    console.log('Bucket calculation:', {
        range: formatBucketSize(rangeMs),
        containerWidth: containerWidthPx,
        targetPoints,
        idealBucket: formatBucketSize(idealBucketMs),
        selectedBucket: formatBucketSize(selectedBucket),
        estimatedPoints: finalEstimatedPoints,
        reason,
        availableBucketsCount: availableBuckets.length
    });

    return {
        selectedBucket,
        estimatedPoints: finalEstimatedPoints,
        targetPoints,
        availableBuckets,
        reason
    };
}

/**
 * Упрощенная обертка для обратной совместимости
 * @deprecated Используйте calculateOptimalBucket напрямую
 */
export function pickBucketMsFor(
    containerWidthPx: number,
    from: Date,
    to: Date,
    config: ChartBucketingConfig,
    maxBucketMs?: number
): number {
    const result = calculateOptimalBucket({
        containerWidthPx,
        from,
        to,
        config,
        maxBucketMs
    } as BucketCalculationParams);

    return result.selectedBucket;
}

/**
 * Определяет, нужно ли переключить уровень детализации
 * Использует гистерезис для избежания частых переключений
 */
export function shouldSwitchBucket(
    currentBucketMs: number,
    newBucketMs: number,
    hysteresisRatio: number = 2
): boolean {
    if (currentBucketMs === newBucketMs) return false;

    const ratio = newBucketMs / currentBucketMs;

    // Переключаем только если разница существенная
    return ratio > hysteresisRatio || ratio < (1 / hysteresisRatio);
}

/**
 * Вычисляет покрытие данными для заданного диапазона
 */
export function calculateCoverage(
    data: Array<{ t: Date }>,
    from: Date,
    to: Date,
    bucketMs: number
): number {
    if (data.length === 0) return 0;

    const rangeMs = to.getTime() - from.getTime();
    const expectedPoints = Math.floor(rangeMs / bucketMs);

    if (expectedPoints === 0) return 100;

    const actualPoints = data.filter(d => {
        const time = d.t.getTime();
        return time >= from.getTime() && time <= to.getTime();
    }).length;

    return Math.min(100, Math.round((actualPoints / expectedPoints) * 100));
}

/**
 * Находит разрывы в данных
 */
export function findDataGaps(
    data: Array<{ t: Date }>,
    bucketMs: number,
    threshold: number = 2
): Array<{ from: Date; to: Date; duration: number }> {
    const gaps: Array<{ from: Date; to: Date; duration: number }> = [];

    if (data.length < 2) return gaps;

    // Сортируем данные по времени
    const sortedData = [...data].sort((a, b) => a.t.getTime() - b.t.getTime());

    for (let i = 1; i < sortedData.length; i++) {
        const prevTime = sortedData[i - 1]!.t.getTime();
        const currTime = sortedData[i]!.t.getTime();
        const gap = currTime - prevTime;

        // Если разрыв больше порогового значения
        if (gap > bucketMs * threshold) {
            gaps.push({
                from: new Date(prevTime + bucketMs),
                to: new Date(currTime - bucketMs),
                duration: gap
            });
        }
    }

    return gaps;
}

/**
 * Анализирует качество данных
 */
export interface DataQuality {
    coverage: number;
    gapsCount: number;
    density: number;
    quality: 'good' | 'medium' | 'poor';
}

export function analyzeDataQuality(
    data: Array<{ t: Date }>,
    from: Date,
    to: Date,
    bucketMs: number,
    containerWidth: number
): DataQuality {
    const coverage = calculateCoverage(data, from, to, bucketMs);
    const gaps = findDataGaps(data, bucketMs);
    const visibleData = data.filter(d => {
        const time = d.t.getTime();
        return time >= from.getTime() && time <= to.getTime();
    });
    const density = containerWidth > 0 ? visibleData.length / containerWidth : 0;

    let quality: 'good' | 'medium' | 'poor' = 'poor';
    if (coverage > 80 && gaps.length === 0) {
        quality = 'good';
    } else if (coverage > 50) {
        quality = 'medium';
    }

    return {
        coverage,
        gapsCount: gaps.length,
        density,
        quality
    };
}