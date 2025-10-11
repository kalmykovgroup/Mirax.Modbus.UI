// store/thunks/dataThunks.ts
// THUNK ЗАГРУЗКИ ДАННЫХ: загружает данные для конкретного диапазона и bucket

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';



import {type DataLoadRequest, type DataLoadResult} from '@chartsPage/charts/core/store/types/loading.types';
import {
    finishLoading,
    setFieldError,
    startLoading,
    updateLoadingProgress
} from "@chartsPage/charts/core/store/chartsSlice.ts";
import type {MultiSeriesResponse} from "@chartsPage/charts/core/dtos/responses/MultiSeriesResponse.ts";
import type {GetMultiSeriesRequest} from "@chartsPage/charts/core/dtos/requests/GetMultiSeriesRequest.ts";
import {chartsApi} from "@chartsPage/charts/core/api/chartsApi.ts";
import {withDb} from "@chartsPage/baseApi/types.ts";


/**
 * Загрузка данных для диапазона
 * - Выполняет запрос к API
 * - Управляет состоянием загрузки
 * - Поддерживает отмену через AbortSignal
 * - Возвращает сырой response
 *
 * Обработка данных и сохранение в store - в DataProcessingService
 */
export const fetchMultiSeriesData = createAsyncThunk<
    DataLoadResult,
    {data: DataLoadRequest, contextId: string},
    { state: RootState }
>(
    'charts/fetchMultiSeriesData',
    async (
        { data, contextId  },
        { dispatch, rejectWithValue }
    ) => {
   const  {request, fields, loadingType, signal, onProgress} = data

        if (!request.template?.databaseId) {
            return rejectWithValue('Missing template or databaseId');
        }

        // Проверка отмены перед стартом
        if (signal?.aborted) {
            return { response: {} as MultiSeriesResponse, wasAborted: true };
        }

        // Стартуем загрузку для всех полей
        fields.forEach(field => {
            dispatch(startLoading({
                contextId: contextId,
                field: field.name,
                type: loadingType,
                message: 'Загрузка данных...'
            }));
        });

        // Создаём запрос с выбранными полями
        const modifiedRequest: GetMultiSeriesRequest = {
            ...request,
            template: {
                ...request.template,
                selectedFields: fields
            }
        };

        const from = new Date(modifiedRequest.template.resolvedFromMs!)
        const to = new Date(modifiedRequest.template.resolvedToMs!)

        console.log("Запрос на до загрузку", from, to, modifiedRequest)

        const subscription = dispatch(
            chartsApi.endpoints.getMultiSeries.initiate(
                withDb<GetMultiSeriesRequest>(
                    modifiedRequest,
                    request.template.databaseId
                )
            )
        );

        try {
            // Имитация прогресса (реальный прогресс требует поддержки на бэкенде)
            let progressInterval: NodeJS.Timeout | undefined;

            if (onProgress) {
                let currentProgress = 0;
                progressInterval = setInterval(() => {
                    if (currentProgress < 90) {
                        currentProgress += 10;
                        onProgress(currentProgress);

                        fields.forEach(field => {
                            dispatch(updateLoadingProgress({
                                contextId,
                                field: field.name,
                                progress: currentProgress,
                                message: `Загрузка: ${currentProgress}%`
                            }));
                        });
                    }
                }, 100);
            }

            const response = await subscription.unwrap();

            // Завершаем прогресс
            if (progressInterval) {
                clearInterval(progressInterval);
            }

            // Проверка отмены после загрузки
            if (signal?.aborted) {
                fields.forEach(field => {
                    dispatch(finishLoading({
                        contextId,
                        field: field.name,
                        success: false,
                        message: undefined
                    }));
                });
                return { response, wasAborted: true };
            }

            // Успех - устанавливаем 100%
            if (onProgress) {
                onProgress(100);
            }

            fields.forEach(field => {
                dispatch(updateLoadingProgress({
                    contextId,
                    field: field.name,
                    progress: 100,
                    message: undefined
                }));
                dispatch(finishLoading({
                    contextId,
                    field: field.name,
                    success: true,
                    message: undefined
                }));
            });

            return { response, wasAborted: false };

        } catch (error: any) {
            // Обработка отмены
            if (error.name === 'AbortError' || signal?.aborted) {
                fields.forEach(field => {
                    dispatch(finishLoading({
                        contextId,
                        field: field.name,
                        success: false,
                        message: undefined
                    }));
                });

                return {
                    response: {} as MultiSeriesResponse,
                    wasAborted: true
                };
            }

            // Обработка ошибки
            const errorMessage = error?.message || 'Ошибка загрузки данных';

            fields.forEach(field => {
                dispatch(setFieldError({
                    contextId,
                    fieldName: field.name,
                    errorMessage: errorMessage
                }));
                dispatch(finishLoading({
                    contextId,
                    field: field.name,
                    success: false,
                    message: errorMessage
                }));
            });

            return rejectWithValue(errorMessage);

        } finally {
            subscription.unsubscribe?.();
        }
    }
);