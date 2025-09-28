// src/store/thunks.ts
import {createAsyncThunk} from '@reduxjs/toolkit';
import type {RootState} from '@/store/store';

import {chartsApi} from '@charts/shared/api/chartsApi';
import {withDb} from '@charts/shared/api/base/types';
import {notify} from '@app/lib/notify';

import type {GetMultiSeriesRequest} from '@charts/shared/contracts/chart/Dtos/Requests/GetMultiSeriesRequest';
import type {MultiSeriesResponse} from '@charts/shared/contracts/chart/Dtos/Responses/MultiSeriesResponse';
import type {MultiSeriesItemDto} from '@charts/shared/contracts/chart/Dtos/MultiSeriesItemDto';
import type {FieldDto} from '@charts/shared/contracts/metadata/Dtos/FieldDto';
import type {SeriesBinDto} from '@charts/shared/contracts/chart/Dtos/SeriesBinDto';

import {
    type BucketsMs,
    type CoverageInterval,
    finishLoading, setFieldError,
    setIsDataLoaded,
    startLoading,
    type TimeRange,
    updateView,
    upsertTiles,
} from './chartsSlice';

import {selectChartBucketingConfig} from '@charts/store/selectors';
import {selectIsSyncEnabled, selectSyncFields} from "@charts/store/selectors.ts";
import {LoadingType} from "@charts/ui/CharContainer/types.ts";

export const buildLowerOrEqualBucketsMs = (
    topBucketMs: BucketsMs,
    niceMilliseconds: number[]
): BucketsMs[] => {
    const top = Math.max(1, Math.floor(topBucketMs));
    const list = (niceMilliseconds ?? [])
        .map((s) => Math.max(1, Math.floor(s)))
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

export const fetchMultiSeriesInit = createAsyncThunk<
    void,
    GetMultiSeriesRequest,
    { state: RootState }
>('charts/fetchMultiSeriesRaw', async (request, { getState, dispatch }) => {

    // Вызываем fetchMultiSeriesSimple и получаем результат
    const data = await dispatch(fetchMultiSeries(request)).unwrap();

    // список уровней: top и всё ниже по niceMilliseconds
    const cfg = selectChartBucketingConfig(getState());

    //Получили список всех возможных уровней
    const bucketListDesc = buildLowerOrEqualBucketsMs(data.bucketMilliseconds, cfg.niceMilliseconds);

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

    dispatch(setIsDataLoaded(true))

    // Инициализируем view и уровни для каждого выбранного поля
    for (const f of request.template.selectedFields) {
        dispatch(
            updateView({
                field: f.name,
                px: px,
                currentRange: currentRange, // локальные даты для отображения
                currentBucketsMs: data.bucketMilliseconds, //Устанавливаем BucketMs, по которому можно определить текущий уровень
                seriesLevels: bucketListDesc //Создаем пустые массивы для каждого уровня
            })
        );

    }

    // Для снаппинга используем конвертированные даты (они соответствуют данным от сервера)
    const snapped = snapToBucketMs(currentRange.from, currentRange.to, data.bucketMilliseconds);

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
                bucketMs: data.bucketMilliseconds,
                tiles: [makeReadyTile(snapped, convertedBins)],
            })
        );
    }
})

export const fetchMultiSeriesRaw = createAsyncThunk<
    MultiSeriesResponse | undefined,
    {
        request: GetMultiSeriesRequest;
        field: FieldDto;
    },
    { state: RootState }
