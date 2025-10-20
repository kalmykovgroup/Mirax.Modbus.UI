// features/chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/ViewFieldChart.tsx

import { useSelector } from 'react-redux';
import { useCallback, useMemo, memo, useState, useRef, useEffect } from 'react';
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
import classNames from 'classnames';
import { useFullscreen } from './hooks/useFullscreen';
import {
    FullscreenButton
} from "@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/FullscreenButton/FullscreenButton.tsx";
import {
    ChartNavigator
} from "@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ChartNavigator/ChartNavigator.tsx";

const GROUP_ID = 'ChartContainer';
const CHART_DEFAULT_CHART_HEIGHT_PX = ENV.CHART_DEFAULT_CHART_HEIGHT_PX;

interface NavigationInfo {
    readonly currentIndex: number;
    readonly totalFields: number;
    readonly onPrevious: () => void;
    readonly onNext: () => void;
}

interface ViewFieldChartProps {
    readonly contextId: Guid;
    readonly fieldName: string;
    readonly onZoomEnd?: ((range: TimeRange) => void) | undefined;
    readonly onRetry?: (() => void) | undefined;
    readonly width: number;
    readonly currentRange?: TimeRange | undefined;
    readonly navigationInfo?: NavigationInfo | undefined;
}

export const ViewFieldChart = memo(function ViewFieldChart({
                                                               contextId,
                                                               fieldName,
                                                               onZoomEnd,
                                                               width,
                                                               currentRange,
                                                               navigationInfo
                                                           }: ViewFieldChartProps) {
    const chartRef = useRef<ChartCanvasRef>(null);
    const fullscreenContainerRef = useRef<HTMLDivElement>(null);

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

    // Fullscreen
    const {
        isFullscreen,
        toggleFullscreen,
        isSupported: isFullscreenSupported
    } = useFullscreen(fullscreenContainerRef);

    // КРИТИЧНО: Управление overflow на body для предотвращения скролла
    useEffect(() => {
        if (isFullscreen) {
            // Сохраняем текущие стили
            const originalOverflow = document.body.style.overflow;
            const originalPosition = document.body.style.position;

            // Блокируем скролл
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.top = '0';
            document.body.style.left = '0';

            return () => {
                // Восстанавливаем стили
                document.body.style.overflow = originalOverflow;
                document.body.style.position = originalPosition;
                document.body.style.width = '';
                document.body.style.top = '';
                document.body.style.left = '';

                // КРИТИЧНО: Форсируем пересчёт layout после выхода
                requestAnimationFrame(() => {
                    window.dispatchEvent(new Event('resize'));
                });
            };
        }
    }, [isFullscreen]);

    // Keyboard navigation - работает ТОЛЬКО в fullscreen
    useEffect(() => {
        if (!isFullscreen || !navigationInfo) {
            return;
        }

        const handleKeyDown = (e: KeyboardEvent): void => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                navigationInfo.onPrevious();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                navigationInfo.onNext();
            } else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                void toggleFullscreen();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isFullscreen, navigationInfo, toggleFullscreen]);

    const handleZoomEnd = useCallback(
        (range: TimeRange) => {
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

    if (process.env.NODE_ENV === 'development') {
        console.log(`[ViewFieldChart] ${fieldName}:`, {
            hasSyncRange: !!currentRange,
            currentRange: currentRange ?
                { from: currentRange.fromMs, to: currentRange.toMs } :
                undefined
        });
    }

    return (
        <div
            ref={fullscreenContainerRef}
            className={classNames(styles.fullscreenWrapper, (isFullscreen ? styles.fullscreenActive : ''))}
        >
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
                <div
                    className={styles.viewFieldChartContainer}
                    style={{ height: isFullscreen ? '100vh' : containerHeight }}
                >
                    <div className={styles.header}>
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

                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <ResetZoomButton
                                onClick={() => chartRef.current?.resetZoom()}
                            />

                            {isFullscreenSupported && (
                                <FullscreenButton
                                    isFullscreen={isFullscreen}
                                    onToggle={() => void toggleFullscreen()}
                                />
                            )}
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

            {/* Навигатор - ТОЛЬКО в fullscreen */}
            {isFullscreen && navigationInfo && (
                <ChartNavigator
                    currentFieldName={fieldName}
                    totalFields={navigationInfo.totalFields}
                    currentIndex={navigationInfo.currentIndex}
                    onPrevious={navigationInfo.onPrevious}
                    onNext={navigationInfo.onNext}
                />
            )}
        </div>
    );
});