
import type { Dispatch } from '@reduxjs/toolkit';
import type {
    BucketsMs,
    CoverageInterval, OriginalRange,
    SeriesTile,
    TimeRange
} from '@chartsPage/charts/core/store/types/chart.types';
import {initialDataView, IniTopTile} from '@chartsPage/charts/core/store/chartsSlice';
import type {MultiSeriesResponse} from "@chartsPage/charts/core/dtos/responses/MultiSeriesResponse.ts";
import type {SeriesBinDto} from "@chartsPage/charts/core/dtos/SeriesBinDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

interface ProcessInitResponseParams {
    readonly tabId: Guid;
    readonly px: number;
    readonly response: MultiSeriesResponse;
    readonly dispatch: Dispatch;
    readonly niceMilliseconds: readonly number[];
}

export class InitializationService {
    /**
     * Главный метод: обработка результата init thunk
     */
    static processInitResponse(params: ProcessInitResponseParams): void {
        const {tabId, px, response, dispatch, niceMilliseconds } = params;

        console.log("Ответ при инициализации", response);

        response.series.forEach(s => {
            // 1. Построить список bucket-уровней ОТ TOP ВНИЗ
            const bucketLevels = this.buildBucketLevels(s.bucketMs, niceMilliseconds);

            // 2. Определить currentRange (один для всех полей)
            const currentRange: TimeRange = this.determineCurrentRange(s.fromMs, s.toMs, response);

            dispatch(initialDataView({
                tabId: tabId,
                field: s.field.name,
                px: px,
                currentRange: currentRange,
                originalRange: { fromMs: currentRange.fromMs, toMs: currentRange.toMs } as OriginalRange,
                currentBucketsMs: s.bucketMs,
                seriesLevels: bucketLevels
            }));

            // Создать tiles для каждой серии
            const snappedInterval = this.snapRange(
                currentRange.fromMs,
                currentRange.toMs,
                s.bucketMs
            );
            const tile: SeriesTile = this.createReadyTile(snappedInterval, s.bins);

            dispatch(IniTopTile({
                tabId: tabId,
                field: s.field.name,
                bucketMs: s.bucketMs,
                tile: tile
            }));
        });
    }

    /**
     *  ИСПРАВЛЕНО: Убрана избыточная сортировка
     *
     * Построить список bucket-уровней от top вниз.
     * niceMilliseconds УЖЕ отсортирован по возрастанию в chartsSettingsSlice,
     * поэтому просто фильтруем и добавляем top в начало если нужно.
     */
    private static buildBucketLevels(
        topBucketMs: BucketsMs,
        niceMilliseconds: readonly number[]
    ): readonly BucketsMs[] {
        const top = Math.max(1, Math.floor(topBucketMs));

        // Фильтруем уровни <= top (массив уже отсортирован по возрастанию)
        const filteredLevels = niceMilliseconds
            .map(ms => Math.max(1, Math.floor(ms)))
            .filter(ms => ms <= top);

        // Дедупликация через Set (сохраняет insertion order)
        const uniqueLevels = Array.from(new Set(filteredLevels));

        // Добавляем top в начало если его нет
        // (массив отсортирован по возрастанию, но нужен по убыванию)
        const lastLevel = uniqueLevels[uniqueLevels.length - 1];
        if (lastLevel !== top) {
            uniqueLevels.push(top);
        }

        // Разворачиваем: от крупного к мелкому
        return uniqueLevels.reverse();
    }

    /**
     * Определить currentRange из запроса или из данных
     */
    private static determineCurrentRange(
        requestFrom: number | undefined,
        requestTo: number | undefined,
        response: MultiSeriesResponse
    ): TimeRange {
        let from = requestFrom;
        let to = requestTo;

        // Если from не задан - ищем минимум в данных
        if (!from) {
            let minMs = Number.MAX_VALUE;

            response.series.forEach(s => {
                s.bins.forEach(bin => {
                    if (bin.t < minMs) {
                        minMs = bin.t;
                    }
                });
            });

            from = minMs !== Number.MAX_VALUE ? minMs : new Date().getTime();
        }

        // Если to не задан - ищем максимум в данных
        if (!to) {
            let maxMs = Number.MIN_VALUE;

            response.series.forEach(s => {
                s.bins.forEach(bin => {
                    if (bin.t > maxMs) {
                        maxMs = bin.t;
                    }
                });
            });

            to = maxMs !== Number.MIN_VALUE ? maxMs : new Date().getTime();
        }

        return {fromMs: from, toMs: to } as TimeRange;
    }

    /**
     * Снап диапазона к границам bucket
     */
    private static snapRange(
        from: number,
        to: number,
        bucketMs: BucketsMs
    ): CoverageInterval {
        const fromMs = from;
        const toMs = to;
        const b = Math.max(1, bucketMs);

        const fromSnapped = Math.floor(fromMs / b) * b;
        const toSnapped = Math.ceil(toMs / b) * b;

        return {
            fromMs: fromSnapped,
            toMs: toSnapped
        };
    }

    /**
     * Создать ready-тайл
     */
    private static createReadyTile(
        interval: CoverageInterval,
        bins: readonly SeriesBinDto[]
    ): SeriesTile {
        return {
            coverageInterval: interval,
            bins: [...bins],
            status: 'ready',
            loadedAt: Date.now()
        };
    }


}