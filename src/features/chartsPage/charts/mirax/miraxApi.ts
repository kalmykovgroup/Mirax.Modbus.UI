// src/features/mirax/api/miraxApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosChartsBaseQuery } from '@chartsPage/baseApi/chartsBaseQuery.ts';
import type { RequestWithDb } from '@chartsPage/baseApi/types.ts';
import type {TechnicalRunDto} from "@chartsPage/charts/mirax/contracts/TechnicalRunDto.ts";
import type {PortableDeviceDto} from "@chartsPage/charts/mirax/contracts/PortableDeviceDto.ts";
import type {SensorDto} from "@chartsPage/charts/mirax/contracts/SensorDto.ts";


// Эндпоинты API
const MIRAX_ENDPOINTS = {
    TECHNICAL_RUNS: '/mirax/technical-runs',
    DEVICES: (technicalRunId: string) => `/mirax/technical-runs/${technicalRunId}/devices`,
    SENSORS: (technicalRunId: string, factoryNumber: string) =>
        `/mirax/technical-runs/${technicalRunId}/devices/${encodeURIComponent(factoryNumber)}/sensors`,
} as const;


/**
 * Параметры для получения устройств
 */
export interface GetPortableDevicesParams {
    readonly technicalRunId: string;
}

/**
 * Параметры для получения сенсоров
 */
export interface GetSensorsParams {
    readonly technicalRunId: string;
    readonly factoryNumber: string;
}

export const miraxApi = createApi({
    reducerPath: 'miraxApi',
    baseQuery: axiosChartsBaseQuery(),
    tagTypes: ['TechnicalRun', 'PortableDevice', 'Sensor'],
    endpoints: (builder) => ({


        getTechnicalRuns: builder.query<TechnicalRunDto[], RequestWithDb<void>>({
            query: ({ dbId }) => ({
                url: MIRAX_ENDPOINTS.TECHNICAL_RUNS,
                method: 'get',
                headers: { 'X-Db': String(dbId) },
            }),
            providesTags: ['TechnicalRun'],
            keepUnusedDataFor: 300, // 5 минут
        }),

        /**
         * Получить список устройств для испытания
         */
        getPortableDevices: builder.query<
            PortableDeviceDto[],
        RequestWithDb<GetPortableDevicesParams>
    >({
        query: ({ body, dbId }) => ({
            url: MIRAX_ENDPOINTS.DEVICES(body.technicalRunId),
            method: 'get',
            headers: { 'X-Db': String(dbId) },
        }),
        providesTags: (_res, _err, { body }) => [
            { type: 'PortableDevice', id: body.technicalRunId },
        ],
        keepUnusedDataFor: 180, // 3 минуты
    }),

        /**
         * Получить список сенсоров для устройства
         */
        getSensors: builder.query<SensorDto[], RequestWithDb<GetSensorsParams>>({
        query: ({ body, dbId }) => ({
            url: MIRAX_ENDPOINTS.SENSORS(body.technicalRunId, body.factoryNumber),
            method: 'get',
            headers: { 'X-Db': String(dbId) },
        }),
        providesTags: (_res, _err, { body }) => [
            { type: 'Sensor', id: `${body.technicalRunId}-${body.factoryNumber}` },
        ],
        keepUnusedDataFor: 120, // 2 минуты
    }),
  })
});

export const {
    useGetTechnicalRunsQuery,
    useLazyGetTechnicalRunsQuery,
    useGetPortableDevicesQuery,
    useLazyGetPortableDevicesQuery,
    useGetSensorsQuery,
    useLazyGetSensorsQuery,
} = miraxApi;