// store/selectors/orchestration.selectors.ts

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
import type { FieldName, BucketsMs, Gap } from '@charts/charts/core/types/chart.types';
import type { LoadingState } from '@charts/charts/core/types/loading.types';

import {
    selectFieldLoadingState,
    selectFieldSeriesLevels,
} from './base.selectors';

// ============================================
// ТИПЫ
// ============================================

export interface LoadingMetrics {
    readonly isLoading: boolean;
    readonly loadingType: LoadingState['type'];
    readonly progress: number;
    readonly activeRequestsCount: number;
    readonly estimatedEndTime?: number | undefined;
}

export interface DataLoadNeeds {
    readonly needsLoading: boolean;
    readonly reason: 'insufficient_coverage' | 'stale_data' | null;
    readonly missingGaps: readonly Gap[];
    readonly currentCoverage: number;
}

export interface PanMetrics {
    readonly oldFromMs: number;
    readonly oldToMs: number;
    readonly newFromMs: number;
    readonly newToMs: number;
    readonly leftGapMs: number;
    readonly rightGapMs: number;
    readonly direction: 'left' | 'right' | 'both' | 'none';
}

export interface ZoomMetrics {
    readonly rangeMs: number;
    readonly oldPx: number;
    readonly newPx: number;
    readonly currentBucketMs: BucketsMs;
    readonly pointsPerPixelOld: number;
    readonly pointsPerPixelNew: number;
}

export interface PrefetchMetrics {
    readonly canPrefetch: boolean;
    readonly leftRangeMs: { from: number; to: number };
    readonly rightRangeMs: { from: number; to: number };
    readonly prefetchSizeMs: number;
}

// ============================================
// LOADING METRICS
// ============================================

export const selectLoadingMetrics = createSelector(
    [
        (state: RootState, fieldName: FieldName) => selectFieldLoadingState(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectFieldSeriesLevels(state, fieldName)
    ],
    (loadingState, seriesLevels): LoadingMetrics => {
        let activeRequestsCount = 0;

        if (seriesLevels) {
            Object.values(seriesLevels).forEach(tiles => {
                activeRequestsCount += tiles.filter(t => t.status === 'loading').length;
            });
        }

        return {
            isLoading: loadingState.active,
            loadingType: loadingState.type,
            progress: loadingState.progress,
            activeRequestsCount,
            estimatedEndTime: loadingState.estimatedEndTime
        };
    }
);

