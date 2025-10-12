// LevelRow.tsx — ИСПРАВЛЕННАЯ ВЕРСИЯ
import React from "react";
import styles from "./LevelRow.module.css";
import type { LevelInfo } from "@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ChartHeader/ChartHeader.tsx";
import {
    TimelineCoverageBar
} from "@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ChartHeader/TimelineCoverageBar/TimelineCoverageBar.tsx";
import type {FieldName, OriginalRange} from "@chartsPage/charts/core/store/types/chart.types.ts";
import {useRequestManager} from "@chartsPage/charts/orchestration/hooks/useRequestManager.ts";

// ============================================
// ТИПЫ
// ============================================


type LevelRowProps = {
    readonly level: LevelInfo;
    readonly fieldName: FieldName;
    readonly width: number;
    readonly originalRange: OriginalRange;
    readonly showDetails?: boolean | undefined;
};

// ============================================
// КОМПОНЕНТ
// ============================================

export const LevelRow: React.FC<LevelRowProps> = ({
                                                      level,
                                                      fieldName,
                                                      width,
                                                      originalRange,
                                                      showDetails = true
                                                  }) => {
    const requestManager = useRequestManager();

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

    const fullLoad = () => {
        void requestManager.loadVisibleRange(fieldName, originalRange.fromMs, originalRange.toMs, level.bucketMs, width);
    }

    // Определяем цвета для визуализации
    const coverageColor = level.isCurrent ? '#3b82f6' : '#10b981';
    const loadingColor = '#fbbf24';
    const backgroundColor = hasErrors
        ? '#fee2e2'
        : 'rgba(229, 231, 235, 0.55)';

    return (
        <div className={rowClassName}>

            <button onClick={fullLoad}>load {level.bucketMs}</button>
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
                    originalRange={originalRange}
                    coverageColor={coverageColor}
                    loadingColor={loadingColor}
                    backgroundColor={backgroundColor}
                />
            </div>
        </div>
    );
};