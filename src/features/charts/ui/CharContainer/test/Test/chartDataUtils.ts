// chartDataUtils.ts - Утилиты для обработки данных графика
import type { SeriesBinDto } from '@charts/shared/contracts/chart/Dtos/SeriesBinDto';
import type { SeriesTile, BucketsMs } from '@charts/store/chartsSlice';

export interface ChartDataPoint {
    timestamp: number;
    value: number;
    binData: SeriesBinDto;
}

export interface ZoomAnalysis {
    fromMs: number;
    toMs: number;
    spanMs: number;
    spanMinutes: number;
    spanHours: number;
    visibleBins: SeriesBinDto[];
    visibleBinsCount: number;
    totalBinsCount: number;
    density: number; // точек на минуту
    pointsPerPixel: number; // точек на пиксель
    optimalBucketMs: BucketsMs;
    currentBucketMs: BucketsMs;
    needsMoreData: boolean;
    dataQuality: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ZoomAction {
    type: 'ZOOM_IN' | 'ZOOM_OUT' | 'PAN_LEFT' | 'PAN_RIGHT' | 'INITIAL';
    magnitude: number; // насколько сильное действие (в процентах)
}

/**
 * Извлечение бинов из тайлов
 */
export function extractBinsFromTiles(tiles: SeriesTile[]): SeriesBinDto[] {
    console.log('🔍 [extractBinsFromTiles] Начало извлечения:', {
        количество_тайлов: tiles.length,
        тайлы: tiles.map(t => ({
            status: t.status,
            bins_count: t.bins?.length || 0,
            coverage: `${new Date(t.coverageInterval.fromMs).toISOString()} - ${new Date(t.coverageInterval.toMs).toISOString()}`
        }))
    });

    const allBins: SeriesBinDto[] = [];
    let skippedTiles = 0;
    let totalBinsInTiles = 0;

    tiles.forEach((tile, index) => {
        if (tile?.status === 'ready' && Array.isArray(tile.bins)) {
            totalBinsInTiles += tile.bins.length;
            allBins.push(...tile.bins);
            console.log(`  ✅ Тайл ${index}: добавлено ${tile.bins.length} бинов`);
        } else {
            skippedTiles++;
            console.log(`  ⚠️ Тайл ${index}: пропущен (status=${tile?.status}, bins=${Array.isArray(tile?.bins)})`);
        }
    });

    console.log('📊 [extractBinsFromTiles] До дедупликации:', {
        всего_бинов: allBins.length,
        пропущено_тайлов: skippedTiles,
        бинов_в_тайлах: totalBinsInTiles
    });

    // Сортируем по времени и убираем дубликаты
    const uniqueBins = new Map<number, SeriesBinDto>();
    const duplicates: number[] = [];

    allBins.forEach(bin => {
        const time = new Date(bin.t).getTime();
        if (!uniqueBins.has(time)) {
            uniqueBins.set(time, bin);
        } else {
            duplicates.push(time);
            // Сохраняем бин с большим count
            const existing = uniqueBins.get(time)!;
            if (bin.count > existing.count) {
                uniqueBins.set(time, bin);
            }
        }
    });

    const result = Array.from(uniqueBins.values()).sort((a, b) => {
        return new Date(a.t).getTime() - new Date(b.t).getTime();
    });

    console.log('✅ [extractBinsFromTiles] Результат:', {
        было_бинов: allBins.length,
        дубликатов: duplicates.length,
        уникальных: result.length,
        первый_бин: result[0] ? new Date(result[0].t).toISOString() : null,
        последний_бин: result[result.length - 1] ? new Date(result[result.length - 1].t).toISOString() : null
    });

    return result;
}

/**
 * Преобразование бинов в точки для графика
 */
export function binsToChartData(bins: SeriesBinDto[]): ChartDataPoint[] {
    return bins
        .filter(bin => bin && bin.avg !== null && bin.avg !== undefined)
        .map(bin => ({
            timestamp: new Date(bin.t).getTime(),
            value: bin.avg,
            binData: bin,
        }));
}

/**
 * Определение типа действия на основе изменения окна
 */
export function detectZoomAction(
    currentWindow: { fromMs: number; toMs: number },
    previousWindow: { fromMs: number; toMs: number } | null
): ZoomAction {
    if (!previousWindow) {
        return { type: 'INITIAL', magnitude: 0 };
    }

    const currentSpan = currentWindow.toMs - currentWindow.fromMs;
    const previousSpan = previousWindow.toMs - previousWindow.fromMs;
    const currentCenter = currentWindow.fromMs + currentSpan / 2;
    const previousCenter = previousWindow.fromMs + previousSpan / 2;

    // Порог для определения изменения (1% от диапазона)
    const threshold = previousSpan * 0.01;

    // Проверяем изменение масштаба
    const spanRatio = currentSpan / previousSpan;
    if (Math.abs(currentSpan - previousSpan) > threshold) {
        if (spanRatio < 0.95) {
            return {
                type: 'ZOOM_IN',
                magnitude: Math.round((1 - spanRatio) * 100)
            };
        } else if (spanRatio > 1.05) {
            return {
                type: 'ZOOM_OUT',
                magnitude: Math.round((spanRatio - 1) * 100)
            };
        }
    }

    // Проверяем панорамирование
    const centerShift = Math.abs(currentCenter - previousCenter);
    if (centerShift > threshold) {
        return {
            type: currentCenter < previousCenter ? 'PAN_LEFT' : 'PAN_RIGHT',
            magnitude: Math.round((centerShift / previousSpan) * 100)
        };
    }

    return { type: 'INITIAL', magnitude: 0 };
}

/**
 * Анализ текущего окна и определение необходимости загрузки данных
 */
export function analyzeZoomWindow(
    window: { fromMs: number; toMs: number },
    allBins: SeriesBinDto[],
    currentBucketMs: BucketsMs,
    chartWidthPx: number = 1200
): ZoomAnalysis {
    const spanMs = window.toMs - window.fromMs;
    const spanMinutes = spanMs / 1000 / 60;
    const spanHours = spanMinutes / 60;

    // Фильтруем видимые бины (только те что имеют валидные данные для отображения)
    const visibleBins = allBins.filter(bin => {
        const binTime = new Date(bin.t).getTime();
        // Проверяем что бин в окне И имеет данные для отображения
        return binTime >= window.fromMs && binTime <= window.toMs &&
            bin.avg !== null && bin.avg !== undefined;
    });

    // Считаем общее количество валидных бинов
    const totalValidBins = allBins.filter(bin =>
        bin.avg !== null && bin.avg !== undefined
    );

    const visibleBinsCount = visibleBins.length;
    const totalBinsCount = totalValidBins.length;

    // Вычисляем плотность данных
    const density = spanMinutes > 0 ? visibleBinsCount / spanMinutes : 0;
    const pointsPerPixel = chartWidthPx > 0 ? visibleBinsCount / chartWidthPx : 0;

    // Определяем оптимальный размер бакета для текущего окна
    const optimalBucketMs = calculateOptimalBucket(spanMs);

    // Определяем качество данных
    let dataQuality: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH';
    if (density < 0.2) {
        dataQuality = 'LOW';
    } else if (density < 0.5) {
        dataQuality = 'MEDIUM';
    }

    // Определяем необходимость загрузки дополнительных данных
    const needsMoreData = determineNeedsMoreData(
        density,
        pointsPerPixel,
        spanMs,
        currentBucketMs,
        optimalBucketMs
    );

    return {
        fromMs: window.fromMs,
        toMs: window.toMs,
        spanMs,
        spanMinutes,
        spanHours,
        visibleBins,
        visibleBinsCount,
        totalBinsCount,
        density,
        pointsPerPixel,
        optimalBucketMs,
        currentBucketMs,
        needsMoreData,
        dataQuality,
    };
}

/**
 * Расчет оптимального размера бакета для временного окна
 */
export function calculateOptimalBucket(spanMs: number): BucketsMs {
    const spanMinutes = spanMs / 1000 / 60;
    const spanHours = spanMinutes / 60;
    const spanDays = spanHours / 24;

    // Логика выбора бакета в зависимости от масштаба
    if (spanMinutes < 5) {
        return 1000; // 1 секунда для очень мелкого масштаба
    } else if (spanMinutes < 30) {
        return 10 * 1000; // 10 секунд
    } else if (spanMinutes < 60) {
        return 30 * 1000; // 30 секунд
    } else if (spanHours < 3) {
        return 60 * 1000; // 1 минута
    } else if (spanHours < 12) {
        return 5 * 60 * 1000; // 5 минут
    } else if (spanHours < 24) {
        return 15 * 60 * 1000; // 15 минут
    } else if (spanDays < 3) {
        return 60 * 60 * 1000; // 1 час
    } else if (spanDays < 7) {
        return 4 * 60 * 60 * 1000; // 4 часа
    } else if (spanDays < 30) {
        return 24 * 60 * 60 * 1000; // 1 день
    } else {
        return 7 * 24 * 60 * 60 * 1000; // 1 неделя
    }
}

/**
 * Определение необходимости загрузки дополнительных данных
 */
function determineNeedsMoreData(
    density: number,
    pointsPerPixel: number,
    spanMs: number,
    currentBucketMs: BucketsMs,
    optimalBucketMs: BucketsMs
): boolean {
    // Целевые значения
    const TARGET_DENSITY = 0.5; // точек на минуту
    const MIN_POINTS_PER_PIXEL = 0.5; // минимум точек на пиксель
    const MAX_POINTS_PER_PIXEL = 5; // максимум точек на пиксель

    // Не загружаем для слишком больших окон (больше недели)
    if (spanMs > 7 * 24 * 60 * 60 * 1000) {
        return false;
    }

    // Нужна загрузка если:
    // 1. Плотность слишком низкая
    if (density < TARGET_DENSITY) {
        return true;
    }

    // 2. Слишком мало точек на пиксель (график выглядит пустым)
    if (pointsPerPixel < MIN_POINTS_PER_PIXEL) {
        return true;
    }

    // 3. Текущий бакет сильно отличается от оптимального
    const bucketRatio = currentBucketMs / optimalBucketMs;
    if (bucketRatio > 5 || bucketRatio < 0.2) {
        return true;
    }

    return false;
}

/**
 * Форматирование временного диапазона для отладки
 */
export function formatTimeRange(fromMs: number, toMs: number): string {
    const from = new Date(fromMs);
    const to = new Date(toMs);
    const spanMs = toMs - fromMs;
    const spanMinutes = Math.round(spanMs / 1000 / 60);

    const formatDate = (d: Date) => {
        return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    return `${formatDate(from)} - ${formatDate(to)} (${spanMinutes} мин)`;
}

/**
 * Подготовка данных для запроса на сервер
 */
export function prepareDataRequest(analysis: ZoomAnalysis, action: ZoomAction) {
    // Расширяем окно для предзагрузки при панорамировании
    let requestFromMs = analysis.fromMs;
    let requestToMs = analysis.toMs;
    const expandFactor = 0.2; // 20% расширение с каждой стороны

    if (action.type === 'PAN_LEFT') {
        requestFromMs -= analysis.spanMs * expandFactor;
    } else if (action.type === 'PAN_RIGHT') {
        requestToMs += analysis.spanMs * expandFactor;
    }

    // Округляем к границам бакета
    const bucket = analysis.optimalBucketMs;
    requestFromMs = Math.floor(requestFromMs / bucket) * bucket;
    requestToMs = Math.ceil(requestToMs / bucket) * bucket;

    // Вычисляем оптимальный px для запроса
    const targetPointsCount = Math.ceil((requestToMs - requestFromMs) / bucket);
    const optimalPx = Math.max(200, Math.min(2000, targetPointsCount * 2));

    return {
        from: new Date(requestFromMs),
        to: new Date(requestToMs),
        px: optimalPx,
        bucketMs: bucket,
        expectedPoints: targetPointsCount,
    };
}