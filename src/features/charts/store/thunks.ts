// src/store/thunks.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';

import { chartsApi } from '@charts/shared/api/chartsApi';
import { withDb } from '@charts/shared/api/base/types';
import { notify } from '@app/lib/notify';

import type { GetMultiSeriesRequest } from '@charts/shared/contracts/chart/Dtos/Requests/GetMultiSeriesRequest';
import type { MultiSeriesResponse } from '@charts/shared/contracts/chart/Dtos/Responses/MultiSeriesResponse';
import type { MultiSeriesItemDto } from '@charts/shared/contracts/chart/Dtos/MultiSeriesItemDto';
import type { FieldDto } from '@charts/shared/contracts/metadata/Dtos/FieldDto';
import type { SeriesBinDto } from '@charts/shared/contracts/chart/Dtos/SeriesBinDto';

import {
    ensureView,
    ensureLevels,
    setFieldLoading,
    setFieldError,
    setCurrentBucketMs,
    upsertTiles,
    type BucketsMs,
    type CoverageInterval, type TimeRange,
} from './chartsSlice';

import {selectBucketingConfig} from '@charts/store/chartsSettingsSlice';


const secToMs = (sec?: number | null): BucketsMs =>
    Math.max(1, Math.floor(sec ?? 1)) * 1000;

const buildLowerOrEqualBucketsMs = (
    topBucketMs: BucketsMs,
    niceSeconds: number[]
): BucketsMs[] => {
    const top = Math.max(1, Math.floor(topBucketMs));
    const list = (niceSeconds ?? [])
        .map((s) => Math.max(1, Math.floor(s)) * 1000)
        .filter((ms) => ms <= top)
        .sort((a, b) => b - a); // от крупного к мелкому
    if (!list.includes(top)) list.unshift(top);
    return [...new Set(list)];
};

//Вернуть диапазон миллисекунд
const snapToBucketMs = (
    from: Date,
    to: Date,
    bucketMs: BucketsMs
): CoverageInterval => {
    const A = from.getTime();
    const B = to.getTime();
    const b = Math.max(1, bucketMs);
    const aSnapped = Math.floor(A / b) * b;
    const bSnapped = Math.ceil(B / b) * b;
    return { fromMs: aSnapped, toMs: bSnapped };
};

const makeReadyTile = (interval: CoverageInterval, bins: SeriesBinDto[]) => ({
    coverageInterval: interval,
    bins,
    status: 'ready' as const,
});

// ---- thunk ---------------------------------------------------------------

/**
 * Первый загрузочный thunk:
 * - дергает сервер (RTKQ + notify.run)
 * - переводит bucketSeconds -> bucketMs
 * - строит список уровней: top (из сервера) и все ниже по NiceSeconds
 * - инициализирует view и пустые сборки уровней
 * - кладёт в верхний уровень один ready-тайл на весь интервал
 */
// Фрагмент из src/store/thunks.ts с исправленным преобразованием

export const fetchMultiSeriesSimple = createAsyncThunk<
    void,
    GetMultiSeriesRequest,
    { state: RootState }
>('charts/fetchMultiSeriesRaw', async (request, { getState, dispatch }) => {

    if (!request.template) throw new Error('ResolvedCharReqTemplate is undefined');
    if (!request.template.databaseId) throw new Error('ResolvedCharReqTemplate.databaseId is undefined');



    // selectedFields гарантированно не пустой
    const fieldsForStatus: readonly FieldDto[] = request.template.selectedFields;
    fieldsForStatus.forEach((f) =>
        dispatch(setFieldLoading({ field: f.name, loading: true }))
    );

    // RTK Query запрос с тостами
    const sub = dispatch(
        chartsApi.endpoints.getMultiSeries.initiate(
            withDb<GetMultiSeriesRequest>(request, request.template.databaseId)
        )
    );

    try {
        const data = (await notify.run(
            sub.unwrap(),
            {
                loading: { text: 'Загружаю MultiSeries… ' },
                success: { text: 'MultiSeries загружены', toastOptions: { duration: 700 } },
                error: { text: 'Не удалось загрузить MultiSeries', toastOptions: { duration: 3000 } },
            },
            { id: 'fetch-fields' }
        )) as MultiSeriesResponse;

        // верхний уровень от сервера
        const topBucketMs = secToMs(data.bucketSeconds);

        console.log("topBucketMs", topBucketMs)
        console.log("data", data)

        // список уровней: top и всё ниже по NiceSeconds
        const cfg = selectBucketingConfig(getState());

        //Получили список всех возможных уровней
        const bucketListDesc = buildLowerOrEqualBucketsMs(topBucketMs, cfg.NiceSeconds);

        const px = request.px;

        const requestFrom = request.from
        const requestTo = request.to

        // ВАЖНО: для currentRange используем ОРИГИНАЛЬНЫЕ даты, не конвертированные
        // Это локальные даты, как их видит пользователь

        const currentRange = { from: requestFrom, to: requestTo } as TimeRange;

        //Если from или to были не заданы, то находим в ответе диапазон
        if(currentRange.from == undefined){
            let minFrom : number = 0;

            data.series.forEach(s => {
                Math.min(minFrom, Math.min(...(s.bins.map(b => b.t.getTime()))))
            })
            currentRange.from = new Date(minFrom);
        }

        if(currentRange.to == undefined){
            let maxTo : number = 0;
            data.series.forEach(s => {
                Math.max(maxTo, Math.max(...(s.bins.map(b => b.t.getTime()))))
            })
            currentRange.to = new Date(maxTo);
        }


        // Инициализируем view и уровни для каждого выбранного поля
        for (const f of request.template.selectedFields) {
            dispatch(
                ensureView({
                    field: f.name,
                    px: px,
                    currentRange: currentRange, // локальные даты для отображения
                    currentBucketsMs: topBucketMs,
                })
            );
            //Создаем пустые массивы для каждого уровня
            dispatch(ensureLevels({ field: f.name, bucketList: bucketListDesc }));

            //Устанавливаем BucketMs, по которому можно определить текущий уровень
            dispatch(setCurrentBucketMs({ field: f.name, bucketMs: topBucketMs }));
        }

        // Для снаппинга используем конвертированные даты (они соответствуют данным от сервера)
        const snapped = snapToBucketMs(currentRange.from, currentRange.to, topBucketMs);

        const series: MultiSeriesItemDto[] = data.series ?? [];

        for (const s of series) {
            // Конвертируем даты в bins обратно в локальное время если нужно
            const convertedBins = s.bins?.map(bin => ({
                ...bin,
                // Если используем временную зону и это не UTC,
                // нужно конвертировать время обратно для отображения
                t: bin.t // Оставляем как есть, конверсия должна быть в компоненте отображения
            })) ?? [];

            dispatch(
                upsertTiles({
                    field: s.field.name,
                    bucketMs: topBucketMs,
                    tiles: [makeReadyTile(snapped, convertedBins)],
                })
            );
        }
    } catch (e: any) {
        const msg = e?.message ?? 'Request failed';
        fieldsForStatus.forEach((f) =>
            dispatch(setFieldError({ field: f.name, error: msg }))
        );
        throw e;
    } finally {
        // завершение статусов загрузки
        fieldsForStatus.forEach((f) =>
            dispatch(setFieldLoading({ field: f.name, loading: false }))
        );
        // @ts-ignore
        sub.unsubscribe?.();
    }
});