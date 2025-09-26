// EChartsChartView.tsx - Чистый компонент визуализации графика
import React, { useEffect, useRef, memo } from 'react';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';
import type { ChartDataPoint } from './chartDataUtils';
import styles from './EChartsChartView.module.css';

export interface ChartViewProps {
    fieldName: string;
    data: ChartDataPoint[];
    height?: number;
    bucketMs: number;
    visiblePointsCount: number;
    totalPointsCount: number;
    density: number;
    dataQuality: 'LOW' | 'MEDIUM' | 'HIGH';
    loading?: boolean;
    onWindowChange?: (fromMs: number, toMs: number) => void;
}

// Мемоизированный компонент для избежания лишних перерисовок
const EChartsChartView: React.FC<ChartViewProps> = memo(({
                                                             fieldName,
                                                             data,
                                                             height = 350,
                                                             bucketMs,
                                                             visiblePointsCount,
                                                             totalPointsCount,
                                                             density,
                                                             dataQuality,
                                                             loading = false,
                                                             onWindowChange,
                                                         }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ECharts | null>(null);
    const isUpdatingRef = useRef(false);

    // Инициализация графика
    useEffect(() => {
        if (!containerRef.current) return;

        const chart = echarts.init(containerRef.current, undefined, {
            renderer: 'canvas',
            useDirtyRect: true,
        });

        chartRef.current = chart;

        // Обработчик изменения окна
        const handleDataZoom = () => {
            if (isUpdatingRef.current) return;

            const option = chart.getOption() as any;
            const dataZoom = option?.dataZoom?.[0];

            if (dataZoom && onWindowChange) {
                const { startValue, endValue } = dataZoom;
                if (Number.isFinite(startValue) && Number.isFinite(endValue)) {
                    onWindowChange(startValue, endValue);
                }
            }
        };

        // Подписка на события
        chart.on('dataZoom', handleDataZoom);
        chart.on('datazoom', handleDataZoom);

        // Обработка изменения размера
        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            chart.off('dataZoom', handleDataZoom);
            chart.off('datazoom', handleDataZoom);
            resizeObserver.disconnect();
            chart.dispose();
            chartRef.current = null;
        };
    }, [onWindowChange]);

    // Обновление данных графика
    useEffect(() => {
        if (!chartRef.current) return;

        isUpdatingRef.current = true;

        const chartData = data.map(point => ({
            value: [point.timestamp, point.value],
            itemStyle: getPointStyle(dataQuality),
        }));

        const option: EChartsOption = {
            animation: false,
            grid: {
                top: 50,
                right: 60,
                bottom: 90,
                left: 80,
                containLabel: true,
            },
            xAxis: {
                type: 'time',
                boundaryGap: false,
                axisLabel: {
                    formatter: (value: number) => {
                        const date = new Date(value);
                        const hours = date.getHours().toString().padStart(2, '0');
                        const minutes = date.getMinutes().toString().padStart(2, '0');
                        return `${hours}:${minutes}`;
                    },
                    rotate: 0,
                    hideOverlap: true,
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        color: '#f0f0f0',
                        type: 'dashed',
                    },
                },
            },
            yAxis: {
                type: 'value',
                name: fieldName,
                nameLocation: 'middle',
                nameGap: 60,
                nameTextStyle: {
                    fontSize: 14,
                    fontWeight: 'bold',
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        color: '#f0f0f0',
                    },
                },
                axisLabel: {
                    formatter: (value: number) => value.toFixed(1),
                },
            },
            dataZoom: [
                {
                    type: 'slider',
                    show: true,
                    realtime: true,
                    start: 0,
                    end: 100,
                    height: 25,
                    bottom: 10,
                    throttle: 50, // Уменьшаем throttle для более частых обновлений
                    showDataShadow: true,
                    showDetail: true,
                    brushSelect: false,
                    labelFormatter: (value: number) => {
                        const date = new Date(value);
                        return `${date.getDate()}.${(date.getMonth() + 1).toString().padStart(2, '0')} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                    },
                },
                {
                    type: 'inside',
                    realtime: true,
                    zoomOnMouseWheel: true,
                    moveOnMouseMove: true,
                    moveOnMouseWheel: false,
                    preventDefaultMouseWheel: true,
                    throttle: 50,
                },
            ],
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    animation: false,
                    label: {
                        backgroundColor: '#505765',
                    },
                },
                formatter: (params: any) => {
                    if (!Array.isArray(params) || params.length === 0) return '';
                    const p = params[0];
                    const date = new Date(p.value[0]);
                    const point = data.find(d => d.timestamp === p.value[0]);

                    return `
                        <div style="padding: 8px;">
                            <div style="font-weight: bold; margin-bottom: 4px;">
                                ${date.toLocaleString('ru-RU')}
                            </div>
                            <div style="color: ${p.color};">
                                ${p.seriesName}: <strong>${p.value[1]?.toFixed(2)}</strong>
                            </div>
                            ${point?.binData ? `
                                <div style="font-size: 11px; color: #999; margin-top: 4px;">
                                    <div>Мин: ${point.binData.min?.toFixed(2) ?? '-'}</div>
                                    <div>Макс: ${point.binData.max?.toFixed(2) ?? '-'}</div>
                                    <div>Кол-во: ${point.binData.count}</div>
                                    <div>Бакет: ${Math.round(bucketMs / 1000)}с</div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                },
            },
            series: [
                {
                    name: fieldName,
                    type: 'line',
                    symbol: getSymbolType(data.length),
                    symbolSize: getSymbolSize(data.length),
                    sampling: 'lttb',
                    large: data.length > 5000,
                    largeThreshold: 5000,
                    lineStyle: {
                        width: getLineWidth(dataQuality),
                        color: getLineColor(dataQuality),
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: getAreaColor(dataQuality, 0.2) },
                                { offset: 1, color: getAreaColor(dataQuality, 0.02) },
                            ],
                        },
                    },
                    emphasis: {
                        focus: 'series',
                        blurScope: 'coordinateSystem',
                    },
                    data: chartData,
                },
            ],
            // Добавляем визуальную индикацию загрузки
            graphic: loading ? [
                {
                    type: 'text',
                    right: 20,
                    top: 20,
                    style: {
                        text: 'Загрузка данных...',
                        fontSize: 12,
                        fill: '#999',
                    },
                },
            ] : [],
        };

        chartRef.current.setOption(option, true);

        setTimeout(() => {
            isUpdatingRef.current = false;
        }, 100);
    }, [data, fieldName, bucketMs, dataQuality, loading]);

    return (
        <div className={styles.container}>
            {/* Статус-бар с информацией */}
            <div className={styles.statusBar}>
                <div className={styles.fieldName}>{fieldName}</div>
                <div className={styles.stats}>
                    <StatBadge
                        label="Видимых точек"
                        value={visiblePointsCount}
                        color={getQualityColor(dataQuality)}
                    />
                    <StatBadge
                        label="Всего точек"
                        value={totalPointsCount}
                    />
                    <StatBadge
                        label="Плотность"
                        value={`${density.toFixed(2)} т/мин`}
                        color={density < 0.5 ? '#ff6b6b' : '#51cf66'}
                    />
                    <StatBadge
                        label="Бакет"
                        value={formatBucket(bucketMs)}
                    />
                    <QualityIndicator quality={dataQuality} />
                </div>
            </div>

            {/* График */}
            <div
                ref={containerRef}
                className={styles.chart}
                style={{ height: `${height}px` }}
            />

            {/* Индикатор загрузки */}
            {loading && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.loadingSpinner} />
                </div>
            )}
        </div>
    );
});

// Вспомогательный компонент для отображения статистики
const StatBadge: React.FC<{ label: string; value: string | number; color?: string }> = ({
                                                                                            label,
                                                                                            value,
                                                                                            color
                                                                                        }) => (
    <div className={styles.statBadge}>
        <span className={styles.statLabel}>{label}:</span>
        <span className={styles.statValue} style={{ color }}>
            {value}
        </span>
    </div>
);

// Индикатор качества данных
const QualityIndicator: React.FC<{ quality: 'LOW' | 'MEDIUM' | 'HIGH' }> = ({ quality }) => {
    const labels = {
        LOW: 'Низкое',
        MEDIUM: 'Среднее',
        HIGH: 'Высокое',
    };

    return (
        <div className={`${styles.qualityIndicator} ${styles[`quality${quality}`]}`}>
            <span className={styles.qualityDot} />
            <span>{labels[quality]}</span>
        </div>
    );
};

// Вспомогательные функции стилизации
function getSymbolType(pointsCount: number): string {
    if (pointsCount > 1000) return 'none';
    if (pointsCount > 500) return 'circle';
    return 'circle';
}

function getSymbolSize(pointsCount: number): number {
    if (pointsCount > 1000) return 0;
    if (pointsCount > 500) return 2;
    if (pointsCount > 100) return 3;
    return 4;
}

function getLineWidth(quality: 'LOW' | 'MEDIUM' | 'HIGH'): number {
    switch (quality) {
        case 'HIGH': return 2;
        case 'MEDIUM': return 1.5;
        case 'LOW': return 1;
        default: return 1.5;
    }
}

function getLineColor(quality: 'LOW' | 'MEDIUM' | 'HIGH'): string {
    switch (quality) {
        case 'HIGH': return '#5470c6';
        case 'MEDIUM': return '#91cc75';
        case 'LOW': return '#fac858';
        default: return '#5470c6';
    }
}

function getAreaColor(quality: 'LOW' | 'MEDIUM' | 'HIGH', opacity: number): string {
    const color = getLineColor(quality);
    // Преобразуем HEX в RGBA
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function getPointStyle(quality: 'LOW' | 'MEDIUM' | 'HIGH'): any {
    return {
        color: getLineColor(quality),
        borderColor: '#fff',
        borderWidth: 1,
    };
}

function getQualityColor(quality: 'LOW' | 'MEDIUM' | 'HIGH'): string {
    switch (quality) {
        case 'HIGH': return '#51cf66';
        case 'MEDIUM': return '#ffd43b';
        case 'LOW': return '#ff6b6b';
        default: return '#868e96';
    }
}

function formatBucket(ms: number): string {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}с`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}м`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}ч`;
    const d = Math.round(h / 24);
    return `${d}д`;
}

EChartsChartView.displayName = 'EChartsChartView';

export default EChartsChartView;