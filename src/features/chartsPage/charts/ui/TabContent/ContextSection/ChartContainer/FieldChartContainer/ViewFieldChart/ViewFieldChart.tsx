// features/chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/ViewFieldChart.tsx
// ИСПРАВЛЕНИЕ: Правильная передача currentRange с учетом состояния синхронизации

import { useSelector } from 'react-redux';
import {useCallback, useMemo, memo, useState, useRef} from 'react';
import type { RootState } from '@/store/store';
import {
    type ChartStats,
    selectChartRenderData,
    selectChartStats,
    selectFieldGaps
} from '@chartsPage/charts/core/store/selectors/visualization.selectors';
import styles from './ViewFieldChart.module.css';
import { selectFieldOriginalRange } from '@chartsPage/charts/core/store/selectors/base.selectors.ts';
import { selectTimeSettings } from '@chartsPage/charts/core/store/chartsSettingsSlice.ts';
import {
    ChartCanvas,
    type ChartCanvasRef
} from '@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/ChartCanvas/ChartCanvas.tsx';
import { StatsBadge } from '@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/StatsBadge/StatsBadge.tsx';
import { ChartFooter } from '@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/ChartFooter/ChartFooter.tsx';
import { ChartHeader } from '@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ChartHeader/ChartHeader.tsx';
import LoadingIndicator from '@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/LoadingIndicator/LoadingIndicator.tsx';
import { ResizableContainer } from '@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/ResizableContainer/ResizableContainer.tsx';
import { createOptions } from '@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/ChartCanvas/createEChartsOptions.ts';
import { useYAxisRange } from '@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/ChartCanvas/YAxisControls/useYAxisRange.ts';
import { YAxisControls } from '@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/ChartCanvas/YAxisControls/YAxisControls.tsx';
import type { TimeRange } from '@chartsPage/charts/core/store/types/chart.types.ts';
import { SyncCheckbox } from '@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/SyncFields/SyncCheckbox/SyncCheckbox.tsx';
import type { Guid } from '@app/lib/types/Guid.ts';
import {
    ChartExportButton
} from "@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/СhartDataExport/ChartExportButton.tsx";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ENV } from '@/env';
import {
    ResetZoomButton
} from "@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/ResetZoomButton/ResetZoomButton.tsx";

const GROUP_ID = 'ChartContainer';
const CHART_DEFAULT_CHART_HEIGHT_PX = ENV.CHART_DEFAULT_CHART_HEIGHT_PX;

interface ViewFieldChartProps {
    readonly contextId: Guid;
    readonly fieldName: string;
    readonly onZoomEnd?: ((range: TimeRange) => void) | undefined;
    readonly onRetry?: (() => void) | undefined;
    readonly width: number;
    readonly currentRange?: TimeRange | undefined;
}

