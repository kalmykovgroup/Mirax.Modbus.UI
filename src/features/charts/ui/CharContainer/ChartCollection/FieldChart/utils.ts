

import type { SeriesBinDto } from "@charts/shared/contracts/chart/Dtos/SeriesBinDto.ts";
import type {BucketingConfig} from "@charts/store/bucketing.ts";

// Форматирование времени
export function formatTimeByBucket(date: Date, bucketMs: number): string {
    const bucketSec = bucketMs / 1000;

    if (bucketSec < 60) {
        return date.toLocaleTimeString('ru-RU');
    } else if (bucketSec < 3600) {
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } else if (bucketSec < 86400) {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit'
        });
    } else {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }
}

export function formatBucketSize(bucketMs: number): string {
    const seconds = Math.floor(bucketMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}д`;
    if (hours > 0) return `${hours}ч`;
    if (minutes > 0) return `${minutes}м`;
    return `${seconds}с`;
}

// Выбор оптимального bucket
export function pickBucketMsFor(
    px: number,
    from: Date,
    to: Date,
    cfg: BucketingConfig
): number {
    const spanSec = Math.max(1, Math.round((to.getTime() - from.getTime()) / 1000));
    const target = Math.max(cfg.MinTargetPoints, Math.round(px * cfg.TargetPointsPerPx));
    const roughSec = Math.max(1, Math.floor(spanSec / Math.max(1, target)));

    const nice = [...cfg.NiceSeconds].sort((a, b) => a - b);
    const n = nice.find(s => s >= roughSec);
    if (n) return n * 1000;

    if (cfg.EnableWeeklyMultiples) {
        const week = 7 * 24 * 3600;
        const mult = Math.min(cfg.MaxWeeksMultiple, Math.max(1, Math.ceil(roughSec / week)));
        return mult * week * 1000;
    }

    return (nice.at(-1) ?? 604800) * 1000;
}

// Проверка необходимости переключения уровня
export function shouldSwitchBucket(
    currentBucketMs: number,
    px: number,
    from: Date,
    to: Date,
    cfg: BucketingConfig,
    lower = 0.7,
    upper = 1.3
): boolean {
    const target = Math.max(cfg.MinTargetPoints, Math.round(px * cfg.TargetPointsPerPx));
    const span = to.getTime() - from.getTime();
    const curBins = Math.ceil(span / Math.max(1, currentBucketMs));
    return curBins < lower * target || curBins > upper * target;
}

// Расчет плотности
export function calculateDensity(
    range: { from: number; to: number },
    px: number,
    bucketMs: number
): number {
    const span = range.to - range.from;
    const bins = Math.ceil(span / bucketMs);
    return bins / px;
}

// Поиск разрывов в данных SeriesBinDto
export function findDataGaps(
    data: SeriesBinDto[],
    bucketMs: number,
    threshold = 2
): Array<{ from: number; to: number }> {
    const gaps: Array<{ from: number; to: number }> = [];

    if(data.length < 1) return gaps;

    for (let i = 1; i < data.length; i++) {
        const prevTime = data[i - 1]!.t.getTime();
        const currTime = data[i]!.t.getTime();
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

// Расчет процента покрытия
export function calculateCoveragePercent(
    coverage: Array<{ from: number; to: number }>,
    visibleRange: { from: number; to: number }
): number {
    const totalSpan = visibleRange.to - visibleRange.from;
    if (totalSpan <= 0) return 0;

    let coveredSpan = 0;
    coverage.forEach(interval => {
        const start = Math.max(interval.from, visibleRange.from);
        const end = Math.min(interval.to, visibleRange.to);
        if (end > start) {
            coveredSpan += (end - start);
        }
    });

    return Math.round((coveredSpan / totalSpan) * 100);
}

// Подсчет видимых точек для SeriesBinDto
export function countVisiblePoints(
    data: SeriesBinDto[],
    visibleRange: { from: number; to: number }
): number {
    return data.filter(bin => {
        const time = new Date(bin.t).getTime();
        return time >= visibleRange.from && time <= visibleRange.to;
    }).length;
}

// Статистика данных для SeriesBinDto
export function calculateStats(
    data: SeriesBinDto[],
    valueType: 'avg' | 'min' | 'max' | 'count' = 'avg'
) {
    let values: number[] = [];

    switch (valueType) {
        case 'avg':
            values = data.filter(d => d.avg !== null).map(d => d.avg as number);
            break;
        case 'min':
            values = data.filter(d => d.min !== null).map(d => d.min as number);
            break;
        case 'max':
            values = data.filter(d => d.max !== null).map(d => d.max as number);
            break;
        case 'count':
            values = data.map(d => d.count);
            break;
    }

    if (!values.length) return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;

    return { min, max, avg, sum, count: values.length };
}

// Расширенная статистика для всех полей SeriesBinDto
export function calculateFullStats(data: SeriesBinDto[]) {
    const avgStats = calculateStats(data, 'avg');
    const minStats = calculateStats(data, 'min');
    const maxStats = calculateStats(data, 'max');
    const countStats = calculateStats(data, 'count');

    // Общее количество точек данных во всех бинах
    const totalDataPoints = data.reduce((sum, bin) => sum + bin.count, 0);

    // Статистика по наличию данных
    const binsWithData = data.filter(bin => bin.count > 0).length;
    const binsWithAvg = data.filter(bin => bin.avg !== null).length;
    const binsWithMin = data.filter(bin => bin.min !== null).length;
    const binsWithMax = data.filter(bin => bin.max !== null).length;

    return {
        totalBins: data.length,
        binsWithData,
        binsWithAvg,
        binsWithMin,
        binsWithMax,
        totalDataPoints,
        avg: avgStats,
        min: minStats,
        max: maxStats,
        count: countStats,
        // Процент покрытия данными
        coveragePercent: data.length > 0 ? Math.round((binsWithData / data.length) * 100) : 0
    };
}

// Фильтрация данных по временному диапазону
export function filterDataByTimeRange(
    data: SeriesBinDto[],
    timeRange: { from: Date; to: Date }
): SeriesBinDto[] {
    const fromTime = timeRange.from.getTime();
    const toTime = timeRange.to.getTime();

    return data.filter(bin => {
        const binTime = new Date(bin.t).getTime();
        return binTime >= fromTime && binTime <= toTime;
    });
}

// Группировка данных по временным интервалам
export function groupDataByTimeInterval(
    data: SeriesBinDto[],
    intervalMs: number
): SeriesBinDto[][] {
    const groups: SeriesBinDto[][] = [];
    const sortedData = [...data].sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());

    let currentGroup: SeriesBinDto[] = [];
    let currentIntervalStart: number | null = null;

    sortedData.forEach(bin => {
        const binTime = new Date(bin.t).getTime();

        if (currentIntervalStart === null) {
            currentIntervalStart = Math.floor(binTime / intervalMs) * intervalMs;
        }

        const binInterval = Math.floor(binTime / intervalMs) * intervalMs;

        if (binInterval === currentIntervalStart) {
            currentGroup.push(bin);
        } else {
            if (currentGroup.length > 0) {
                groups.push(currentGroup);
            }
            currentGroup = [bin];
            currentIntervalStart = binInterval;
        }
    });

    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }

    return groups;
}

// Преобразование SeriesBinDto в формат для ECharts
export function convertToEChartsData(
    data: SeriesBinDto[],
    valueType: 'avg' | 'min' | 'max' | 'count' = 'avg'
): Array<[number, number | null]> {
    return data.map(bin => {
        const time = new Date(bin.t).getTime();
        let value: number | null = null;

        switch (valueType) {
            case 'avg':
                value = bin.avg;
                break;
            case 'min':
                value = bin.min;
                break;
            case 'max':
                value = bin.max;
                break;
            case 'count':
                value = bin.count;
                break;
        }

        return [time, value];
    });
}

// Debounce функция
export function debounce<T extends (...args: any[]) => void>(
    fn: T,
    ms: number
): T {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), ms);
    }) as T;
}
