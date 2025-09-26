// charts/ui/CharContainer/FieldChart/ViewFieldChart.tsx

import React, { useRef, useEffect, useState, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import styles from './ViewFieldChart.module.css';
import classNames from 'classnames';
import type {EChartsOption} from "echarts";
import type {ChartStats} from "@charts/ui/CharContainer/types/ChartStats.ts";
import {ChartHeader} from "@charts/ui/CharContainer/ChartHeader/ChartHeader.tsx";
import type {TimeRange} from "@charts/store/chartsSlice.ts";

export interface ViewFieldChartProps {
    domain: TimeRange;
    fieldName: string;
    chartOption: EChartsOption;
    stats: ChartStats;
    loading: boolean;
    error?: string | undefined;
    info?: string | undefined;
    onChartReady: (chart: any) => void;
    onZoom: (params: any) => void;
    onZoomEnd?: (params: any) => void;  // Добавляем поддержку onZoomEnd
    onResize: (width: number, height: number) => void;
    onBrush?: ((params: any) => void) | undefined;
    onClick?: ((params: any) => void) | undefined;
    className?: string | undefined;
    height: number;
}

const ViewFieldChart: React.FC<ViewFieldChartProps> = ({
                                                           fieldName,
                                                           chartOption,
                                                           stats,
                                                           loading,
                                                           error,
                                                           info,
                                                           onChartReady,
                                                           onZoom,
                                                           onZoomEnd,
                                                           onResize,
                                                           onBrush,
                                                           onClick,
                                                           className,
                                                           height
                                                       }) => {
    const chartRef = useRef<ReactECharts | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Инициализация графика
    useEffect(() => {
        const instance = chartRef.current?.getEchartsInstance();
        if (instance) {
            onChartReady(instance);
        }
    }, [onChartReady]);

    // ResizeObserver
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                onResize(width, height);

                const instance = chartRef.current?.getEchartsInstance();
                if (instance && !instance.isDisposed()) {
                    instance.resize();
                }
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [onResize]);

    // Экспорт данных
    const handleExport = useCallback(() => {
        const instance = chartRef.current?.getEchartsInstance();
        if (!instance) return;

        const option = instance.getOption();
        const series = option.series as any[];
        const data = series?.[0]?.data || [];

        const csv = [
            ['Time', 'Value'],
            ...data.map((point: any) => [
                new Date(point[0]).toISOString(),
                point[1]
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fieldName}_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [fieldName]);

    // Качество данных - индикатор
    const getQualityIndicator = () => {
        if (!stats.quality) return null;

        const indicators = {
            good: { icon: '✓', color: '#52c41a', text: 'Хорошее' },
            medium: { icon: '!', color: '#faad14', text: 'Среднее' },
            poor: { icon: '✗', color: '#f5222d', text: 'Плохое' }
        };

        const indicator = indicators[stats.quality];
        return (
            <span
                className={styles.quality}
                style={{ color: indicator.color }}
            >
                {indicator.icon}
            </span>
        );
    };

    const events: Record<string, Function> = {
        datazoom: onZoom,
        dataZoom: onZoom,
    };

    // Добавляем обработчик окончания зума, если он передан
    if (onZoomEnd) {
        events.dataZoomEnd = onZoomEnd;
    }

    if (onBrush) {
        events.brush = onBrush;
    }

    if (onClick) {
        events.click = onClick;
    }

    return (
        <div
            ref={containerRef}
            className={classNames(
                styles.chartContainerWrapper,
                isExpanded && styles.expanded,
                className
            )}
        >
            <div className={styles.chartContainer}>
                <ChartHeader fieldName={fieldName} />

                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h3 className={styles.title}>
                            {fieldName}
                            {getQualityIndicator()}
                        </h3>
                        <span className={styles.bucket}>
                        Интервал: {stats.currentBucket}
                    </span>
                    </div>

                    <div className={styles.statsSection}>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Покрытие:</span>
                            <span className={styles.statValue}>{stats.coverage}%</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Плотность:</span>
                            <span className={styles.statValue}>{stats.density.toFixed(2)}</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Точек:</span>
                            <span className={styles.statValue}>
                            {stats.visiblePoints}/{stats.totalPoints}
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
                            title="Экспорт данных"
                        >
                            📥
                        </button>
                        <button
                            className={styles.actionBtn}
                            onClick={() => setIsExpanded(!isExpanded)}
                            title="Развернуть/Свернуть"
                        >
                            {isExpanded ? '↙' : '↗'}
                        </button>
                    </div>
                </div>

                <div className={styles.chartWrapper}
                     style={{height: !isExpanded ? height : undefined}}>
                    {loading && (
                        <div className={styles.loadingOverlay}>
                            <div className={styles.spinner} />
                            <span>Загрузка данных...</span>
                        </div>
                    )}

                    {error && !loading && (
                        <div className={styles.errorOverlay}>
                            <span className={styles.errorIcon}>⚠️</span>
                            <span className={styles.errorText}>{error}</span>
                        </div>
                    )}


                    {!error && !loading && info && (
                        <div className={styles.infoOverlay} >
                            <span>ℹ️ {info}</span>
                            <div style={{ fontSize: '12px', marginTop: '5px', color: '#999' }}>
                                Используйте колесо мыши для возврата к предыдущему масштабу
                            </div>
                        </div>
                    )}

                    <ReactECharts
                        ref={chartRef}
                        option={chartOption}
                        style={{ height: '100%', width: '100%' }}
                        opts={{
                            renderer: 'canvas'
                        }}
                        notMerge={false}
                        lazyUpdate={true}
                        onEvents={events}
                    />
                </div>

                {loading && <div className={styles.loadingBar} />}
            </div>
        </div>
    );
};

export default ViewFieldChart;