export const ViewFieldChart = memo(function ViewFieldChart({
                                                               contextId,
                                                               fieldName,
                                                               onZoomEnd,
                                                               width,
                                                               currentRange // ← Получаем от родителя (только если синхронизация включена)
                                                           }: ViewFieldChartProps) {


    const chartRef = useRef<ChartCanvasRef>(null);


    const chartData = useSelector((state: RootState) =>
        selectChartRenderData(state, contextId, fieldName)
    );
    const chartFieldStatus: ChartStats = useSelector((state: RootState) =>
        selectChartStats(state, contextId, fieldName)
    );
    const gapsInfo = useSelector((state: RootState) =>
        selectFieldGaps(state, contextId, fieldName)
    );
    const originalRange = useSelector((state: RootState) =>
        selectFieldOriginalRange(state, contextId, fieldName)
    );
    const timeSettings = useSelector((state: RootState) => selectTimeSettings(state));

    const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(false);
    const toggleHeaderVisibility = useCallback(() => {
        setIsHeaderVisible((prev) => !prev);
    }, []);

    const [containerHeight, setContainerHeight] = useState<number>(CHART_DEFAULT_CHART_HEIGHT_PX);

    const handleZoomEnd = useCallback(
        (range: TimeRange) => {
            // КРИТИЧНО: Всегда вызываем onZoomEnd, независимо от синхронизации
            // Родитель сам решит, нужно ли синхронизировать другие графики
            onZoomEnd?.(range);
        },
        [onZoomEnd]
    );

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

    const yAxisControl = useYAxisRange(optimalYRange.min, optimalYRange.max);

    const customYAxisRange = useMemo(
        () => (yAxisControl.isCustom ? yAxisControl.currentRange : undefined),
        [yAxisControl.isCustom, yAxisControl.currentRange.min, yAxisControl.currentRange.max]
    );

    const options = useMemo(
        () =>
            createOptions({
                avgPoints: chartData.avgPoints,
                minPoints: chartData.minPoints,
                maxPoints: chartData.maxPoints,
                fieldName,
                originalRange,
                timeSettings,
                gapsInfo,
                customYAxisRange
            }),
        [
            chartData.avgPoints,
            chartData.minPoints,
            chartData.maxPoints,
            fieldName,
            originalRange,
            timeSettings,
            gapsInfo,
            customYAxisRange
        ]
    );

    // КРИТИЧНО: Логируем состояние синхронизации для отладки
    // Можно убрать после проверки
    if (process.env.NODE_ENV === 'development') {
        console.log(`[ViewFieldChart] ${fieldName}:`, {
            hasSyncRange: !!currentRange,
            currentRange: currentRange ?
                { from: currentRange.fromMs, to: currentRange.toMs } :
                undefined
        });
    }

    return (
        <>
            {/* Обёртка для ChartHeader с анимацией */}
            <div className={`${styles.chartHeaderWrapper} ${isHeaderVisible ? styles.headerVisible : styles.headerHidden}`}>
                <ChartHeader fieldName={fieldName} width={width} contextId={contextId} />
            </div>

            <ResizableContainer
                key={fieldName}
                groupId={GROUP_ID}
                defaultHeight={containerHeight}
                minHeight={300}
                maxHeight={2000}
                onHeightChange={setContainerHeight}
            >
                <div className={styles.viewFieldChartContainer} style={{ height: containerHeight }}>
                    <div className={styles.header}>
                        {/* Кнопка toggle для ChartHeader */}
                        <button
                            type="button"
                            className={styles.toggleHeaderButton}
                            onClick={toggleHeaderVisibility}
                            aria-label={isHeaderVisible ? 'Скрыть заголовок' : 'Показать заголовок'}
                            title={isHeaderVisible ? 'Скрыть заголовок' : 'Показать заголовок'}
                        >
                            {isHeaderVisible ? (
                                <ChevronUp size={16} className={styles.toggleIcon} />
                            ) : (
                                <ChevronDown size={16} className={styles.toggleIcon} />
                            )}
                        </button>

                        <SyncCheckbox fieldName={fieldName} contextId={contextId} />

                        <h3 className={styles.title}>{fieldName}</h3>
                        <StatsBadge
                            contextId={contextId}
                            totalPoints={
                                chartData.avgPoints.length +
                                chartData.minPoints.length +
                                chartData.maxPoints.length
                            }
                            coverage={chartFieldStatus.coverage}
                            quality={chartData.quality}
                            isLoading={chartFieldStatus.isLoading}
                            fieldName={fieldName}
                        />

                        <ChartExportButton
                            avgPoints={chartData.avgPoints}
                            minPoints={chartData.minPoints}
                            maxPoints={chartData.maxPoints}
                            fieldName={fieldName}
                            contextId={contextId}
                            bucketMs={chartData.bucketMs}
                            dataQuality={chartData.quality}
                            className={styles.exportButton}
                        />

                        <YAxisControls control={yAxisControl} />

                        <div style={{ marginLeft: 'auto' }}>
                            <ResetZoomButton
                                onClick={() => chartRef.current?.resetZoom()}
                            />
                        </div>
                    </div>

                    <div className={styles.chartWrapper}>
                        <ChartCanvas
                            ref={chartRef}
                            options={options}
                            totalPoints={
                                chartData.avgPoints.length +
                                chartData.minPoints.length +
                                chartData.maxPoints.length
                            }
                            onZoomEnd={handleZoomEnd}
                            loading={chartFieldStatus.isLoading}
                            currentRange={currentRange}
                            originalRange={originalRange}
                            /*
                              КРИТИЧНО: currentRange передаётся напрямую
                              - undefined = синхронизация отключена → график сохраняет свой zoom
                              - TimeRange = синхронизация включена → график применяет этот диапазон
                            */
                        />
                    </div>

                    <div className={styles.indicationContainer}>
                        <LoadingIndicator
                            chartFieldStatus={chartFieldStatus}
                            position="aboveAxis"
                        />
                    </div>

                    <ChartFooter fieldName={fieldName} contextId={contextId} />
                </div>
            </ResizableContainer>
        </>
    );
});