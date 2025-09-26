// charts/store/selectors.ts

import { createSelector } from '@reduxjs/toolkit';
import type {BucketsMs, ChartsState, FieldView, SeriesTile, TimeRange} from './chartsSlice';
import type { SeriesBinDto } from '@charts/shared/contracts/chart/Dtos/SeriesBinDto';
import type {RootState} from "@/store/store.ts";
import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";

// Базовые селекторы
export const selectChartsState = (state: { charts: ChartsState }) => state.charts;
// Селекторы
export const selectIsSyncEnabled = (state: RootState) =>
    state.charts.syncEnabled;

export const selectSyncFields = (state: RootState): ReadonlyArray<FieldDto> =>
    state.charts.syncFields;


export const selectResolvedTemplate = createSelector(
    [selectChartsState],
    (charts) => charts.template
);

export const selectFieldView = (fieldName: string) =>
    createSelector(
        [selectChartsState],
        (charts) => charts.view[fieldName]
    );

// Безопасные селекторы с защитой
export const selectFieldViewSafe = (fieldName: string) =>
    createSelector(
        [selectFieldView(fieldName)],
        (fieldView): { view: FieldView | null; isInitialized: boolean } => {
            return {
                view: fieldView ?? null,
                isInitialized: !!fieldView
            };
        }
    );

export const selectFieldTilesSafe = (fieldName: string) =>
    createSelector(
        [selectFieldViewSafe(fieldName)],
        ({ view, isInitialized }): { tiles: SeriesTile[]; hasLevel: boolean } => {
            if (!isInitialized || !view) {
                return { tiles: [], hasLevel: false };
            }

            const tiles = view.seriesLevel[view.currentBucketsMs] ?? [];
            return {
                tiles,
                hasLevel: view.seriesLevel.hasOwnProperty(view.currentBucketsMs)
            };
        }
    );

export const selectFieldDataSafe = (fieldName: string) =>
    createSelector(
        [selectFieldTilesSafe(fieldName)],
        ({ tiles }): { data: SeriesBinDto[]; isEmpty: boolean; hasReadyTiles: boolean } => {
            if (tiles.length === 0) {
                return { data: [], isEmpty: true, hasReadyTiles: false };
            }

            const readyTiles = tiles.filter(tile => tile.status === 'ready');
            if (readyTiles.length === 0) {
                return { data: [], isEmpty: true, hasReadyTiles: false };
            }

            const allBins = readyTiles.flatMap(tile => tile.bins ?? []);
            const sortedData = allBins.sort((a, b) =>
                new Date(a.t).getTime() - new Date(b.t).getTime()
            );

            return {
                data: sortedData,
                isEmpty: sortedData.length === 0,
                hasReadyTiles: true
            };
        }
    );

// В selectors.ts, обновите selectFieldStatsSafe:
export const selectFieldStatsSafe = (fieldName: string) =>
    createSelector(
        [selectFieldViewSafe(fieldName), selectFieldTilesSafe(fieldName), selectFieldDataSafe(fieldName)],
        ({ view, isInitialized }, { tiles, hasLevel }, { data, isEmpty }) => {
            if (!isInitialized || !view) {
                return {
                    hasView: false,
                    hasData: false,
                    loading: false,
                    error: 'Field view not initialized',
                    totalTiles: 0,
                    readyTiles: 0,
                    loadingTiles: 0,
                    errorTiles: 0,
                    totalPoints: 0,
                    currentBucketMs: 0,
                    coverage: 0,
                    hasLevel: false,
                    gaps: 0
                };
            }

            const readyTiles = tiles.filter(tile => tile.status === 'ready');
            const loadingTiles = tiles.filter(tile => tile.status === 'loading');
            const errorTiles = tiles.filter(tile => tile.status === 'error');
            const coverage = tiles.length > 0 ? Math.round((readyTiles.length / tiles.length) * 100) : 0;

            // Вычисляем gaps (разрывы в данных)
            let gaps = 0;
            if (data.length > 1 && view.currentBucketsMs > 0) {
                for (let i = 1; i < data.length; i++) {
                    const prevTime = data[i - 1]!.t.getTime();
                    const currTime = data[i]!.t.getTime();
                    const expectedGap = view.currentBucketsMs;
                    const actualGap = currTime - prevTime;

                    // Если интервал больше чем 2 bucket - считаем это разрывом
                    if (actualGap > expectedGap * 2) {
                        gaps++;
                    }
                }
            }

            return {
                hasView: true,
                hasData: !isEmpty,
                loading: view.loading || loadingTiles.length > 0,
                error: view.error,
                totalTiles: tiles.length,
                readyTiles: readyTiles.length,
                loadingTiles: loadingTiles.length,
                errorTiles: errorTiles.length,
                totalPoints: data.length,
                currentBucketMs: view.currentBucketsMs,
                coverage,
                hasLevel,
                gaps
            };
        }
    );

