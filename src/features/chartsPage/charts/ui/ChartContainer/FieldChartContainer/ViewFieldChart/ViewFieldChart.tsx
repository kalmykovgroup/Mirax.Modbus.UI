// ViewFieldChart.tsx
// ✅ Рендерится только при изменении points/stats из Redux

import { useSelector } from 'react-redux';
import { useCallback, useMemo, memo } from 'react';
import type { RootState } from '@/store/store';
import {
    selectChartRenderData,
    selectChartStats
} from '@chartsPage/charts/core/store/selectors/visualization.selectors';
import styles from './ViewFieldChart.module.css';
import { selectOptimalData } from "@chartsPage/charts/core/store/selectors/dataProxy.selectors.ts";
import {selectFieldCurrentRange, selectFieldOriginalRange} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";

import { ChartOverlay } from "@chartsPage/charts/ui/ChartOverlay/ChartOverlay.tsx";

import {selectTimeSettings} from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import {
    createOptions, getOverlayMessage,
    getOverlayType
} from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/createEChartsOptions.ts";
import {
    ChartCanvas
} from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/ChartCanvas/ChartCanvas.tsx";
import {formatDateWithTimezone} from "@chartsPage/charts/ui/TimeZonePicker/timezoneUtils.ts";

interface ViewFieldChartProps {
    readonly fieldName: string;
    readonly onZoomEnd?: ((range: { from: number; to: number }) => void) | undefined;
    readonly onRetry?: (() => void) | undefined;
    readonly height?: string | undefined;
}

// ✅ memo: не рендерим если props не изменились
export const ViewFieldChart = memo(function ViewFieldChart({
                                                               fieldName,
                                                               onZoomEnd,
                                                               onRetry,
                                                               height = '400px'
                                                           }: ViewFieldChartProps) {
    const chartData = useSelector((state: RootState) => selectChartRenderData(state, fieldName));
    const stats = useSelector((state: RootState) => selectChartStats(state, fieldName));
    const optimalData = useSelector((state: RootState) => selectOptimalData(state, fieldName));

    const originalRange = useSelector((state: RootState) => selectFieldOriginalRange(state, fieldName));
    const timeSettings = useSelector((state: RootState) => selectTimeSettings(state));

    // ✅ Стабильный callback (не меняется между рендерами)
    const handleZoomEnd = useCallback((range: { from: number; to: number }) => {
        onZoomEnd?.(range);
    }, [onZoomEnd]);

    // ✅ Мемоизированные options (пересоздаются только при изменении points)
    const options = useMemo(() =>
            createOptions(chartData.points, fieldName, originalRange, timeSettings),
        [chartData.points, fieldName, originalRange, timeSettings]
    );

    const overlayType = getOverlayType(chartData, stats, optimalData);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>{fieldName}</h3>
                <StatsBadge
                    totalPoints={chartData.points.length}
                    coverage={stats.coverage}
                    quality={chartData.quality}
                    isLoading={stats.isLoading}
                    fieldName={fieldName}
                />
            </div>

            <div className={styles.chartWrapper} style={{ height }}>
                <ChartCanvas
                    options={options}
                    totalPoints={chartData.points.length}
                    onZoomEnd={handleZoomEnd}
                    loading={stats.isLoading}
                    height={height}
                />

                {overlayType && (
                    <ChartOverlay
                        type={overlayType}
                        message={getOverlayMessage(overlayType, stats)}
                        onRetry={onRetry}
                    />
                )}
            </div>
        </div>
    );
});


// ============================================
// МЕМОИЗИРОВАННЫЙ BADGE
// ============================================

interface StatsBadgeProps {
    readonly totalPoints: number;
    readonly coverage: number;
    readonly quality: string;
    readonly isLoading: boolean;
    readonly fieldName: string;
}

const StatsBadge = memo(function StatsBadge({
                                                totalPoints,
                                                coverage,
                                                quality,
                                                isLoading,
                                                fieldName
                                            }: StatsBadgeProps) {
    const currentRange = useSelector((state: RootState) => selectFieldCurrentRange(state, fieldName))
    const timeSettings = useSelector((state: RootState) => selectTimeSettings(state));
    const coverageColor = coverage >= 95 ? 'green' : coverage >= 80 ? 'orange' : 'red';

    return (
        <div className={styles.statsBadge}>
            <span>{timeSettings.timeZone}</span>
            <span>from: {formatDateWithTimezone(
                currentRange?.from,
                timeSettings,
                {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }
                )}</span>
            <span>to: {formatDateWithTimezone(
                currentRange?.to,
                timeSettings,
                {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }
            )}</span>
            <span className={styles.stat}>
                <span className={styles.statLabel}>Точек:</span>
                <strong>{totalPoints}</strong>
            </span>
            <span className={styles.stat}>
                <span className={styles.statLabel}>Покрытие:</span>
                <strong style={{ color: coverageColor }}>
                    {coverage.toFixed(0)}%
                </strong>
            </span>
            <span className={styles.stat}>
                <span className={styles.statLabel}>Качество:</span>
                <span>{quality}</span>
            </span>
            {isLoading && <span className={styles.loading}>⏳</span>}
        </div>
    );
});
