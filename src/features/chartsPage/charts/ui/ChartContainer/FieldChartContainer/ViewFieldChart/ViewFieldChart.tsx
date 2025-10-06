// ViewFieldChart.tsx
//  Рендерится только при изменении points/stats из Redux

import { useSelector } from 'react-redux';
import { useCallback, useMemo, memo } from 'react';
import type { RootState } from '@/store/store';
import {
    selectChartRenderData,
    selectChartStats
} from '@chartsPage/charts/core/store/selectors/visualization.selectors';
import styles from './ViewFieldChart.module.css';
import {selectFieldOriginalRange} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";

import { ChartOverlay } from "@chartsPage/charts/ui/ChartOverlay/ChartOverlay.tsx";

import {selectTimeSettings} from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import {
    createOptions, getOverlayMessage,
    getOverlayType
} from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/createEChartsOptions.ts";
import {
    ChartCanvas
} from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/ChartCanvas/ChartCanvas.tsx";
import {
    StatsBadge
} from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/StatsBadge/StatsBadge.tsx";
import {
    ChartFooter
} from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/ChartFooter/ChartFooter.tsx";
import {ChartHeader} from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ChartHeader/ChartHeader.tsx";

interface ViewFieldChartProps {
    readonly fieldName: string;
    readonly onZoomEnd?: ((range: { from: number; to: number }) => void) | undefined;
    readonly onRetry?: (() => void) | undefined;
    readonly height: number;
}

// memo: не рендерим если props не изменились
export const ViewFieldChart = memo(function ViewFieldChart({
                                                               fieldName,
                                                               onZoomEnd,
                                                               onRetry,
                                                               height = 400
                                                           }: ViewFieldChartProps) {
    const chartData = useSelector((state: RootState) => selectChartRenderData(state, fieldName));
    const stats = useSelector((state: RootState) => selectChartStats(state, fieldName));

    const originalRange = useSelector((state: RootState) => selectFieldOriginalRange(state, fieldName));
    const timeSettings = useSelector((state: RootState) => selectTimeSettings(state));

    //Стабильный callback (не меняется между рендерами)
    const handleZoomEnd = useCallback((range: { from: number; to: number }) => {
        onZoomEnd?.(range);
    }, [onZoomEnd]);


    const options = useMemo(() =>
            createOptions(
                chartData.avgPoints,
                chartData.minPoints,
                chartData.maxPoints,
                fieldName,
                originalRange,
                timeSettings
            ),
        [chartData.avgPoints, chartData.minPoints, chartData.maxPoints, fieldName, originalRange, timeSettings]
    );

    const overlayType = getOverlayType(chartData, stats);

    return (
        <div className={styles.viewFieldChartContainer} style={{height: height}}>
            <ChartHeader fieldName={fieldName}/>
            <div className={styles.header}>
                <h3 className={styles.title}>{fieldName}</h3>
                <StatsBadge
                    totalPoints={chartData.avgPoints.length + chartData.minPoints.length  + chartData.maxPoints.length }
                    coverage={stats.coverage}
                    quality={chartData.quality}
                    isLoading={stats.isLoading}
                    fieldName={fieldName}
                />
            </div>

            <div className={styles.chartWrapper} >
                <ChartCanvas
                    options={options}
                    totalPoints={chartData.avgPoints.length + chartData.minPoints.length  + chartData.maxPoints.length}
                    onZoomEnd={handleZoomEnd}
                    loading={stats.isLoading}
                />

                {overlayType && (
                    <ChartOverlay
                        type={overlayType}
                        message={getOverlayMessage(overlayType, stats)}
                        onRetry={onRetry}
                    />
                )}
            </div>

            <ChartFooter fieldName={fieldName}/>
        </div>
    );
});