>('charts/fetchMultiSeriesRaw', async ({ request, field }, { getState, dispatch }) => {

    const state = getState();

    // Получаем текущий bucket из state для проверки
    const fieldName = typeof field.name === 'string' ? field.name : String(field.name);
    const checkBucketRelevance = () => {
        const currentState = getState();
        const currentBucket = currentState.charts.view[fieldName]?.currentBucketsMs;
        return currentBucket === request.bucketMs;
    };

    // Получаем флаг синхронизации и синхронизированные поля из state
    const isSyncEnabled = selectIsSyncEnabled(state);
    const syncFields = selectSyncFields(state);

    // Определяем список полей для загрузки
    let fieldsToLoad: ReadonlyArray<FieldDto>;

    if (isSyncEnabled && syncFields.length > 0) {
        const fieldIds = new Set<FieldDto>();
        const uniqueFields: FieldDto[] = [];

        syncFields.forEach(f => {
            if (!fieldIds.has(f)) {
                fieldIds.add(f);
                uniqueFields.push(f);
            }
        });

        if (!fieldIds.has(field)) {
            uniqueFields.push(field);
        }

        fieldsToLoad = uniqueFields;
    } else {
        fieldsToLoad = [field];
    }

    // Создаем модифицированный запрос
    const modifiedRequest: GetMultiSeriesRequest = {
        ...request,
        template: {
            ...request.template,
            selectedFields: fieldsToLoad
        }
    };

    try {
        // Вызываем основной thunk для загрузки данных
        const result = await dispatch(fetchMultiSeries(modifiedRequest)).unwrap();

        // Проверяем актуальность после загрузки
        if (!checkBucketRelevance()) {
            console.log('Bucket changed during request, skipping update');
            return undefined; // Не обновляем state если bucket изменился
        }

        // Если bucket актуален, обрабатываем результат
        if (result && result.series) {
            const snapped = snapToBucketMs(
                request.from || new Date(),
                request.to || new Date(),
                result.bucketMilliseconds
            );

            for (const s of result.series) {
                const convertedBins = s.bins?.map(bin => ({
                    ...bin,
                    t: bin.t
                })) ?? [];

                // Обновляем только если bucket все еще актуален
                if (checkBucketRelevance()) {
                    dispatch(
                        upsertTiles({
                            field: s.field.name,
                            bucketMs: result.bucketMilliseconds,
                            tiles: [makeReadyTile(snapped, convertedBins)],
                        })
                    );
                }
            }
        }

        return result;

    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        throw error;
    }
});


/**
 * Первый загрузочный thunk:
 * - дергает сервер (RTKQ + notify.run)
 * - строит список уровней: top (из сервера) и все ниже по niceMilliseconds
 * - инициализирует view и пустые сборки уровней
 * - кладёт в верхний уровень один ready-тайл на весь интервал
 */

const fetchMultiSeries = createAsyncThunk<
    MultiSeriesResponse,
    GetMultiSeriesRequest,
    { state: RootState }
>('charts/fetchMultiSeriesRaw', async (request, { dispatch }) => {

    if (!request.template) throw new Error('ResolvedCharReqTemplate is undefined');
    if (!request.template.databaseId) throw new Error('ResolvedCharReqTemplate.databaseId is undefined');

    // selectedFields гарантированно не пустой
    const fieldsForStatus: readonly FieldDto[] = request.template.selectedFields;

    // Запускаем загрузку для всех полей
    fieldsForStatus.forEach((f) =>
        dispatch(startLoading({
            field: f.name,
            type: LoadingType.Initial,
            message: 'Загрузка данных...'
        }))
    );

    // RTK Query запрос с тостами
    const sub = dispatch(
        chartsApi.endpoints.getMultiSeries.initiate(
            withDb<GetMultiSeriesRequest>(request, request.template.databaseId)
        )
    );

    try {
        const result = await notify.run(
            sub.unwrap(),
            {
                loading: { text: 'Загружаю MultiSeries… ' },
                success: { text: 'MultiSeries загружены', toastOptions: { duration: 700 } },
                error: { text: 'Не удалось загрузить MultiSeries', toastOptions: { duration: 3000 } },
            },
            { id: 'fetch-fields' }
        ) as MultiSeriesResponse;

        // Завершаем загрузку успешно
        fieldsForStatus.forEach((f) =>
            dispatch(finishLoading({
                field: f.name,
                success: true
            }))
        );

        return result;

    } catch (e: any) {
        const msg = e?.message ?? 'Request failed';
        fieldsForStatus.forEach((f) => {
            dispatch(setFieldError({ fieldName: f.name, error: msg }));
            dispatch(finishLoading({
                field: f.name,
                success: false,
                error: msg
            }));
        });
        throw e;
    } finally {
        // @ts-ignore
        sub.unsubscribe?.();
    }
});