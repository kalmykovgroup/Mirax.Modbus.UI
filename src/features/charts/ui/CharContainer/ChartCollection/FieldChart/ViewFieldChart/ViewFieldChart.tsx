import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import type {ECharts, EChartsOption, SeriesOption} from 'echarts';
import styles from './ViewFieldChart.module.css';
import classNames from 'classnames';
import type { TimeRange } from "@charts/store/chartsSlice.ts";
import {type ChartStats, type LoadingState, LoadingType} from "@charts/ui/CharContainer/types.ts";
import LoadingIndicator from "@charts/ui/CharContainer/ChartCollection/FieldChart/ViewFieldChart/LoadingIndicator/LoadingIndicator.tsx";
import { ChartHeader } from "@charts/ui/CharContainer/ChartCollection/FieldChart/ViewFieldChart/ChartHeader/ChartHeader.tsx";
import DataQualityIndicator from "@charts/ui/CharContainer/ChartCollection/FieldChart/ViewFieldChart/DataQualityIndicator/DataQualityIndicator.tsx";
import type {DataQuality} from "@charts/store/DataProxyService.ts";
import ChartToggles
    from "@charts/ui/CharContainer/ChartCollection/FieldChart/ViewFieldChart/ChartToggles/ChartToggles.tsx";

export interface ViewFieldChartProps {
    originalRange: TimeRange;
    fieldName: string;
    chartOption: EChartsOption;
    stats: ChartStats;
    loadingState: LoadingState;
    error?: string | undefined;
    info?: string | undefined;

    dataQuality?: DataQuality | undefined;
    isStale?: boolean | undefined;
    dataCoverage?: number | undefined;
    sourceBucketMs?: number | undefined;
    targetBucketMs?: number | undefined;

    onChartReady: (chart: echarts.ECharts) => void;
    onZoom: (params: any) => void;
    onResize: (width: number, height: number) => void;
    onBrush?: ((params: any) => void) | undefined;
    onClick?: ((params: any) => void) | undefined;
    className?: string | undefined;

    showMin: boolean,
    showMax: boolean,
    showArea: boolean,
    setShowMin : (showMin: boolean) => void,
    setShowMax : (showMax: boolean) => void,
    setShowArea : (showArea: boolean) => void,

}

function isSeriesArray(x: SeriesOption | SeriesOption[] | undefined): x is SeriesOption[] {
    return Array.isArray(x);
}

