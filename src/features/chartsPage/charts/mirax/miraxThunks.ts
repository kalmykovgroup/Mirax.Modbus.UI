// src/features/mirax/store/thunks/miraxThunks.ts

import { createAsyncThunk } from '@reduxjs/toolkit';
import type {RootState} from "@/store/store.ts";
import {miraxApi} from "@chartsPage/charts/mirax/miraxApi.ts";
import {withDb} from "@chartsPage/baseApi/types.ts";
import type {
    LoadPortableDevicesRequest, LoadSensorsRequest,
    LoadTechnicalRunsRequest,
    PortableDevicesLoadResult, SensorsLoadResult,
    TechnicalRunsLoadResult
} from "@chartsPage/charts/mirax/miraxThunk.types.ts";
import {
    finishDevicesLoading, finishSensorsLoading,
    finishTechnicalRunsLoading, startDevicesLoading, startSensorsLoading,
    startTechnicalRunsLoading, updateDevicesProgress, updateSensorsProgress,
    updateTechnicalRunsProgress
} from "@chartsPage/charts/mirax/miraxSlice.ts";
import {notify} from "@app/lib/notify.ts";
import type {TechnicalRunDto} from "@chartsPage/charts/mirax/contracts/TechnicalRunDto.ts";
import type {PortableDeviceDto} from "@chartsPage/charts/mirax/contracts/PortableDeviceDto.ts";
import type {SensorDto} from "@chartsPage/charts/mirax/contracts/SensorDto.ts";


/**
 * Загрузка списка испытаний
 */
export const fetchTechnicalRuns = createAsyncThunk<
TechnicalRunsLoadResult,
    LoadTechnicalRunsRequest,
{ state: RootState }
>(
    'mirax/fetchTechnicalRuns',
        async ({ databaseId, signal, onProgress }, { dispatch, rejectWithValue }) => {
            // Проверка отмены перед стартом
            if (signal?.aborted) {
                return { data: [], wasAborted: true };
            }

            // Стартуем загрузку
            dispatch(startTechnicalRunsLoading());

            const subscription = dispatch(
                miraxApi.endpoints.getTechnicalRuns.initiate(
                    withDb<void>(undefined, databaseId)
                )
            );

            try {
                // Имитация прогресса
                let progressInterval: NodeJS.Timeout | undefined;

                if (onProgress) {
                    let currentProgress = 0;
                    progressInterval = setInterval(() => {
                        if (currentProgress < 90) {
                            currentProgress += 10;
                            onProgress(currentProgress);
                            dispatch(updateTechnicalRunsProgress(currentProgress));
                        }
                    }, 100);
                }

                const response = await notify.run(
                    subscription.unwrap(),
                    {
                        loading: { text: 'Загрузка испытаний...' },
                        success: {
                            text: 'Испытания загружены',
                            toastOptions: { duration: 700 }
                        },
                        error:{
                            toastOptions: { duration: 3000 }
                        }
                        // error НЕ указываем - baseQuery показал ошибку
                    },
                    { id: 'fetch-technical-runs' }
                ) as TechnicalRunDto[]


                // Завершаем прогресс
                if (progressInterval) {
                    clearInterval(progressInterval);
                }

                // Проверка отмены после загрузки
                if (signal?.aborted) {
                    dispatch(
                        finishTechnicalRunsLoading({
                            success: false,
                            error: undefined,
                        })
                    );
                    return { data: response, wasAborted: true };
                }

                // Успех
                if (onProgress) {
                    onProgress(100);
                }

                dispatch(updateTechnicalRunsProgress(100));
                dispatch(finishTechnicalRunsLoading({ success: true }));

                return { data: response, wasAborted: false };
            } catch (error: any) {
                // Обработка отмены
                if (error.name === 'AbortError' || signal?.aborted) {
                    dispatch(
                        finishTechnicalRunsLoading({
                            success: false,
                            error: undefined,
                        })
                    );
                    return { data: [], wasAborted: true };
                }

                // Обработка ошибки
                const errorMessage = error?.message || 'Ошибка загрузки испытаний';

                dispatch(
                    finishTechnicalRunsLoading({
                        success: false,
                        error: errorMessage,
                    })
                );

                return rejectWithValue(errorMessage);
            } finally {
                subscription.unsubscribe?.();
            }
        }
);

/**
 * Загрузка устройств для испытания
 */
