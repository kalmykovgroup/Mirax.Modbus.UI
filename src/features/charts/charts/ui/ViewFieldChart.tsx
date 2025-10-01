// components/chart/ViewFieldChart/ViewFieldChart.tsx
// Презентационный компонент графика (без логики загрузки)

import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import {
    selectChartRenderData,
    selectChartStats
} from '@charts/charts/core/store/selectors/visualization.selectors';


import styles from './ViewFieldChart.module.css';
import {selectOptimalData} from "@charts/charts/core/store/selectors/dataProxy.selectors.ts";
import {useEChartsOptions} from "@charts/charts/ui/useEChartsOptions.ts";
import {ChartCanvas,  type ChartZoomEvent} from "@charts/charts/ui/ChartCanvas.tsx";
import {ChartStats} from "@charts/charts/ui/ChartStats.tsx";
import {ChartOverlay} from "@charts/charts/ui/ChartOverlay.tsx";

// ============================================
// ТИПЫ
// ============================================

interface ViewFieldChartProps {
    readonly fieldName: string;
    readonly onZoomEnd?: ((event: ChartZoomEvent) => void) | undefined;
    readonly onRetry?: (() => void) | undefined;
    readonly height?: string | undefined;
}

// ============================================
// КОМПОНЕНТ
// ============================================

export function ViewFieldChart({
                                   fieldName,
                                   onZoomEnd,
                                   onRetry,
                                   height = '400px'
                               }: ViewFieldChartProps) {
    // Данные для отрисовки (все параметры через callback)
    const chartData = useSelector((state: RootState) =>
        selectChartRenderData(state, fieldName)
    );

    // Статистика
    const stats = useSelector((state: RootState) =>
        selectChartStats(state, fieldName)
    );

    // Оптимальные данные (для проверки stale)
    const optimalData = useSelector((state: RootState) =>
        selectOptimalData(state, fieldName)
    );

    // Мемоизированные ECharts options
    const options = useEChartsOptions({
        points: chartData.points,
        fieldName,
        isEmpty: chartData.isEmpty
    });

    // Определяем состояние для overlay
    const overlayType = getOverlayType(chartData, stats, optimalData);

    return (
        <div className={styles.container}>
            {/* Заголовок и статистика */}
            <div className={styles.header}>
                <h3 className={styles.title}>{fieldName}</h3>
                <ChartStats
                    fieldName={fieldName}
                    stats={stats}
                    compact={true}
                />
            </div>

            {/* График */}
            <div className={styles.chartWrapper} style={{ height }}>
                <ChartCanvas
                    options={options}
                    onZoomEnd={onZoomEnd}
                    loading={stats.isLoading}
                    height={height}
                />

                {/* Overlay поверх графика */}
                {overlayType && (
                    <ChartOverlay
                        type={overlayType}
                        message={getOverlayMessage(overlayType, stats)}
                        onRetry={onRetry}
                    />
                )}
            </div>

            {/* Детальная статистика (под графиком) */}
            <div className={styles.footer}>
                <ChartStats
                    fieldName={fieldName}
                    stats={stats}
                    compact={false}
                />
            </div>
        </div>
    );
}

// ============================================
// УТИЛИТЫ
// ============================================

type ChartRenderData = ReturnType<typeof selectChartRenderData>;
type ChartStatsType = ReturnType<typeof selectChartStats>;
type OptimalDataResult = ReturnType<typeof selectOptimalData>;

function getOverlayType(
    chartData: ChartRenderData,
    stats: ChartStatsType,
    optimalData: OptimalDataResult
): 'loading' | 'error' | 'empty' | 'stale' | null {
    // Загрузка (только если данных нет совсем)
    if (stats.isLoading && chartData.isEmpty) {
        return 'loading';
    }

    // Пустое состояние
    if (chartData.isEmpty && !stats.isLoading) {
        return 'empty';
    }

    // Stale данные (используем fallback)
    if (optimalData.isStale && stats.isLoading) {
        return 'stale';
    }

    return null;
}

function getOverlayMessage(
    type: 'loading' | 'error' | 'empty' | 'stale',
    stats: ChartStatsType
): string {
    switch (type) {
        case 'loading':
            return stats.loadingProgress > 0
                ? `Загрузка: ${stats.loadingProgress}%`
                : 'Загрузка данных...';

        case 'stale':
            return 'Загрузка точных данных...';

        case 'empty':
            return 'Нет данных для отображения';

        default:
            return '';
    }
}