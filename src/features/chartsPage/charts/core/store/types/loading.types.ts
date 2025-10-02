// core/types/loading.types.ts

import type {BucketsMs} from "@chartsPage/charts/core/store/types/loading.types.ts";
import type {GetMultiSeriesRequest} from "@chartsPage/charts/shared/dtos/requests/GetMultiSeriesRequest.ts";
import type {FieldDto} from "@chartsPage/metaData/shared/dtos/FieldDto.ts";
import type {MultiSeriesResponse} from "@chartsPage/charts/shared/dtos/responses/MultiSeriesResponse.ts";

export interface LoadingState {
    active: boolean;
    type: LoadingType;
    progress: number;
    message?: string | undefined;
    startTime: number;
    estimatedEndTime?: number | undefined;
    bytesLoaded?: number | undefined;
    totalBytes?: number | undefined;
}

// @ts-ignore
export enum LoadingType {
    Initial = 'initial',
    Zoom = 'zoom',
    Pan = 'pan',
    Refresh = 'refresh'
}

export interface InitResult {
    readonly response: MultiSeriesResponse;
    readonly bucketLevels: readonly number[];
}

export interface SyncLoadRequest {
    readonly primaryField: FieldDto;
    bucketMs: BucketsMs;
    readonly from: Date;
    readonly to: Date;
    readonly px: number;
}

export interface SyncLoadResult {
    readonly loadedFields: readonly string[];
    readonly skippedFields: readonly string[];
}


export interface DataLoadRequest {
    readonly request: GetMultiSeriesRequest;
    readonly fields: readonly FieldDto[]; // поля для загрузки (может быть > 1 при sync)
    readonly loadingType: LoadingType;
    readonly signal?: AbortSignal | undefined;
    readonly onProgress?: ((progress: number) => void) | undefined;
}

export interface DataLoadResult {
    readonly response: MultiSeriesResponse;
    readonly wasAborted: boolean;
}
