// src/features/chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/ChartExportButton/ChartExportButton.tsx
import { useCallback, useState, useMemo } from 'react';
import classNames from 'classnames';
import type { EChartsPoint } from '@chartsPage/charts/core/store/selectors/visualization.selectors';

import styles from './ChartExportButton.module.css';
import {
    exportChartData,
    type ExportFormat, type ExportMetadata
} from "@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/СhartDataExport/chartDataExport.ts";

export interface ChartExportButtonProps {
    readonly avgPoints: readonly EChartsPoint[];
    readonly minPoints: readonly EChartsPoint[];
    readonly maxPoints: readonly EChartsPoint[];
    readonly fieldName: string;
    readonly contextId: string;
    readonly bucketMs?: number | undefined;
    readonly dataQuality?: string | undefined;
    readonly className?: string | undefined;
}

export function ChartExportButton({
                                      avgPoints,
                                      minPoints,
                                      maxPoints,
                                      fieldName,
                                      contextId,
                                      bucketMs,
                                      dataQuality,
                                      className,
                                  }: ChartExportButtonProps){
    const [isExporting, setIsExporting] = useState(false);

    const totalPoints = useMemo(
        () => avgPoints.length + minPoints.length + maxPoints.length,
        [avgPoints.length, minPoints.length, maxPoints.length],
    );

    const hasData = totalPoints > 0;

    const handleExport = useCallback(
        (format: ExportFormat) => {
            if (!hasData || isExporting) return;

            setIsExporting(true);

            try {
                const metadata: ExportMetadata = {
                    fieldName,
                    contextId,
                    exportDate: new Date().toISOString(),
                    totalPoints,
                    bucketMs,
                    dataQuality,
                };

                exportChartData(avgPoints, minPoints, maxPoints, metadata, format);
            } catch (error) {
                console.error('[ChartExportButton] Export failed:', error);
                alert('Не удалось экспортировать данные. Проверьте консоль.');
            } finally {
                setTimeout(() => setIsExporting(false), 500);
            }
        },
        [
            hasData,
            isExporting,
            avgPoints,
            minPoints,
            maxPoints,
            fieldName,
            contextId,
            totalPoints,
            bucketMs,
            dataQuality,
        ],
    );

    return (
        <div className={classNames(styles.container, className)}>
            {/* Триггер для hover */}
            <div className={styles.trigger}>
                <span className={styles.icon}>📊</span>
                <span className={styles.label}>Экспорт</span>
                <span className={styles.arrow}>▼</span>
            </div>

            {/* Меню с кнопками (показывается при hover) */}
            <div className={styles.menu}>
                <button
                    type="button"
                    onClick={() => handleExport('excel')}
                    disabled={isExporting || !hasData}
                    className={styles.menuButton}
                    title="Экспорт в Excel с разделением на листы (AVG, MIN, MAX)"
                >
                    <span className={styles.menuIcon}>📊</span>
                    <span className={styles.menuLabel}>Excel (.xlsx)</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleExport('csv')}
                    disabled={isExporting || !hasData}
                    className={styles.menuButton}
                    title="Экспорт в CSV (универсальный формат для анализа)"
                >
                    <span className={styles.menuIcon}>📄</span>
                    <span className={styles.menuLabel}>CSV (.csv)</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleExport('txt')}
                    disabled={isExporting || !hasData}
                    className={styles.menuButton}
                    title="Экспорт в текстовый файл (читаемый формат)"
                >
                    <span className={styles.menuIcon}>📝</span>
                    <span className={styles.menuLabel}>TXT (.txt)</span>
                </button>
            </div>
        </div>
    );
}