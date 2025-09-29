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
    finishLoading,
    setFieldError,
    setIsDataLoaded,
    startLoading,
    type TimeRange, updateLoadingProgress,
    updateView,
    upsertTiles,
} from './chartsSlice';

import {selectChartBucketingConfig} from '@charts/store/selectors';
import {selectIsSyncEnabled, selectSyncFields} from "@charts/store/selectors.ts";
import {LoadingType} from "@charts/ui/CharContainer/types.ts";
import {requestManager} from "@charts/store/RequestManager.ts";
import {dataProxyService} from "@charts/store/DataProxyService.ts";

// Добавить Map для хранения отложенных запросов


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

// В thunks.ts - обновите вызов fetchMultiSeries в fetchMultiSeriesInit

export const fetchMultiSeriesInit = createAsyncThunk<
    void,
    GetMultiSeriesRequest,
    { state: RootState }
>('charts/fetchMultiSeriesRaw', async (request, { getState, dispatch }) => {

    // Вызываем fetchMultiSeries для первоначальной загрузки
    // ВАЖНО: Здесь не используем fetchMultiSeriesRaw с проверками покрытия
    const data = await dispatch(fetchMultiSeries({
        request: request,
        loadingType: LoadingType.Initial
    })).unwrap();

    // список уровней: top и всё ниже по niceMilliseconds
    const cfg = selectChartBucketingConfig(getState());

    //Получили список всех возможных уровней
    const bucketListDesc = buildLowerOrEqualBucketsMs(data.bucketMilliseconds, cfg.niceMilliseconds);

    const px = request.px;
    const requestFrom = request.from;
    const requestTo = request.to;

    // ВАЖНО: для currentRange используем ОРИГИНАЛЬНЫЕ даты, не конвертированные
    // Это локальные даты, как их видит пользователь
    const currentRange = { from: requestFrom, to: requestTo } as TimeRange;

    //Если from или to были не заданы, то находим в ответе диапазон
    if(currentRange.from == undefined){
        let minFrom = Number.MAX_VALUE;
        data.series.forEach(s => {
            const minTime = Math.min(...(s.bins.map(b => new Date(b.t).getTime())));
            minFrom = Math.min(minFrom, minTime);
        });
        currentRange.from = new Date(minFrom);
    }

    if(currentRange.to == undefined){
        let maxTo = Number.MIN_VALUE;
        data.series.forEach(s => {
            const maxTime = Math.max(...(s.bins.map(b => new Date(b.t).getTime())));
            maxTo = Math.max(maxTo, maxTime);
        });
        currentRange.to = new Date(maxTo);
    }

    dispatch(setIsDataLoaded(true));

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
        dispatch(
            upsertTiles({
                field: s.field.name,
                bucketMs: data.bucketMilliseconds,
                tiles: [makeReadyTile(snapped, s.bins)],
            })
        );
    }
});