// Селектор для проверки готовности данных поля
export const selectFieldReadiness = (fieldName: string) =>
    createSelector(
        [selectFieldStatsSafe(fieldName)],
        (stats) => ({
            isInitialized: stats.hasView,
            hasData: stats.hasData,
            isLoading: stats.loading,
            hasError: !!stats.error,
            isEmpty: stats.hasView && !stats.hasData && !stats.loading,
            isReady: stats.hasView && stats.hasData && !stats.loading && !stats.error
        })
    );

// Селектор для получения домена данных
export const selectFieldDomain = (fieldName: string) =>
    createSelector(
        [selectFieldDataSafe(fieldName), selectResolvedTemplate],
        ({ data }, template) => {
            // Всегда возвращаем объект с вычисленными значениями
            const now = Date.now();
            const defaultFrom = new Date(now - 86400000);
            const defaultTo = new Date(now);

            // Приоритет: template > данные > дефолт
            if (template?.from && template?.to) {
                return {
                    from: template.from,
                    to: template.to,
                    source: 'template' as const,
                    hasTemplate: true,
                    hasData: data.length > 0,
                    dataPoints: data.length
                };
            }

            if (data.length > 0) {
                const times = data.map(bin => new Date(bin.t).getTime());
                const minTime = Math.min(...times);
                const maxTime = Math.max(...times);

                return {
                    from: new Date(minTime),
                    to: new Date(maxTime),
                    source: 'data' as const,
                    hasTemplate: false,
                    hasData: true,
                    dataPoints: data.length
                };
            }

            return {
                from: defaultFrom,
                to: defaultTo,
                source: 'default' as const,
                hasTemplate: false,
                hasData: false,
                dataPoints: 0
            };
        }
    );

// Селектор для видимых данных в диапазоне
export const selectVisibleFieldData = (fieldName: string, visibleRange: { from: number; to: number }) =>
    createSelector(
        [selectFieldDataSafe(fieldName)],
        (chartData): SeriesBinDto[] => {
            return chartData.data.filter(bin => {
                const time = new Date(bin.t).getTime();
                return time >= visibleRange.from && time <= visibleRange.to;
            });
        }
    );

// Селектор для проверки нужно ли перезагружать данные
export const selectShouldReloadField = (fieldName: string) =>
    createSelector(
        [selectFieldStatsSafe(fieldName)],
        (stats) => ({
            shouldReload: stats.hasView && !stats.hasData && !stats.loading && !!stats.error,
            reason: !stats.hasView ? 'not_initialized' :
                stats.hasData ? 'has_data' :
                    stats.loading ? 'loading' :
                        stats.error ? 'error' : 'unknown'
        })
    );


//Header
// Добавить в charts/store/selectors.ts:

// Селектор для получения карты уровней поля
export const selectSeriesLevelMap = (fieldName: string) =>
    createSelector(
        [selectFieldViewSafe(fieldName)],
        ({ view }) => {
            if (!view) return {};

            // Теперь возвращаем tiles напрямую, без обертки
            const levelMap: Record<number, SeriesTile[]> = {};

            Object.entries(view.seriesLevel).forEach(([bucketMs, tiles]) => {
                levelMap[Number(bucketMs)] = tiles || [];
            });

            return levelMap;
        }
    );

// Селектор для домена из template
export const selectTemplateDomain = createSelector(
    [selectResolvedTemplate],
    (template): { from: Date; to: Date } | null => {
        if (!template?.from || !template?.to) {
            return null;
        }
        return {
            from: template.from,
            to: template.to
        };
    }
);

// Селектор для текущего bucket поля
export const selectCurrentBucketMs = (fieldName: string) =>
    createSelector(
        [selectFieldViewSafe(fieldName)],
        ({ view }): BucketsMs | undefined => {
            return view?.currentBucketsMs;
        }
    );

// Селектор для состояния загрузки поля
export const selectFieldLoading = (fieldName: string) =>
    createSelector(
        [selectFieldViewSafe(fieldName)],
        ({ view }): boolean => {
            return view?.loading ?? false;
        }
    );

// Селектор для ошибки поля
export const selectFieldError = (fieldName: string) =>
    createSelector(
        [selectFieldViewSafe(fieldName)],
        ({ view }): string | undefined => {
            return view?.error;
        }
    );

// Дополнительный селектор для текущего диапазона
export const selectCurrentRange = (fieldName: string) =>
    createSelector(
        [selectFieldViewSafe(fieldName)],
        ({ view }): TimeRange | undefined => {
            return view?.currentRange ?? undefined;
        }
    );