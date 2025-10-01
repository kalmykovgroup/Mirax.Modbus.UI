// store/thunks/initThunks.ts
// THUNK ИНИЦИАЛИЗАЦИИ: первая загрузка данных с инициализацией view

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
import { notify } from '@app/lib/notify';

import {
    finishLoading,
    finishLoadings,
    setFieldError, setIsDataLoaded,
    startLoadingFields
} from "@charts/charts/core/store/chartsSlice.ts";
import {withDb} from "@charts/api/types.ts";
import {extractErrorMessage} from "@charts/api/errorHandlers.ts";
import {LoadingType} from "@charts/charts/core/types/loading.types.ts";
import type {GetMultiSeriesRequest} from "@charts/charts/core/dtos/requests/GetMultiSeriesRequest.ts";
import type {MultiSeriesResponse} from "@charts/charts/core/dtos/responses/MultiSeriesResponse.ts";
import {chartsApi} from "@charts/charts/core/api/chartsApi.ts";


/**
 * Первичная инициализация графиков
 * - Загружает данные с сервера
 * - Инициализирует view для каждого поля
 * - Возвращает response и список уровней
 *
 * Логика обработки данных НЕ в thunk - в сервисах
 */
export const fetchMultiSeriesInit = createAsyncThunk<
    MultiSeriesResponse | any,
    GetMultiSeriesRequest,
    { state: RootState }
>(
    'charts/fetchMultiSeriesInit',
    async (request, { dispatch, rejectWithValue }) => {
        if (!request.template?.databaseId) {
            return rejectWithValue('Missing template or databaseId');
        }

        const subscription = dispatch(
            chartsApi.endpoints.getMultiSeries.initiate(
                withDb<GetMultiSeriesRequest>(request, request.template.databaseId)
            )
        );

        dispatch(startLoadingFields({
            fields: request.template.selectedFields,
            type: LoadingType.Initial,
            message: 'Инициализация графика...'
        }));

        try {

            // Используем notify.run, но БЕЗ блока error
            // (ошибки уже обработаны в chartsBaseQuery)
            const result = await notify.run(
                subscription.unwrap(),
                {
                    loading: { text: 'Загрузка данных...' },
                    success: {
                        text: 'Данные загружены',
                        toastOptions: { duration: 700 }
                    },
                    error:{
                        toastOptions: { duration: 3000 }
                    }
                    // error НЕ указываем - baseQuery показал ошибку
                },
                { id: 'fetch-init' }
            ) as MultiSeriesResponse


            // Успешная загрузка
            dispatch(finishLoadings({
                fields: request.template.selectedFields,
                success: true,
                error: undefined
            }));

            dispatch(setIsDataLoaded(true));

            return result;


        } catch (error: any) {
            const errorMessage = extractErrorMessage(error)

            console.error('[initThunks] Error:', {
                raw: error,
                extracted: errorMessage,
                status: error?.status,
                serverData: error?.data
            })

            request.template.selectedFields.forEach(field => {
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