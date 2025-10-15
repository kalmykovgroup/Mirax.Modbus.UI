// core/types/loading.types.ts

import type {FieldDto} from "@chartsPage/metaData/shared/dtos/FieldDto.ts";
import type {MultiSeriesResponse} from "@chartsPage/charts/core/dtos/responses/MultiSeriesResponse.ts";
import type {GetMultiSeriesRequest} from "@chartsPage/charts/core/dtos/requests/GetMultiSeriesRequest.ts";

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


export interface DataLoadRequest {
    readonly request: GetMultiSeriesRequest;
    fields: FieldDto[]; // поля для загрузки (может быть > 1 при sync)
    readonly loadingType: LoadingType;
    readonly signal?: AbortSignal | undefined;
    readonly onProgress?: ((progress: number) => void) | undefined;
}

export interface DataLoadResult {
    readonly response: MultiSeriesResponse;
    readonly wasAborted: boolean;
}