const ViewFieldChart: React.FC<ViewFieldChartProps> = ({
                                                           fieldName,
                                                           chartOption,
                                                           stats,
                                                           loadingState,
                                                           error,
                                                           info,
                                                           dataQuality,
                                                           isStale,
                                                           dataCoverage,
                                                           sourceBucketMs,
                                                           targetBucketMs,
                                                           onChartReady,
                                                           onZoom,
                                                           onResize,
                                                           onBrush,
                                                           onClick,
                                                           className,
                                                           originalRange,
                                                           showMin,
                                                           showMax,
                                                           showArea,
                                                           setShowMin,
                                                           setShowMax,
                                                           setShowArea
                                                       }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<ECharts | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showSkeleton, setShowSkeleton] = useState(true);

    const isInitializedRef = useRef(false);
    const lastOptionHashRef = useRef<string>('');

    // Инициализация графика - только один раз
    useEffect(() => {
        if (!chartContainerRef.current || isInitializedRef.current) return;

        const initChart = () => {
            if (!chartContainerRef.current) return;

            // Проверяем и удаляем существующий экземпляр
            const existingChart = echarts.getInstanceByDom(chartContainerRef.current);
            if (existingChart && !existingChart.isDisposed()) {
                existingChart.dispose();
            }

            const chartInstance = echarts.init(chartContainerRef.current, undefined, {
                renderer: 'canvas',
                useDirtyRect: true
            });

            chartInstanceRef.current = chartInstance;
            isInitializedRef.current = true;

            // Устанавливаем начальные опции
            chartInstance.setOption(chartOption, true);

            // Подписываемся на события
            chartInstance.on('dataZoom', (params: any) => {
                onZoom(params);
            });

            chartInstance.on('click', (params: any) => {
                if (params.dataIndex !== undefined) {
                    onClick?.(params);
                }
            });

            if (onBrush) {
                chartInstance.on('brush', (params: any) => {
                    onBrush(params);
                });
            }

            // Уведомляем что график готов
            onChartReady(chartInstance);
        };

        requestAnimationFrame(initChart);

        return () => {
            if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
                chartInstanceRef.current.dispose();
            }
            chartInstanceRef.current = null;
            isInitializedRef.current = false;
        };
    }, []); // Только при монтировании

    // Обновление опций графика
    useEffect(() => {
        if (!chartInstanceRef.current || !isInitializedRef.current) return;
        if (chartInstanceRef.current.isDisposed()) return;

        // Создаем простой хеш для проверки изменений
        const optionHash = JSON.stringify({
            seriesLength: isSeriesArray(chartOption.series) ? chartOption.series.length : chartOption.series ? 1 : 0,
            firstSeriesLength: (chartOption.series as any)?.[0]?.data?.length || 0
        });

        if (optionHash === lastOptionHashRef.current) {
            return; // Данные не изменились
        }

        lastOptionHashRef.current = optionHash;

        requestAnimationFrame(() => {
            if (!chartInstanceRef.current || chartInstanceRef.current.isDisposed()) {
                return;
            }

            try {
                // Простое обновление без сложной логики
                chartInstanceRef.current.setOption(chartOption, {
                    notMerge: false,
                    lazyUpdate: true,
                    replaceMerge: ['series']
                });

                setShowSkeleton(false);
            } catch (error) {
                console.error('Ошибка обновления графика:', error);
            }
        });
    }, [chartOption]);

    // Управление скелетоном
    useEffect(() => {
        if (loadingState.active && loadingState.type === LoadingType.Initial) {
            setShowSkeleton(true);
        } else if (!loadingState.active) {
            setTimeout(() => setShowSkeleton(false), 300);
        }
    }, [loadingState]);

    // ResizeObserver
    useEffect(() => {
        if (!containerRef.current) return;

        let resizeTimeout: NodeJS.Timeout | null = null;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;

                onResize(width, height);

                if (resizeTimeout) {
                    clearTimeout(resizeTimeout);
                }

                resizeTimeout = setTimeout(() => {
                    if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
                        chartInstanceRef.current.resize();
                    }
                }, 200);
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            resizeObserver.disconnect();
        };
    }, [onResize]);

    // Экспорт в CSV
    const handleExport = useCallback(() => {
        if (!chartInstanceRef.current) return;

        const option = chartInstanceRef.current.getOption() as any;
        const series = option.series || [];
        const avgSeries = series.find((s: any) => s.name?.includes('avg')) || series[0];
        const data = avgSeries?.data || [];

        const csv = [
            ['Time', 'Value'],
            ...data.map((point: any) => {
                const time = Array.isArray(point) ? point[0] : point.value?.[0];
                const value = Array.isArray(point) ? point[1] : point.value?.[1];
                return [
                    new Date(time).toISOString(),
                    value?.toString() || 'null'
                ];
            })
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fieldName}_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [fieldName]);

    // Переключение развёрнутого состояния
    const toggleExpanded = useCallback(() => {
        setIsExpanded(prev => !prev);
        setTimeout(() => {
            if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
                chartInstanceRef.current.resize();
            }
        }, 300);
    }, []);

    // Форматирование диапазона дат
    const formatDateRange = () => {
        const formatDate = (date: Date) => {
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        };
        return `${formatDate(originalRange.from)} - ${formatDate(originalRange.to)}`;
    };

    return (
        <div
            ref={containerRef}
            className={classNames(
                styles.chartContainerWrapper,
                isExpanded && styles.expanded,
                error && styles.hasError,
                className
            )}
        >
            <ChartHeader fieldName={fieldName} />

            <ChartToggles
                showMin={showMin} setShowMin={setShowMin}
                showMax={showMax} setShowMax={setShowMax}
                showArea={showArea} setShowArea={setShowArea}
            />


            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h3 className={styles.title}>
                        {fieldName}
                        <DataQualityIndicator
                            quality={dataQuality}
                            isStale={isStale}
                            isLoading={loadingState.active}
                            coverage={dataCoverage}
                            sourceBucketMs={sourceBucketMs}
                            targetBucketMs={targetBucketMs}
                            className={styles.qualityIndicatorPosition}
                        />
                    </h3>
                    <span className={styles.bucket}>
                        {stats.currentBucket}
                    </span>
                    <span className={styles.dateRange}>
                        {formatDateRange()}
                    </span>
                </div>

                <div className={styles.statsSection}>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>Покрытие:</span>
                        <span className={styles.statValue}>{stats.coverage}%</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>Плотность:</span>
                        <span className={styles.statValue}>
                            {stats.density.toFixed(2)} точек/px
                        </span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statLabel}>Видимо:</span>
                        <span className={styles.statValue}>
                            {stats.visiblePoints} из {stats.totalPoints}
                        </span>
                    </div>
                    {stats.gaps !== undefined && stats.gaps > 0 && (
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Разрывов:</span>
                            <span className={styles.statValue}>{stats.gaps}</span>
                        </div>
                    )}
                </div>

                <div className={styles.actions}>
                    <button
                        className={styles.actionBtn}
                        onClick={handleExport}
                        title="Экспортировать данные в CSV"
                        disabled={stats.totalPoints === 0}
                    >
                        📥
                    </button>
                    <button
                        className={styles.actionBtn}
                        onClick={toggleExpanded}
                        title={isExpanded ? "Свернуть" : "Развернуть"}
                    >
                        {isExpanded ? '⬇' : '⬆'}
                    </button>
                </div>
            </div>

            <div className={styles.chartWrapper}>
                <div className={styles.indicationContainer}>
                    <LoadingIndicator state={loadingState} position="aboveAxis" />
                </div>

                {showSkeleton && !error && (
                    <div className={styles.skeleton}>
                        <div className={styles.skeletonChart} />
                    </div>
                )}

                {error && !loadingState.active && (
                    <div className={styles.errorOverlay}>
                        <span className={styles.errorIcon}>⚠️</span>
                        <span className={styles.errorText}>{error}</span>
                        <button
                            className={styles.retryBtn}
                            onClick={() => window.location.reload()}
                        >
                            Попробовать снова
                        </button>
                    </div>
                )}

                {!error && !loadingState.active && info && (
                    <div className={styles.infoOverlay}>
                        <span>ℹ️ {info}</span>
                    </div>
                )}

                <div
                    ref={chartContainerRef}
                    className={classNames(
                        styles.chartContent,
                        loadingState.active && styles.loading
                    )}
                    style={{
                        width: '100%',
                        height: '100%',
                        visibility: error ? 'hidden' : 'visible'
                    }}
                />
            </div>
        </div>
    );
};

export default ViewFieldChart;