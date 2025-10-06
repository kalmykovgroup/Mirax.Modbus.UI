// LevelRow.tsx — ИСПРАВЛЕННАЯ ВЕРСИЯ
import React from "react";
import styles from "./LevelRow.module.css";
import type { LevelInfo } from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ChartHeader/ChartHeader.tsx";
import {
    TimelineCoverageBar
} from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ChartHeader/TimelineCoverageBar/TimelineCoverageBar.tsx";

// ============================================
// ТИПЫ
// ============================================

type RangeMs = {
    readonly from: number;
    readonly to: number;
};

type LevelRowProps = {
    readonly level: LevelInfo;
    readonly originalRange: RangeMs;
    readonly showDetails?: boolean | undefined;
};

// ============================================
// КОМПОНЕНТ
// ============================================

export const LevelRow: React.FC<LevelRowProps> = ({
                                                      level,
                                                      originalRange,
                                                      showDetails = true
                                                  }) => {
    // Проверяем наличие ошибок на этом уровне
    const hasErrors = level.errorCoverage.length > 0;
    const hasLoadingTiles = level.loadingCoverage.length > 0;

    // Определяем CSS-классы для строки
    const rowClassName = level.isCurrent
        ? `${styles.row} ${styles.rowCurrent}`
        : `${styles.row} ${styles.rowDefault}`;

    // Определяем CSS-классы для метки
    const labelClassName = level.isCurrent
        ? `${styles.label} ${styles.labelCurrent}`
        : `${styles.label} ${styles.labelDefault}`;

    // Определяем цвета для визуализации
    const coverageColor = level.isCurrent ? '#3b82f6' : '#10b981';
    const loadingColor = '#fbbf24';
    const backgroundColor = hasErrors
        ? '#fee2e2'
        : 'rgba(229, 231, 235, 0.55)';

    return (
        <div className={rowClassName}>
            {/*  Колонка 1: ВСЕГДА рендерится */}
            <div className={labelClassName}>
                {level.isCurrent && (
                    <span
                        className={styles.currentIndicator}
                        title="Текущий уровень"
                        aria-label="Текущий уровень"
                    />
                )}
                <span className={styles.labelText}>
                    {level.bucketLabel}
                </span>
            </div>

            {/*  Колонка 2: ВСЕГДА рендерится (или пустая) */}
            {showDetails ? (
                <div className={styles.statistics}>
                    <span className={styles.statsText}>
                        {level.coveredBins} / {level.totalBins}
                    </span>
                    <span className={styles.statsPercent}>
                        ({level.coveragePercent}%)
                    </span>
                    {hasLoadingTiles && (
                        <span className={styles.loadingBadge} title="Идёт загрузка">
                            ⏳
                        </span>
                    )}
                    {hasErrors && (
                        <span className={styles.errorBadge} title="Есть ошибки">
                            ⚠️
                        </span>
                    )}
                </div>
            ) : (
                <div className={styles.statistics} />

                )}

            {/*  Колонка 3: ВСЕГДА рендерится (или пустая) */}
            {showDetails && level.debugInfo ? (
                <div className={styles.debugInfo}>
                    <span className={styles.debugItem}>
                        T: {level.debugInfo.readyTiles}/{level.debugInfo.totalTiles}
                    </span>
                    <span className={styles.debugItem}>
                        P: {level.debugInfo.totalDataPoints.toLocaleString('ru-RU')}
                    </span>
                </div>
            ) : (
                <div className={styles.debugInfo} />

                )}

            {/*  Колонка 4: ВСЕГДА рендерится */}
            <div className={styles.coverageBarWrapper}>
                <TimelineCoverageBar
                    coverage={level.coverage}
                    loadingIntervals={level.loadingCoverage}
                    domainFrom={originalRange.from}
                    domainTo={originalRange.to}
                    coverageColor={coverageColor}
                    loadingColor={loadingColor}
                    backgroundColor={backgroundColor}
                />
            </div>
        </div>
    );
};