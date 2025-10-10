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
} from "@chartsPage/charts/core/store/chartsSlice.ts";
import {withDb} from "@chartsPage/baseApi/types.ts";
import {extractErrorMessage} from "@chartsPage/baseApi/errorHandlers.ts";
import {LoadingType} from "@chartsPage/charts/core/store/types/loading.types.ts";
import type {GetMultiSeriesRequest} from "@chartsPage/charts/core/dtos/requests/GetMultiSeriesRequest.ts";
import type {MultiSeriesResponse} from "@chartsPage/charts/core/dtos/responses/MultiSeriesResponse.ts";
import {chartsApi} from "@chartsPage/charts/core/api/chartsApi.ts";
import type {Guid} from "@app/lib/types/Guid.ts";


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
    {data: GetMultiSeriesRequest, tabId: Guid},
    { state: RootState }
>(
    'charts/fetchMultiSeriesInit',
    async (request, { dispatch, rejectWithValue }) => {
        if (!request.data.template?.databaseId) {
            return rejectWithValue('Missing template or databaseId');
        }

        const subscription = dispatch(
            chartsApi.endpoints.getMultiSeries.initiate(
                withDb<GetMultiSeriesRequest>(request.data, request.data.template.databaseId)
            )
        );

        dispatch(startLoadingFields({
            tabId: request.tabId,
            fields: request.data.template.selectedFields,
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
                tabId: request.tabId,
                fields: request.data.template.selectedFields,
                success: true,
                error: undefined
            }));

            dispatch(setIsDataLoaded({isLoaded: true, tabId: request.tabId}));

            return result;


        } catch (error: any) {
            const errorMessage = extractErrorMessage(error)

            console.error('[initThunks] Error:', {
                raw: error,
                extracted: errorMessage,
                status: error?.status,
                serverData: error?.data
            })

            request.data.template.selectedFields.forEach(field => {
                dispatch(setFieldError({
                    tabId: request.tabId,
                    fieldName: field.name,
                    errorMessage: errorMessage
                }));
                dispatch(finishLoading({
                    tabId: request.tabId,
                    field: field.name,
                    success: false,
                    errorMessage: errorMessage
                }));
            });

            return rejectWithValue(errorMessage);

        } finally {
            subscription.unsubscribe?.();
        }
    }
);