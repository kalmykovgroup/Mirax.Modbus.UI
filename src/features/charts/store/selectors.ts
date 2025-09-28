// charts/store/selectors.ts

import { createSelector } from '@reduxjs/toolkit';
import type { SeriesTile } from './chartsSlice';
import type { SeriesBinDto } from '@charts/shared/contracts/chart/Dtos/SeriesBinDto';
import type { RootState } from "@/store/store.ts";
import type { FieldDto } from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";
import { type LoadingState } from '@charts/ui/CharContainer/types';

// Базовые селекторы
export const selectChartsState = (state: RootState) => state.charts;
export const selectChartBucketingConfig = (state: RootState) => state.chartsSettings.bucketing;
export const selectTimeSettings = (state: RootState) => state.chartsSettings.timeSettings;

// Селекторы синхронизации
export const selectIsSyncEnabled = (state: RootState) => state.charts.syncEnabled;
export const selectSyncFields = (state: RootState): ReadonlyArray<FieldDto> => state.charts.syncFields;

export const selectResolvedTemplate = createSelector(
    [selectChartsState],
    (charts) => charts.template
);

export const selectIsDataLoaded = createSelector(
    [selectChartsState],
    (charts) => charts.isDataLoaded
);

// ИСПРАВЛЕННЫЙ selectFieldView - принимает fieldName как второй параметр
export const selectFieldView = createSelector(
    [
        selectChartsState,
        (_state: RootState, fieldName: string) => fieldName
    ],
    (charts, fieldName) => {
        const view = charts.view[fieldName];
        if (!view) throw new Error(`Could not find view: ${fieldName}`);
        return view;
    }
);

// ИСПРАВЛЕННЫЙ selectFieldLoadingState
export const selectFieldLoadingState = createSelector(
    [
        (state: RootState, fieldName: string) => selectFieldView(state, fieldName)
    ],
    (view): LoadingState => {
        return view.loadingState;
    }
);

// ИСПРАВЛЕННЫЙ selectFieldTiles
export const selectFieldTiles = createSelector(
    [
        (state: RootState, fieldName: string) => selectFieldView(state, fieldName)
    ],
    (view): { tiles: SeriesTile[]; hasLevel: boolean } => {
        if (view.currentBucketsMs == undefined) {
            return { tiles: [], hasLevel: false };
        }

        return {
            tiles: view.seriesLevel[view.currentBucketsMs] ?? [],
            hasLevel: view.seriesLevel.hasOwnProperty(view.currentBucketsMs)
        };
    }
);

// ИСПРАВЛЕННЫЙ selectFieldDataSafe
export const selectFieldDataSafe = createSelector(
    [
        (state: RootState, fieldName: string) => selectFieldTiles(state, fieldName)
    ],
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

// ИСПРАВЛЕННЫЙ selectFieldStatsSafe
export const selectFieldStatsSafe = createSelector(
    [
        (state: RootState, fieldName: string) => selectFieldView(state, fieldName),
        (state: RootState, fieldName: string) => selectFieldTiles(state, fieldName),
        (state: RootState, fieldName: string) => selectFieldDataSafe(state, fieldName)
    ],
    (view, { tiles, hasLevel }, { data, isEmpty }) => {
        if (!view) {
            return {
                hasView: false,
                hasData: false,
                loading: false,
                loadingState: {
                    active: false,
                    type: 'initial' as const,
                    progress: 0,
                    startTime: Date.now()
                },
                error: undefined,
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

        if (view.loadingState == undefined) throw Error("view.loadingState не инициализирован");

        const readyTiles = tiles.filter(tile => tile.status === 'ready');
        const loadingTiles = tiles.filter(tile => tile.status === 'loading');
        const errorTiles = tiles.filter(tile => tile.status === 'error');

        // Вычисляем покрытие на основе готовых тайлов и ожидаемого количества
        let coverage = 0;
        if (view.currentRange && view.currentBucketsMs && readyTiles.length > 0) {
            const rangeMs = view.currentRange.to.getTime() - view.currentRange.from.getTime();
            const expectedPoints = Math.floor(rangeMs / view.currentBucketsMs);
            const actualPoints = data.length;
            coverage = expectedPoints > 0 ? Math.min(100, Math.round((actualPoints / expectedPoints) * 100)) : 0;
        }

        // Вычисляем gaps (разрывы в данных)
        let gaps = 0;
        if (data.length > 1 && view.currentBucketsMs != undefined && view.currentBucketsMs > 0) {
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
            loadingState: view.loadingState,
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
