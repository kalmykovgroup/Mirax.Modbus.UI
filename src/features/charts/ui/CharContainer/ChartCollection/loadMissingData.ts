import type { FieldDto } from '@charts/shared/contracts/metadata/Dtos/FieldDto';
import {type BucketsMs, type TimeRange, upsertTiles} from '@charts/store/chartsSlice';
import { fetchMultiSeriesRaw } from '@charts/store/thunks';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';

interface LoadMissingDataParams {
    field: FieldDto;
    targetBucketMs: BucketsMs;
    newRange: TimeRange;
}

/**
 * Thunk для проверки покрытия данных и загрузки недостающих частей
 * Все необходимые данные берет из store
 */
export const loadMissingData = createAsyncThunk<
boolean, // возвращает true если данные были загружены, false если уже есть
    LoadMissingDataParams,
{ state: RootState }
>(
    'charts/loadMissingData',
        async ({ field, targetBucketMs, newRange }, { getState, dispatch }) => {

                // Получаем все необходимые данные из state
                const state = getState();
                const fieldView = state.charts.view[field.name];
                const template = state.charts.template;

                if (!fieldView) {
                    console.warn(`[loadMissingData] View not found for field: ${field.name}`);
                    return false;
                }

                if (!template) {
                    console.warn(`[loadMissingData] Template not found`);
                    return false;
                }

                if(fieldView.px == undefined) throw Error("FieldView.px не инициализирован");

                // Берем from/to из currentRange поля
                const { from, to } = newRange;

                // Определяем bucket для проверки

                // Получаем тайлы для текущего уровня
                const currentLevelTiles = fieldView.seriesLevel[targetBucketMs] ?? [];

                // Проверяем покрытие для текущего диапазона
                const requestedFromMs = from.getTime();
                const requestedToMs = to.getTime();

                // Фильтруем готовые тайлы и сортируем их
                const readyTiles = currentLevelTiles
                    .filter(t => t.status === 'ready')
                    .sort((a, b) => a.coverageInterval.fromMs - b.coverageInterval.fromMs);

                // Если нет готовых тайлов - нужна загрузка всего диапазона
                if (readyTiles.length === 0) {

                    // Для полной загрузки используем весь диапазон
                    const response = await dispatch(fetchMultiSeriesRaw({
                        request: {
                            template: template,
                            from: from,
                            to: to,
                            px: fieldView.px,
                            bucketMs: targetBucketMs
                        },
                        field: field,
                    })).unwrap();

                    // ОБРАБАТЫВАЕМ ПОЛУЧЕННЫЕ ДАННЫЕ
                    const responseBucketMs = Math.max(1, Math.floor(response.bucketMilliseconds ?? 1));

                    // Проверяем соответствие bucket
                    if (responseBucketMs !== targetBucketMs) {
                        console.warn(`[loadMissingData] Bucket mismatch: requested ${targetBucketMs}ms, got ${responseBucketMs}ms`);
                        return false;
                    }

                    // Снаппинг к границам bucket
                    const fromMs = from.getTime();
                    const toMs = to.getTime();
                    const b = Math.max(1, responseBucketMs);
                    const snappedFromMs = Math.floor(fromMs / b) * b;
                    const snappedToMs = Math.ceil(toMs / b) * b;

                    // Обрабатываем каждую серию данных
                    for (const seriesItem of response.series) {
                        if (seriesItem.field.name === field.name) {
                            const bins = seriesItem.bins ?? [];
                            if (bins.length > 0) {
                                dispatch(upsertTiles({
                                    field: field.name,
                                    bucketMs: responseBucketMs,
                                    tiles: [{
                                        coverageInterval: { fromMs: snappedFromMs, toMs: snappedToMs },
                                        bins: bins,
                                        status: 'ready' as const
                                    }]
                                }));
                                console.log(`[loadMissingData] Added ${bins.length} bins for ${field.name}`);
                            }
                        } else {
                            // Проверяем синхронизированные поля
                            const syncField = state.charts.syncFields.find(f => f.name === seriesItem.field.name);
                            if (syncField) {
                                const bins = seriesItem.bins ?? [];
                                if (bins.length > 0) {
                                    dispatch(upsertTiles({
                                        field: syncField.name,
                                        bucketMs: responseBucketMs,
                                        tiles: [{
                                            coverageInterval: { fromMs: snappedFromMs, toMs: snappedToMs },
                                            bins: bins,
                                            status: 'ready' as const
                                        }]
                                    }));
                                    console.log(`[loadMissingData] Added ${bins.length} bins for sync field ${syncField.name}`);
                                }
                            }
                        }
                    }

                    return true;
                }

                // Проверяем есть ли пропуски в покрытии
                let hasGaps = false;
                let gapStart = requestedFromMs;
                let gapEnd = requestedToMs;

                // Проверяем начало диапазона
                if (readyTiles[0].coverageInterval.fromMs > requestedFromMs) {
                    hasGaps = true;
                    gapEnd = Math.min(readyTiles[0].coverageInterval.fromMs, requestedToMs);
                } else {
                    // Ищем пропуски между тайлами
                    for (let i = 0; i < readyTiles.length - 1; i++) {
                        const currentTile = readyTiles[i];
                        const nextTile = readyTiles[i + 1];

                        // Есть ли пропуск между тайлами?
                        if (currentTile.coverageInterval.toMs < nextTile.coverageInterval.fromMs) {
                            // Пропуск должен пересекаться с запрошенным диапазоном
                            const gapStartTemp = currentTile.coverageInterval.toMs;
                            const gapEndTemp = nextTile.coverageInterval.fromMs;

                            if (gapEndTemp > requestedFromMs && gapStartTemp < requestedToMs) {
                                hasGaps = true;
                                gapStart = Math.max(gapStartTemp, requestedFromMs);
                                gapEnd = Math.min(gapEndTemp, requestedToMs);
                                break;
                            }
                        }
                    }

                    // Проверяем конец диапазона
                    const lastTile = readyTiles[readyTiles.length - 1];
                    if (!hasGaps && lastTile.coverageInterval.toMs < requestedToMs) {
                        hasGaps = true;
                        gapStart = Math.max(lastTile.coverageInterval.toMs, requestedFromMs);
                        gapEnd = requestedToMs;
                    }
                }

                // Если пропусков нет - проверяем полное покрытие
                if (!hasGaps) {
                    const firstCoverage = readyTiles[0].coverageInterval.fromMs;
                    const lastCoverage = readyTiles[readyTiles.length - 1].coverageInterval.toMs;

                    if (firstCoverage <= requestedFromMs && lastCoverage >= requestedToMs) {
                        console.log(
                            `[loadMissingData] All data present for field ${field.name}, bucket ${targetBucketMs}ms`
                        );
                        return false;
                    }
                }

                // Расширяем диапазон загрузки для оптимизации
                const EXPAND_FACTOR = 0.2;
                const gapSpan = gapEnd - gapStart;
                const expansion = Math.floor(gapSpan * EXPAND_FACTOR);

                // Не выходим за границы template
                const loadFrom = new Date(Math.max(
                    gapStart - expansion,
                    template.from.getTime()
                ));
                const loadTo = new Date(Math.min(
                    gapEnd + expansion,
                    template.to.getTime()
                ));

                // Делаем запрос только для недостающего диапазона
                const response = await dispatch(fetchMultiSeriesRaw({
                    request: {
                        template: template,
                        from: loadFrom,
                        to: loadTo,
                        px: fieldView.px,
                        bucketMs: targetBucketMs
                    },
                    field: field,
                })).unwrap();

                // ОБРАБАТЫВАЕМ ПОЛУЧЕННЫЕ ДАННЫЕ
                const responseBucketMs = Math.max(1, Math.floor(response.bucketMilliseconds ?? 1));



                // Если есть несоответствие - пропускаем
                if (responseBucketMs !== targetBucketMs) {
                    console.warn(`[loadMissingData] ⚠️ BUCKET MISMATCH for ${field.name}:`, {
                        requested: `${targetBucketMs}ms (${targetBucketMs/1000}s)`,
                        received: `${responseBucketMs}ms (${response.bucketMilliseconds}s)`,
                        difference: `${Math.abs(targetBucketMs - responseBucketMs)}ms`
                    });
                    return false;
                }

                // Снаппинг к границам bucket для загруженного диапазона
                const loadedFromMs = loadFrom.getTime();
                const loadedToMs = loadTo.getTime();
                const b = Math.max(1, responseBucketMs);
                const snappedFromMs = Math.floor(loadedFromMs / b) * b;
                const snappedToMs = Math.ceil(loadedToMs / b) * b;

                // Обрабатываем каждую серию данных
                let addedBinsCount = 0;
                for (const seriesItem of response.series) {
                    if (seriesItem.field.name !== field.name) {
                        // Это может быть данные для синхронизированного поля
                        const syncField = state.charts.syncFields.find(f => f.name === seriesItem.field.name);
                        if (syncField) {
                            const syncBins = seriesItem.bins ?? [];
                            if (syncBins.length > 0) {
                                dispatch(upsertTiles({
                                    field: syncField.name,
                                    bucketMs: responseBucketMs,
                                    tiles: [{
                                        coverageInterval: { fromMs: snappedFromMs, toMs: snappedToMs },
                                        bins: syncBins,
                                        status: 'ready' as const
                                    }]
                                }));
                                console.log(`[loadMissingData] Added ${syncBins.length} bins for sync field ${syncField.name}`);
                            }
                        }
                        continue;
                    }

                    const bins = seriesItem.bins ?? [];
                    if (bins.length > 0) {
                        dispatch(upsertTiles({
                            field: field.name,
                            bucketMs: responseBucketMs,
                            tiles: [{
                                coverageInterval: { fromMs: snappedFromMs, toMs: snappedToMs },
                                bins: bins,
                                status: 'ready' as const
                            }]
                        }));
                        addedBinsCount = bins.length;
                    }
                }

                console.log(`[loadMissingData] Successfully added ${addedBinsCount} bins for ${field.name} at bucket ${responseBucketMs}ms`);
                return true;


        }
);