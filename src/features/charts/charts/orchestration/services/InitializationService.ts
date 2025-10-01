
import type { Dispatch } from '@reduxjs/toolkit';
import type {
    BucketsMs,
    CoverageInterval,
    SeriesTile,
    TimeRange
} from '@charts/charts/core/types/chart.types';
import {initialDataView, replaceTiles} from '@charts/charts/core/store/chartsSlice';
import type {MultiSeriesResponse} from "@charts/charts/core/dtos/responses/MultiSeriesResponse.ts";
import type {SeriesBinDto} from "@charts/charts/core/dtos/SeriesBinDto.ts";

interface ProcessInitResponseParams {
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
        const { px, response, dispatch, niceMilliseconds } = params;

        response.series.forEach(s => {
            // 1. Построить список bucket-уровней ОТ TOP ВНИЗ
            const bucketLevels = this.buildBucketLevels(s.bucketMs, niceMilliseconds);

            // 2. Определить currentRange (один для всех полей)
            const currentRange = this.determineCurrentRange(s.from, s.to, response);

            dispatch(initialDataView({
                field: s.field.name,
                px: px,
                currentRange,
                currentBucketsMs: s.bucketMs,
                seriesLevels: bucketLevels
            }));

            // Создать tiles для каждой серии
            const snappedInterval = this.snapRange(
                currentRange.from,
                currentRange.to,
                s.bucketMs
            );

            const convertedBins = this.convertBins(s.bins);
            const tile = this.createReadyTile(snappedInterval, convertedBins);

            dispatch(replaceTiles({
                field: s.field.name,
                bucketMs: s.bucketMs,
                tiles: [tile]
            }));
        });
    }

    /**
     * ✅ ИСПРАВЛЕНО: Убрана избыточная сортировка
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
        requestFrom: Date | undefined,
        requestTo: Date | undefined,
        response: MultiSeriesResponse
    ): TimeRange {
        let from = requestFrom;
        let to = requestTo;

        // Если from не задан - ищем минимум в данных
        if (!from) {
            let minMs = Number.MAX_VALUE;

            response.series.forEach(s => {
                s.bins.forEach(bin => {
                    const t = bin.t instanceof Date ? bin.t.getTime() : new Date(bin.t).getTime();
                    if (t < minMs) {
                        minMs = t;
                    }
                });
            });

            from = minMs !== Number.MAX_VALUE ? new Date(minMs) : new Date();
        }

        // Если to не задан - ищем максимум в данных
        if (!to) {
            let maxMs = Number.MIN_VALUE;

            response.series.forEach(s => {
                s.bins.forEach(bin => {
                    const t = bin.t instanceof Date ? bin.t.getTime() : new Date(bin.t).getTime();
                    if (t > maxMs) {
                        maxMs = t;
                    }
                });
            });

            to = maxMs !== Number.MIN_VALUE ? new Date(maxMs) : new Date();
        }

        return { from, to };
    }

    /**
     * Снап диапазона к границам bucket
     */
    private static snapRange(
        from: Date,
        to: Date,
        bucketMs: BucketsMs
    ): CoverageInterval {
        const fromMs = from.getTime();
        const toMs = to.getTime();
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

    /**
     * Конвертировать bins (убедиться что t - Date)
     */
    private static convertBins(bins: readonly SeriesBinDto[]): readonly SeriesBinDto[] {
        return bins.map(bin => ({
            ...bin,
            t: bin.t instanceof Date ? bin.t : new Date(bin.t)
        }));
    }
}