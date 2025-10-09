// src/features/mirax/store/types/miraxThunk.types.ts
import type { TechnicalRunDto } from '@chartsPage/charts/mirax/contracts/TechnicalRunDto';
import type { PortableDeviceDto } from '@chartsPage/charts/mirax/contracts/PortableDeviceDto';
import type { SensorDto } from '@chartsPage/charts/mirax/contracts/SensorDto';
import type {Guid} from "@app/lib/types/Guid.ts";

/**
 * Базовый запрос с поддержкой отмены
 */
export interface MiraxBaseRequest {
    readonly databaseId: Guid;
    readonly signal?: AbortSignal | undefined;
    readonly onProgress?: ((progress: number) => void) | undefined;
}

/**
 * Запрос на загрузку испытаний
 */
export interface LoadTechnicalRunsRequest extends MiraxBaseRequest {}

/**
 * Запрос на загрузку устройств
 */
export interface LoadPortableDevicesRequest extends MiraxBaseRequest {
    readonly technicalRunId: string;
}

/**
 * Запрос на загрузку сенсоров
 */
export interface LoadSensorsRequest extends MiraxBaseRequest {
    readonly technicalRunId: string;
    readonly factoryNumber: string;
}

/**
 * Результат загрузки с флагом отмены
 */
export interface LoadResult<T> {
    readonly data: T;
    readonly wasAborted: boolean;
}

/**
 * Результат загрузки испытаний
 */
export type TechnicalRunsLoadResult = LoadResult<readonly TechnicalRunDto[]>;

/**
 * Результат загрузки устройств
 */
export type PortableDevicesLoadResult = LoadResult<readonly PortableDeviceDto[]>;

/**
 * Результат загрузки сенсоров
 */
export type SensorsLoadResult = LoadResult<readonly SensorDto[]>;

/**
 * Состояние загрузки для одного элемента
 */
export interface MiraxLoadingState {
    readonly isLoading: boolean;
    readonly progress: number;
    readonly error: string | undefined;
}

/**
 * Начальное состояние загрузки
 */
export const initialLoadingState: MiraxLoadingState = {
    isLoading: false,
    progress: 0,
    error: undefined,
};