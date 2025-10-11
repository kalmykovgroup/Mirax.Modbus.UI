// ViewFieldChart.tsx
//  Рендерится только при изменении points/stats из Redux

import { useSelector } from 'react-redux';
import {useCallback, useMemo, memo, useState} from 'react';
import type { RootState } from '@/store/store';
import {
    type ChartStats,
    selectChartRenderData,
    selectChartStats, selectFieldGaps
} from '@chartsPage/charts/core/store/selectors/visualization.selectors';
import styles from './ViewFieldChart.module.css';
import {selectFieldOriginalRange} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";

import {selectTimeSettings} from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";

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
import LoadingIndicator
    from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/LoadingIndicator/LoadingIndicator.tsx";

import CollapsibleSection from "@chartsPage/components/Collapse/CollapsibleSection.tsx";
import {ResizableContainer} from "@chartsPage/charts/ui/ChartContainer/ResizableContainer/ResizableContainer.tsx";
import {
    createOptions
} from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/ChartCanvas/createEChartsOptions.ts";
import {
    useYAxisRange
} from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/ChartCanvas/YAxisControls/useYAxisRange.ts";
import {
    YAxisControls
} from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/ChartCanvas/YAxisControls/YAxisControls.tsx";
import type {TimeRange} from "@chartsPage/charts/core/store/types/chart.types.ts";
import {
    SyncCheckbox
} from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/SyncFields/SyncCheckbox/SyncCheckbox.tsx";
import type {Guid} from "@app/lib/types/Guid.ts";

const GROUP_ID = "ChartContainer";

interface ViewFieldChartProps {
    readonly contextId: Guid;
    readonly fieldName: string;
    readonly onZoomEnd?: ((range: TimeRange) => void) | undefined;
    readonly onRetry?: (() => void) | undefined;
    readonly width: number;
}

// memo: не рендерим если props не изменились
export const ViewFieldChart = memo(function ViewFieldChart({
                                                               contextId,
                                                               fieldName,
                                                               onZoomEnd,
                                                               width
                                                           }: ViewFieldChartProps) {



    const chartData = useSelector((state: RootState) => selectChartRenderData(state, contextId, fieldName));
    const chartFieldStatus: ChartStats = useSelector((state: RootState) => selectChartStats(state, contextId, fieldName));
    const gapsInfo = useSelector((state: RootState) => selectFieldGaps(state, contextId, fieldName));
    const originalRange = useSelector((state: RootState) => selectFieldOriginalRange(state, contextId, fieldName));
    const timeSettings = useSelector((state: RootState) => selectTimeSettings(state));
    const [containerHeight, setContainerHeight] = useState<number>(600);
    //Стабильный callback (не меняется между рендерами)
    const handleZoomEnd = useCallback((range: TimeRange) => {
        onZoomEnd?.(range);
    }, [onZoomEnd]);


    // Вычисляем оптимальный диапазон для yAxis
    const optimalYRange = useMemo(() => {
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;

        for (const point of chartData.avgPoints) {
            const value = point[1];
            if (Number.isFinite(value)) {
                if (value < min) min = value;
                if (value > max) max = value;
            }
        }

        if (min === max) {
            const base = min !== 0 ? Math.abs(min) * 0.1 : 1;
            min -= base;
            max += base;
        }

        const range = max - min;
        const padding = range * 0.05;

        return {
            min: min - padding,
            max: max + padding
        };
    }, [chartData.avgPoints]);

// ✅ Хук вызываем напрямую, НЕ в useMemo
    const yAxisControl = useYAxisRange(optimalYRange.min, optimalYRange.max);

// ✅ Мемоизируем только customYAxisRange для options
    const customYAxisRange = useMemo(
        () => yAxisControl.isCustom ? yAxisControl.currentRange : undefined,
        [yAxisControl.isCustom, yAxisControl.currentRange.min, yAxisControl.currentRange.max]
    );


    const options = useMemo(() =>
            createOptions({
                avgPoints: chartData.avgPoints,
                minPoints: chartData.minPoints,
                maxPoints: chartData.maxPoints,
                fieldName,
                originalRange,
                timeSettings,
                gapsInfo,
                customYAxisRange // ✅ Стабильная зависимость
            }),
        [
            chartData.avgPoints,
            chartData.minPoints,
            chartData.maxPoints,
            fieldName,
            originalRange,
            timeSettings,
            gapsInfo,
            customYAxisRange // ✅ Изменяется только при ручной настройке
        ]
    );

    return (
        <>
            <CollapsibleSection>
                <ChartHeader fieldName={fieldName} width={width} contextId={contextId}/>
            </CollapsibleSection>

            <ResizableContainer
                key={fieldName}
                groupId={GROUP_ID}
                defaultHeight={containerHeight}
                minHeight={300}
                maxHeight={2000}
                onHeightChange={setContainerHeight}
            >
                <div className={styles.viewFieldChartContainer} style={{height: containerHeight}}>

                    <div className={styles.header}>


                       <SyncCheckbox fieldName={fieldName} contextId={contextId} />


                        <h3 className={styles.title}>{fieldName}</h3>
                        <StatsBadge
                            contextId={contextId}
                            totalPoints={chartData.avgPoints.length + chartData.minPoints.length  + chartData.maxPoints.length }
                            coverage={chartFieldStatus.coverage}
                            quality={chartData.quality}
                            isLoading={chartFieldStatus.isLoading}
                            fieldName={fieldName}
                        />
                        <YAxisControls control={yAxisControl} />
                    </div>

                    <div className={styles.chartWrapper}>
                        <ChartCanvas
                            options={options}
                            totalPoints={chartData.avgPoints.length + chartData.minPoints.length  + chartData.maxPoints.length}
                            onZoomEnd={handleZoomEnd}
                        />

                    </div>
                    <div className={styles.indicationContainer}>
                        <LoadingIndicator chartFieldStatus={chartFieldStatus} position={"aboveAxis"} />
                    </div>


                    <ChartFooter fieldName={fieldName} contextId={contextId}/>
                </div>

            </ResizableContainer>
        </>

    );
});