export const fetchPortableDevices = createAsyncThunk<
PortableDevicesLoadResult,
    LoadPortableDevicesRequest,
{ state: RootState }
>(
    'mirax/fetchPortableDevices',
        async (
            { databaseId, technicalRunId, signal, onProgress },
            { dispatch, rejectWithValue }
        ) => {
            // Проверка отмены перед стартом
            if (signal?.aborted) {
                return { data: [], wasAborted: true };
            }

            // Стартуем загрузку
            dispatch(startDevicesLoading(technicalRunId));

            const subscription = dispatch(
                miraxApi.endpoints.getPortableDevices.initiate(
                    withDb({ technicalRunId }, databaseId)
                )
            );

            try {
                // Имитация прогресса
                let progressInterval: NodeJS.Timeout | undefined;

                if (onProgress) {
                    let currentProgress = 0;
                    progressInterval = setInterval(() => {
                        if (currentProgress < 90) {
                            currentProgress += 10;
                            onProgress(currentProgress);
                            dispatch(
                                updateDevicesProgress({
                                    technicalRunId,
                                    progress: currentProgress,
                                })
                            );
                        }
                    }, 100);
                }

                const response = await notify.run(
                    subscription.unwrap(),
                    {
                        loading: { text: 'Загрузка списка устройств...' },
                        success: {
                            text: 'Устройства загружены',
                            toastOptions: { duration: 700 }
                        },
                        error:{
                            toastOptions: { duration: 3000 }
                        }
                        // error НЕ указываем - baseQuery показал ошибку
                    },
                    { id: 'fetch-portable-devices' }
                ) as PortableDeviceDto[]



                // Завершаем прогресс
                if (progressInterval) {
                    clearInterval(progressInterval);
                }

                // Проверка отмены после загрузки
                if (signal?.aborted) {
                    dispatch(
                        finishDevicesLoading({
                            technicalRunId,
                            success: false,
                            error: undefined,
                        })
                    );
                    return { data: response, wasAborted: true };
                }

                // Успех
                if (onProgress) {
                    onProgress(100);
                }

                dispatch(
                    updateDevicesProgress({
                        technicalRunId,
                        progress: 100,
                    })
                );
                dispatch(
                    finishDevicesLoading({
                        technicalRunId,
                        success: true,
                    })
                );

                return { data: response, wasAborted: false };
            } catch (error: any) {
                // Обработка отмены
                if (error.name === 'AbortError' || signal?.aborted) {
                    dispatch(
                        finishDevicesLoading({
                            technicalRunId,
                            success: false,
                            error: undefined,
                        })
                    );
                    return { data: [], wasAborted: true };
                }

                // Обработка ошибки
                const errorMessage = error?.message || 'Ошибка загрузки устройств';

                dispatch(
                    finishDevicesLoading({
                        technicalRunId,
                        success: false,
                        error: errorMessage,
                    })
                );

                return rejectWithValue(errorMessage);
            } finally {
                subscription.unsubscribe?.();
            }
        }
);

/**
 * Загрузка сенсоров для устройства
 */
export const fetchSensors = createAsyncThunk<
SensorsLoadResult,
    LoadSensorsRequest,
{ state: RootState }
>(
    'mirax/fetchSensors',
        async (
            { databaseId, technicalRunId, factoryNumber, signal, onProgress },
            { dispatch, rejectWithValue }
        ) => {
            // Проверка отмены перед стартом
            if (signal?.aborted) {
                return { data: [], wasAborted: true };
            }

            // Стартуем загрузку
            dispatch(startSensorsLoading({ technicalRunId, factoryNumber }));

            const subscription = dispatch(
                miraxApi.endpoints.getSensors.initiate(
                    withDb({ technicalRunId, factoryNumber }, databaseId)
                )
            );

            try {
                // Имитация прогресса
                let progressInterval: NodeJS.Timeout | undefined;

                if (onProgress) {
                    let currentProgress = 0;
                    progressInterval = setInterval(() => {
                        if (currentProgress < 90) {
                            currentProgress += 10;
                            onProgress(currentProgress);
                            dispatch(
                                updateSensorsProgress({
                                    technicalRunId,
                                    factoryNumber,
                                    progress: currentProgress,
                                })
                            );
                        }
                    }, 100);
                }

                const response = await notify.run(
                    subscription.unwrap(),
                    {
                        loading: { text: 'Загрузка сенсоров...' },
                        success: {
                            text: 'Сенсоры загружены',
                            toastOptions: { duration: 700 }
                        },
                        error:{
                            toastOptions: { duration: 3000 }
                        }
                    },
                    { id: 'fetch-sensors' }
                ) as SensorDto[]



                // Завершаем прогресс
                if (progressInterval) {
                    clearInterval(progressInterval);
                }

                // Проверка отмены после загрузки
                if (signal?.aborted) {
                    dispatch(
                        finishSensorsLoading({
                            technicalRunId,
                            factoryNumber,
                            success: false,
                            error: undefined,
                        })
                    );
                    return { data: response, wasAborted: true };
                }

                // Успех
                if (onProgress) {
                    onProgress(100);
                }

                dispatch(
                    updateSensorsProgress({
                        technicalRunId,
                        factoryNumber,
                        progress: 100,
                    })
                );
                dispatch(
                    finishSensorsLoading({
                        technicalRunId,
                        factoryNumber,
                        success: true,
                    })
                );

                return { data: response, wasAborted: false };
            } catch (error: any) {
                // Обработка отмены
                if (error.name === 'AbortError' || signal?.aborted) {
                    dispatch(
                        finishSensorsLoading({
                            technicalRunId,
                            factoryNumber,
                            success: false,
                            error: undefined,
                        })
                    );
                    return { data: [], wasAborted: true };
                }

                // Обработка ошибки
                const errorMessage = error?.message || 'Ошибка загрузки сенсоров';

                dispatch(
                    finishSensorsLoading({
                        technicalRunId,
                        factoryNumber,
                        success: false,
                        error: errorMessage,
                    })
                );

                return rejectWithValue(errorMessage);
            } finally {
                subscription.unsubscribe?.();
            }
        }
);