export const fetchMultiSeriesRaw = createAsyncThunk<
MultiSeriesResponse | undefined,
    {
        request: GetMultiSeriesRequest;
        field: FieldDto;
        skipDebounce?: boolean;
        skipCoverageCheck?: boolean;
    },
{ state: RootState }
>('charts/fetchMultiSeriesRaw', async ({ request, field, skipDebounce = false, skipCoverageCheck = false }, { getState, dispatch }) => {
    const state = getState();
    const fieldName = typeof field.name === 'string' ? field.name : String(field.name);

    const view = state.charts.view[fieldName];
    if (!view || !request.template) {
        console.warn(`[fetchMultiSeriesRaw] No view or template for field: ${fieldName}`);
        return undefined;
    }

    const targetBucketMs = request.bucketMs || 60000;

    // ИСПРАВЛЕНИЕ: Используем правильный метод с правильными параметрами
    if (!skipCoverageCheck && view.seriesLevel && request.from && request.to) {
        // Используем метод checkDataNeedsLoading вместо checkExactLevelCoverage
        const coverageCheck = dataProxyService.checkDataNeedsLoading(
            view.seriesLevel,  // Передаем весь Record
            {
                bucketMs: targetBucketMs,
                from: request.from,
                to: request.to,
                minCoveragePercent: 95
            }
        );

        if (coverageCheck.hasSufficientCoverage && coverageCheck.quality === 'exact') {
            console.log(
                `[fetchMultiSeriesRaw] Sufficient exact coverage (${coverageCheck.coveragePercent.toFixed(1)}%) ` +
                `on bucket ${targetBucketMs}ms for ${fieldName}, skipping request`
            );
            return undefined;
        }

        // Если есть stale данные, можем их использовать временно
        if (coverageCheck.hasSufficientCoverage && coverageCheck.quality !== 'exact') {
            console.log(
                `[fetchMultiSeriesRaw] Using ${coverageCheck.quality} data ` +
                `(${coverageCheck.coveragePercent.toFixed(1)}%) for ${fieldName}`
            );
            // Продолжаем загрузку для получения точных данных
        }
    }

    try {
        const executeRequestFn = async (signal: AbortSignal): Promise<MultiSeriesResponse> => {
            const currentState = getState();
            const isSyncEnabled = selectIsSyncEnabled(currentState);
            const syncFields = selectSyncFields(currentState);

            let fieldsToLoad: ReadonlyArray<FieldDto> = [field];

            // Обработка синхронизированных полей
            if (isSyncEnabled && syncFields.length > 0) {
                const fieldIds = new Set<string>();
                const uniqueFields: FieldDto[] = [];

                syncFields.forEach(f => {
                    if (!fieldIds.has(f.name)) {
                        fieldIds.add(f.name);
                        uniqueFields.push(f);
                    }
                });

                if (!fieldIds.has(field.name)) {
                    fieldIds.add(field.name);
                    uniqueFields.push(field);
                }

                fieldsToLoad = uniqueFields;

                // Проверяем покрытие для всех синхронизированных полей
                if (!skipCoverageCheck) {
                    let allHaveCoverage = true;

                    for (const syncField of fieldsToLoad) {
                        const syncFieldView = currentState.charts.view[syncField.name];
                        if (!syncFieldView || !syncFieldView.seriesLevel) {
                            allHaveCoverage = false;
                            break;
                        }

                        const syncCoverageCheck = dataProxyService.checkDataNeedsLoading(
                            syncFieldView.seriesLevel,
                            {
                                bucketMs: targetBucketMs,
                                from: request.from,
                                to: request.to,
                                minCoveragePercent: 95
                            }
                        );

                        if (!syncCoverageCheck.hasSufficientCoverage ||
                            syncCoverageCheck.quality !== 'exact') {
                            allHaveCoverage = false;
                            console.log(
                                `[fetchMultiSeriesRaw] Sync field ${syncField.name} needs data: ` +
                                `${syncCoverageCheck.coveragePercent.toFixed(1)}% ${syncCoverageCheck.quality}`
                            );
                            break;
                        }
                    }

                    if (allHaveCoverage) {
                        console.log(`[fetchMultiSeriesRaw] All sync fields have sufficient coverage, skipping`);
                        throw new DOMException('All fields have sufficient coverage', 'AbortError');
                    }
                }
            }

            // Создаем запрос с выбранными полями
            const modifiedRequest: GetMultiSeriesRequest = {
                ...request,
                template: {
                    ...request.template,
                    selectedFields: fieldsToLoad
                }
            };

            // Вызываем API
            const response = await dispatch(
                fetchMultiSeries({
                    request: modifiedRequest,
                    loadingType: LoadingType.Zoom
                })
            ).unwrap();

            if (signal.aborted) {
                throw new DOMException('Request was aborted', 'AbortError');
            }

            return response;
        };

        // Используем RequestManager для управления запросом
        let result: MultiSeriesResponse;

        if (skipDebounce) {
            const abortController = new AbortController();
            result = await executeRequestFn(abortController.signal);
        } else {
            result = await requestManager.executeRequest<MultiSeriesResponse>(
                {
                    field,
                    bucketMs: targetBucketMs,
                    from: request.from,
                    to: request.to,
                    px: request.px || 1200,
                    onProgress: (progress) => {
                        dispatch(updateLoadingProgress({
                            field: fieldName,
                            progress,
                            message: `Загрузка данных: ${Math.round(progress)}%`,
                            estimatedEndTime: Date.now() + ((100 - progress) * 20)
                        }));
                    }
                },
                executeRequestFn
            );
        }

        // Проверяем актуальность bucket после загрузки
        const currentState = getState();
        const currentView = currentState.charts.view[fieldName];

        if (!currentView || currentView.currentBucketsMs !== targetBucketMs) {
            console.log(
                `[fetchMultiSeriesRaw] Bucket changed during request for ${fieldName}, ` +
                `was ${targetBucketMs}ms, now ${currentView?.currentBucketsMs}ms`
            );
            return undefined;
        }

        // Обработка полученных данных
        if (result && result.series && Array.isArray(result.series)) {
            const snapped = snapToBucketMs(
                request.from,
                request.to,
                result.bucketMilliseconds
            );

            for (const seriesItem of result.series) {
                const targetFieldName = seriesItem.field.name;
                const targetView = currentState.charts.view[targetFieldName];

                if (!targetView) {
                    console.warn(`[fetchMultiSeriesRaw] No view for field ${targetFieldName}`);
                    continue;
                }

                if (targetView.currentBucketsMs !== result.bucketMilliseconds) {
                    console.log(
                        `[fetchMultiSeriesRaw] Bucket mismatch for ${targetFieldName}, ` +
                        `expected ${targetView.currentBucketsMs}ms, got ${result.bucketMilliseconds}ms`
                    );
                    continue;
                }

                const bins = seriesItem.bins || [];
                const convertedBins: SeriesBinDto[] = bins.map(bin => ({
                    ...bin,
                    t: bin.t instanceof Date ? bin.t : new Date(bin.t)
                }));

                dispatch(
                    upsertTiles({
                        field: targetFieldName,
                        bucketMs: result.bucketMilliseconds,
                        tiles: [makeReadyTile(snapped, convertedBins)],
                    })
                );

                console.log(
                    `[fetchMultiSeriesRaw] Saved ${convertedBins.length} bins for ${targetFieldName} ` +
                    `at bucket ${result.bucketMilliseconds}ms`
                );
            }
        }

        return result;

    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log(`[fetchMultiSeriesRaw] Request for ${fieldName} was cancelled`);

            // Завершаем загрузку без ошибки для отмененных запросов
            dispatch(finishLoading({
                field: fieldName,
                success: false,
                error: undefined
            }));

            return undefined;
        }

        console.error(`[fetchMultiSeriesRaw] Error loading data for ${fieldName}:`, error);
        const errorMessage = error?.message || 'Ошибка загрузки данных';

        dispatch(setFieldError({
            fieldName,
            error: errorMessage
        }));

        dispatch(finishLoading({
            field: fieldName,
            success: false,
            error: errorMessage
        }));

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
    { request: GetMultiSeriesRequest, loadingType: LoadingType, loadingMessage?: string | undefined },
    { state: RootState }
>('charts/fetchMultiSeriesRaw', async (data, { dispatch }) => {

    const{ request, loadingType, loadingMessage } = data;

    if (!request.template) throw new Error('ResolvedCharReqTemplate is undefined');
    if (!request.template.databaseId) throw new Error('ResolvedCharReqTemplate.databaseId is undefined');

    // selectedFields гарантированно не пустой
    const fieldsForStatus: readonly FieldDto[] = request.template.selectedFields;

    // Запускаем загрузку для всех полей
    fieldsForStatus.forEach((f) =>
        dispatch(startLoading({
            field: f.name,
            type: loadingType,
            message: loadingMessage ?? 'Загрузка данных...'
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