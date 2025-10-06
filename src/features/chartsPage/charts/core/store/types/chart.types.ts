
import type {LoadingState} from "@chartsPage/charts/core/store/types/loading.types.ts";
import type {SeriesBinDto} from "@chartsPage/charts/core/dtos/SeriesBinDto.ts";

export type FieldName = string;
export type BucketsMs = number;
export type TimeRange = { from: Date; to: Date };
export type CoverageInterval = { fromMs: number; toMs: number };
export type TimeRangeBounds = { from: Date | undefined; to: Date | undefined };

export interface SeriesTile {
    coverageInterval: CoverageInterval;
    bins: SeriesBinDto[];
    status: 'ready' | 'loading' | 'error' | 'empty';
    error?: string | undefined;
    requestId?: string | undefined;
    loadedAt?: number | undefined;
}

export interface FieldView {
    px?: number | undefined;
    originalRange?: TimeRange | undefined;
    currentRange?: TimeRange | undefined;
    topBucketsMs?: BucketsMs | undefined;
    currentBucketsMs?: BucketsMs | undefined;
    seriesLevel: Record<BucketsMs, SeriesTile[]>;
    loadingState: LoadingState;
    error?: string | undefined;
}


export type DataQuality = 'exact' | 'upsampled' | 'downsampled' | 'none';

export interface OptimalDataResult {
    readonly data: readonly SeriesBinDto[];
    readonly quality: DataQuality;
    readonly coverage: number; // 0-100
    readonly sourceBucketMs: BucketsMs | undefined;
    readonly isStale: boolean; // true если используем fallback
    readonly gaps: readonly Gap[];
}

export interface Gap {
    readonly from: number; // timestamp ms
    readonly to: number;   // timestamp ms
}

export interface CoverageResult {
    readonly coverage: number; // 0-100
    readonly gaps: readonly Gap[];
    readonly coveredRanges: readonly { from: number; to: number }[];
}