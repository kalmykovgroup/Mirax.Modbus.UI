// store/thunks/dataThunks.ts
// THUNK ЗАГРУЗКИ ДАННЫХ: загружает данные для конкретного диапазона и bucket

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';



import {type DataLoadRequest, type DataLoadResult} from '@charts/charts/core/types/loading.types';
import {
    finishLoading,
    setFieldError,
    startLoading,
    updateLoadingProgress
} from "@charts/charts/core/store/chartsSlice.ts";
import type {MultiSeriesResponse} from "@charts/charts/core/dtos/responses/MultiSeriesResponse.ts";
import type {GetMultiSeriesRequest} from "@charts/charts/core/dtos/requests/GetMultiSeriesRequest.ts";
import {chartsApi} from "@charts/charts/core/api/chartsApi.ts";
import {withDb} from "@charts/api/types.ts";


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
    DataLoadRequest,
    { state: RootState }
>(
    'charts/fetchMultiSeriesData',
    async (
        { request, fields, loadingType, signal, onProgress },
        { dispatch, rejectWithValue }
    ) => {
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
                        field: field.name,
                        success: false,
                        error: undefined
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
                    field: field.name,
                    progress: 100
                }));
                dispatch(finishLoading({
                    field: field.name,
                    success: true
                }));
            });

            return { response, wasAborted: false };

        } catch (error: any) {
            // Обработка отмены
            if (error.name === 'AbortError' || signal?.aborted) {
                fields.forEach(field => {
                    dispatch(finishLoading({
                        field: field.name,
                        success: false,
                        error: undefined
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
                    fieldName: field.name,
                    error: errorMessage
                }));
                dispatch(finishLoading({
                    field: field.name,
                    success: false,
                    error: errorMessage
                }));
            });

            return rejectWithValue(errorMessage);

        } finally {
            subscription.unsubscribe?.();
        }
    }
);