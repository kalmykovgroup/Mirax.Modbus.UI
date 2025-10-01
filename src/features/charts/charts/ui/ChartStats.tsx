
// components/chart/ChartStats/ChartStats.tsx
// Панель статистики графика

import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import type { ChartStats } from "@/features/charts/charts/core/store/selectors/visualization.selectors.ts";
 
import styles from './ChartStats.module.css';
import {selectFieldCurrentBucketMs} from "@charts/charts/core/store/selectors/base.selectors.ts";

// ============================================
// ТИПЫ
// ============================================

interface ChartStatsProps {
    readonly fieldName: string;
    readonly stats: ChartStats;
    readonly compact?: boolean | undefined;
}

// ============================================
// КОМПОНЕНТ
// ============================================

export function ChartStats({ fieldName, stats, compact = false }: ChartStatsProps) {
    // Получаем currentBucketMs напрямую из slice
    const currentBucketMs = useSelector((state: RootState) =>
        selectFieldCurrentBucketMs(state, fieldName)
    );

    if (compact) {
        return <CompactStats stats={stats} currentBucketMs={currentBucketMs} />;
    }

    return (
        <div className={styles.stats}>
            <StatItem
                label="Точек"
                value={`${stats.visiblePoints} / ${stats.totalPoints}`}
                hint="видимых / всего"
            />

            <StatItem
                label="Покрытие"
                value={`${stats.coverage.toFixed(1)}%`}
                status={getStatusByValue(stats.coverage, 95, 80)}
            />

            {stats.gapsCount > 0 && (
                <StatItem
                    label="Пробелы"
                    value={stats.gapsCount.toString()}
                    status="warning"
                />
            )}

            <StatItem
                label="Качество"
                value={getQualityLabel(stats.quality)}
                status={getQualityStatus(stats.quality)}
            />

            {currentBucketMs !== undefined && (
                <StatItem
                    label="Bucket"
                    value={formatBucketMs(currentBucketMs)}
                />
            )}

            <StatItem
                label="Плотность"
                value={`${stats.density.toFixed(2)} pt/px`}
                hint="точек на пиксель"
            />

            {stats.isLoading && (
                <StatItem
                    label="Загрузка"
                    value={`${stats.loadingProgress}%`}
                    status="warning"
                />
            )}
        </div>
    );
}

// ============================================
// КОМПАКТНАЯ ВЕРСИЯ
// ============================================

interface CompactStatsProps {
    readonly stats: ChartStats;
    readonly currentBucketMs: number | undefined;
}

function CompactStats({ stats, currentBucketMs }: CompactStatsProps) {
    return (
        <div className={styles.statsCompact}>
            <span className={styles.compactItem}>
                {stats.visiblePoints}pt
            </span>
            <span
                className={styles.compactItem}
                data-status={getStatusByValue(stats.coverage, 95, 80)}
            >
                {stats.coverage.toFixed(0)}%
            </span>
            <span className={styles.compactItem}>
                {getQualityLabel(stats.quality)}
            </span>
            {currentBucketMs !== undefined && (
                <span className={styles.compactItem}>
                    {formatBucketMs(currentBucketMs)}
                </span>
            )}
        </div>
    );
}

// ============================================
// STAT ITEM
// ============================================

interface StatItemProps {
    readonly label: string;
    readonly value: string;
    readonly hint?: string | undefined;
    readonly status?: 'good' | 'warning' | 'error' | undefined;
}

function StatItem({ label, value, hint, status }: StatItemProps) {
    return (
        <div className={styles.statItem}>
            <span className={styles.label}>{label}:</span>
            <span
                className={styles.value}
                data-status={status}
                title={hint}
            >
                {value}
            </span>
        </div>
    );
}

// ============================================
// УТИЛИТЫ
// ============================================

function getStatusByValue(
    value: number,
    goodThreshold: number,
    warningThreshold: number
): 'good' | 'warning' | 'error' {
    if (value >= goodThreshold) return 'good';
    if (value >= warningThreshold) return 'warning';
    return 'error';
}

function getQualityLabel(quality: ChartStats['quality']): string {
    switch (quality) {
        case 'exact': return 'Exact';
        case 'upsampled': return 'Upsampled';
        case 'downsampled': return 'Downsampled';
        case 'none': return 'No shared';
        default: return 'Unknown';
    }
}

function getQualityStatus(
    quality: ChartStats['quality']
): 'good' | 'warning' | 'error' {
    switch (quality) {
        case 'exact': return 'good';
        case 'upsampled':
        case 'downsampled': return 'warning';
        case 'none': return 'error';
        default: return 'error';
    }
}

function formatBucketMs(ms: number): string {
    const seconds = ms / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;
    const days = hours / 24;

    if (days >= 1) return `${days.toFixed(0)}d`;
    if (hours >= 1) return `${hours.toFixed(0)}h`;
    if (minutes >= 1) return `${minutes.toFixed(0)}m`;
    return `${seconds.toFixed(0)}s`;
}