import React from "react";
import { TimelineCoverageBar } from "@charts/ui/CharContainer/ChartHeader/TimelineCoverageBar/TimelineCoverageBar.tsx";
import type { LevelInfo } from "@charts/ui/CharContainer/ChartHeader/ChartHeader.tsx";
import styles from "./LevelRow.module.css";

export const LevelRow: React.FC<{
    level: LevelInfo;
    domain: { from: number; to: number };
    showDetails?: boolean;
}> = ({ level, domain, showDetails = true }) => {


    const hasErrors = level.errorCoverage.length > 0;

    return (
        <div className={`${styles.row} ${level.isCurrent ? styles.rowCurrent : styles.rowDefault }`}>


            {/* Метка уровня */}
            <div className={`${styles.label} ${level.isCurrent ? styles.labelCurrent : styles.labelDefault }`}>
                {level.isCurrent && (
                    <span className={styles.currentIndicator} />
                )}
                Уровень: {level.bucketLabel}
            </div>

            {/* Статистика */}
            {showDetails && (
                <div className={styles.statistics}>
                    {level.coveredBins} из {level.totalBins} бинов
                </div>
            )}

            {/* Визуализация покрытия */}
            <div className={styles.coverageBarWrapper}>
                <TimelineCoverageBar
                    coverage={level.coverage}
                    loadingIntervals={level.loadingCoverage}
                    domainFrom={domain.from}
                    domainTo={domain.to}
                    height={level.isCurrent ? 12 : 10}
                    coverageColor={level.isCurrent ? '#3b82f6' : '#10b981'}
                    loadingColor="#fbbf24"
                    backgroundColor={hasErrors ? '#fee2e2' : '#e5e7eb'}
                />
            </div>
        </div>
    );
};