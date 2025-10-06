
// @ts-ignore
import type {BucketsMs, CoverageInterval, FieldName} from "@chartsPage/charts/core/store/types/chart.types.ts";

// @ts-ignore
export enum RequestPriority {
    High = 'high',
    Normal = 'normal',
    Low = 'low'
}
// @ts-ignore
export enum RequestReason {
    Initial = 'initial',
    Gap = 'gap',
    Zoom = 'zoom',
    Pan = 'pan',
    PrefetchLeft = 'prefetch-left',
    PrefetchRight = 'prefetch-right',
    Refresh = 'refresh'
}

export interface RequestConfig {
    readonly field: FieldName;
    readonly bucketMs: BucketsMs;
    readonly interval: CoverageInterval;
    readonly priority: RequestPriority;
    readonly reason: RequestReason;
    readonly px: number;
}

export interface ActiveRequest {
    readonly config: RequestConfig;
    readonly requestId: string;
    readonly abortController: AbortController;
    readonly startTime: number;
    readonly promise: Promise<void>;
}

export type RequestKey = string;

export interface LoadAnalysis {
    readonly shouldLoad: boolean;
    readonly gaps: readonly CoverageInterval[];
    readonly currentCoverage: number;
    readonly reason: RequestReason | null;
    readonly priority: RequestPriority;
}

export interface PrefetchStrategy {
    readonly enabled: boolean;
    readonly sizeMultiplier: number;
    readonly triggerThreshold: number;
    readonly maxConcurrent: number;
}

export interface RequestMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    cancelledRequests: number;
    averageLoadTime: number;
}