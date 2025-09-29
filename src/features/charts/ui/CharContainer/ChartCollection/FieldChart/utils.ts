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


