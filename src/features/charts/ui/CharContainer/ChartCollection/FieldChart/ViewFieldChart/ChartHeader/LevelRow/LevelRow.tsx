import React from "react";
import styles from "./LevelRow.module.css";
import type {
    LevelInfo
} from "@charts/ui/CharContainer/ChartCollection/FieldChart/ViewFieldChart/ChartHeader/ChartHeader.tsx";
import {
    TimelineCoverageBar
} from "@charts/ui/CharContainer/ChartCollection/FieldChart/ViewFieldChart/ChartHeader/TimelineCoverageBar/TimelineCoverageBar.tsx";

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
                {level.bucketLabel}
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
                    coverageColor={level.isCurrent ? '#3b82f6' : '#10b981'}
                    loadingColor="#fbbf24"
                    backgroundColor={hasErrors ? '#fee2e2' : 'rgba(229,231,235,0.55)'}
                />
            </div>
        </div>
    );
};