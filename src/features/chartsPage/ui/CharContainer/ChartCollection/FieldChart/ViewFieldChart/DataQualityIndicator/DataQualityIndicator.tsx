// src/charts/ui/CharContainer/ChartCollection/FieldChart/DataQualityIndicator/DataQualityIndicator.tsx

import React from 'react';
import classNames from 'classnames';
import styles from './DataQualityIndicator.module.css';
import type {DataQuality} from "@chartsPage/store/DataProxyService.ts";

export interface DataQualityIndicatorProps {
    quality?: DataQuality | undefined;
    isStale?: boolean | undefined;
    isLoading?: boolean | undefined;
    coverage?: number | undefined;
    sourceBucketMs?: number | undefined;
    targetBucketMs?: number | undefined;
    className?: string | undefined;
}

const DataQualityIndicator: React.FC<DataQualityIndicatorProps> = ({
                                                                       quality,
                                                                       isStale = false,
                                                                       isLoading = false,
                                                                       coverage,
                                                                       sourceBucketMs,
                                                                       targetBucketMs,
                                                                       className
                                                                   }) => {
    // Не показываем индикатор для точных данных или когда нет информации о качестве
    if (!quality || quality === 'exact') {
        return null;
    }

    const getQualityInfo = (): {
        text: string;
        icon: string;
        color: string;
        description: string;
    } | null => {
        switch (quality) {
            case 'upsampled':
                return {
                    text: 'Интерполированные данные',
                    icon: '📊',
                    color: '#ff9800',
                    description: sourceBucketMs
                        ? `Из уровня ${formatBucketSize(sourceBucketMs)}`
                        : 'Увеличенное разрешение'
                };
            case 'downsampled':
                return {
                    text: 'Агрегированные данные',
                    icon: '📉',
                    color: '#2196f3',
                    description: sourceBucketMs
                        ? `Из уровня ${formatBucketSize(sourceBucketMs)}`
                        : 'Уменьшенное разрешение'
                };
            case 'interpolated':
                return {
                    text: 'Приближенные данные',
                    icon: '≈',
                    color: '#9c27b0',
                    description: sourceBucketMs
                        ? `Адаптировано из ${formatBucketSize(sourceBucketMs)}`
                        : 'Близкий уровень детализации'
                };
            case 'none':
                return {
                    text: 'Нет данных',
                    icon: '⚠️',
                    color: '#f44336',
                    description: 'Ожидание загрузки'
                };
            case 'exact':
                // Этот case не должен достигаться из-за проверки выше
                return null;
            default:
                // TypeScript гарантирует, что все случаи обработаны
                const _exhaustive: never = quality;
                return null;
        }
    };

    const info = getQualityInfo();
    if (!info) return null;

    return (
        <div
            className={classNames(
                styles.indicator,
                {
                    [styles.stale]: isStale,
                    [styles.loading]: isLoading
                },
                className
            )}
            style={{ borderColor: info.color }}
            title={info.description}
        >
            <div className={styles.header}>
                <span className={styles.icon}>{info.icon}</span>
                <span className={styles.text}>{info.text}</span>
                {isLoading && (
                    <div className={styles.spinner} />
                )}
            </div>

            {(coverage !== undefined || isStale) && (
                <div className={styles.details}>
                    {coverage !== undefined && (
                        <span className={styles.coverage}>
                            Покрытие: {Math.round(coverage)}%
                        </span>
                    )}
                    {isStale && (
                        <span className={styles.staleLabel}>Устаревшие</span>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * Форматирует размер bucket в читаемый вид
 */
function formatBucketSize(ms: number): string {
    if (!ms || ms <= 0) return 'N/A';

    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
        return `${seconds}с`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes}м`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}ч`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
        return `${days}д`;
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
        return `${weeks}нед`;
    }

    const months = Math.floor(days / 30);
    return `${months}мес`;
}

export default DataQualityIndicator;