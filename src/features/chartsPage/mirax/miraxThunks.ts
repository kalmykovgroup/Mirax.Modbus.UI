// src/features/mirax/store/thunks/miraxThunks.ts

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
import { miraxApi } from '@chartsPage/mirax/miraxApi';
import { withDb } from '@chartsPage/baseApi/types';
import type {
    LoadPortableDevicesRequest,
    LoadSensorsRequest,
    LoadTechnicalRunsRequest,
    PortableDevicesLoadResult,
    SensorsLoadResult,
    TechnicalRunsLoadResult,
} from '@chartsPage/mirax/miraxThunk.types';
import {
    finishDevicesLoading,
    finishSensorsLoading,
    finishTechnicalRunsLoading,
    setTechnicalRunsData,
    setDevicesData,
    setSensorsData,
    startDevicesLoading,
    startSensorsLoading,
    startTechnicalRunsLoading,
    updateDevicesProgress,
    updateSensorsProgress,
    updateTechnicalRunsProgress,
} from '@chartsPage/mirax/miraxSlice';
import { notify } from '@app/lib/notify';
import type { TechnicalRunDto } from '@chartsPage/mirax/contracts/TechnicalRunDto';
import type { PortableDeviceDto } from '@chartsPage/mirax/contracts/PortableDeviceDto';
import type { SensorDto } from '@chartsPage/mirax/contracts/SensorDto';

export const fetchTechnicalRuns = createAsyncThunk<
    TechnicalRunsLoadResult,
    LoadTechnicalRunsRequest,
    { state: RootState }
>(
    'mirax/fetchTechnicalRuns',
    async ({ databaseId, signal, onProgress }, { dispatch, rejectWithValue }) => {
        if (signal?.aborted) {
            return { data: [], wasAborted: true };
        }

        dispatch(startTechnicalRunsLoading());

        const subscription = dispatch(
            miraxApi.endpoints.getTechnicalRuns.initiate(withDb(undefined, databaseId))
        );

        try {
            let progressInterval: NodeJS.Timeout | undefined;

            if (onProgress !== undefined) {
                let currentProgress = 0;
                progressInterval = setInterval(() => {
                    if (currentProgress < 90) {
                        currentProgress += 10;
                        onProgress(currentProgress);
                        dispatch(updateTechnicalRunsProgress(currentProgress));
                    }
                }, 100);
            }

            const response = (await notify.run(
                subscription.unwrap(),
                {
                    loading: { text: 'Загрузка списка испытаний...' },
                    success: {
                        text: 'Испытания загружены',
                        toastOptions: { duration: 700 },
                    },
                    error: {
                        toastOptions: { duration: 3000 },
                    },
                },
                { id: 'fetch-technical-runs' }
            )) as TechnicalRunDto[];

            if (progressInterval !== undefined) {
                clearInterval(progressInterval);
            }

            if (signal?.aborted) {
                dispatch(
                    finishTechnicalRunsLoading({
                        success: false,
                        error: undefined,
                    })
                );
                return { data: response, wasAborted: true };
            }

            if (onProgress !== undefined) {
                onProgress(100);
            }
            dispatch(updateTechnicalRunsProgress(100));

            dispatch(setTechnicalRunsData(response));

            dispatch(
                finishTechnicalRunsLoading({
                    success: true,
                })
            );

            return { data: response, wasAborted: false };
        } catch (error: unknown) {
            if (
                (error !== null &&
                    typeof error === 'object' &&
                    'name' in error &&
                    error.name === 'AbortError') ||
                signal?.aborted
            ) {
                dispatch(
                    finishTechnicalRunsLoading({
                        success: false,
                        error: undefined,
                    })
                );
                return { data: [], wasAborted: true };
            }

            const errorMessage =
                error !== null && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
                    ? error.message
                    : 'Ошибка загрузки списка испытаний';

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

export const fetchPortableDevices = createAsyncThunk<
    PortableDevicesLoadResult,
    LoadPortableDevicesRequest,
    { state: RootState }
>(
    'mirax/fetchPortableDevices',
    async ({ databaseId, technicalRunId, signal, onProgress }, { dispatch, rejectWithValue }) => {
        if (signal?.aborted) {
            return { data: [], wasAborted: true };
        }

        dispatch(startDevicesLoading(technicalRunId));

        const subscription = dispatch(
            miraxApi.endpoints.getPortableDevices.initiate(
                withDb({ technicalRunId }, databaseId)
            )
        );

        try {
            let progressInterval: NodeJS.Timeout | undefined;

            if (onProgress !== undefined) {
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

            const response = (await notify.run(
                subscription.unwrap(),
                {
                    loading: { text: 'Загрузка списка устройств...' },
                    success: {
                        text: 'Устройства загружены',
                        toastOptions: { duration: 700 },
                    },
                    error: {
                        toastOptions: { duration: 3000 },
                    },
                },
                { id: 'fetch-portable-devices' }
            )) as PortableDeviceDto[];

            if (progressInterval !== undefined) {
                clearInterval(progressInterval);
            }

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

            if (onProgress !== undefined) {
                onProgress(100);
            }

            dispatch(
                updateDevicesProgress({
                    technicalRunId,
                    progress: 100,
                })
            );

            // ✅ Сохраняем данные в slice
            dispatch(
                setDevicesData({
                    technicalRunId,
                    devices: response,
                })
            );

            dispatch(
                finishDevicesLoading({
                    technicalRunId,
                    success: true,
                })
            );

            return { data: response, wasAborted: false };
        } catch (error: unknown) {
            if (
                (error !== null &&
                    typeof error === 'object' &&
                    'name' in error &&
                    error.name === 'AbortError') ||
                signal?.aborted
            ) {
                dispatch(
                    finishDevicesLoading({
                        technicalRunId,
                        success: false,
                        error: undefined,
                    })
                );
                return { data: [], wasAborted: true };
            }

            const errorMessage =
                error !== null && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
                    ? error.message
                    : 'Ошибка загрузки устройств';

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
        if (signal?.aborted) {
            return { data: [], wasAborted: true };
        }

        dispatch(startSensorsLoading({ technicalRunId, factoryNumber }));

        const subscription = dispatch(
            miraxApi.endpoints.getSensors.initiate(
                withDb({ technicalRunId, factoryNumber }, databaseId)
            )
        );

        try {
            let progressInterval: NodeJS.Timeout | undefined;

            if (onProgress !== undefined) {
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

            const response = (await notify.run(
                subscription.unwrap(),
                {
                    loading: { text: 'Загрузка сенсоров...' },
                    success: {
                        text: 'Сенсоры загружены',
                        toastOptions: { duration: 700 },
                    },
                    error: {
                        toastOptions: { duration: 3000 },
                    },
                },
                { id: 'fetch-sensors' }
            )) as SensorDto[];

            if (progressInterval !== undefined) {
                clearInterval(progressInterval);
            }

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

            if (onProgress !== undefined) {
                onProgress(100);
            }

            dispatch(
                updateSensorsProgress({
                    technicalRunId,
                    factoryNumber,
                    progress: 100,
                })
            );

            // ✅ Сохраняем данные в slice
            dispatch(
                setSensorsData({
                    technicalRunId,
                    factoryNumber,
                    sensors: response,
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
        } catch (error: unknown) {
            if (
                (error !== null &&
                    typeof error === 'object' &&
                    'name' in error &&
                    error.name === 'AbortError') ||
                signal?.aborted
            ) {
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

            const errorMessage =
                error !== null && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
                    ? error.message
                    : 'Ошибка загрузки сенсоров';

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