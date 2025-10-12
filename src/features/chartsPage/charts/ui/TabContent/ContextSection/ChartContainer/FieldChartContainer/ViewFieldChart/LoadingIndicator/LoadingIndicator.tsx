// LoadingIndicator.tsx

import React from "react";
import styles from "./LoadingIndicator.module.css";
import type {ChartStats} from "@chartsPage/charts/core/store/selectors/visualization.selectors.ts";

export type LoadingIndicatorPosition = 'aboveAxis' | 'belowAxis' | 'top';

interface LoadingIndicatorProps {
    chartFieldStatus: ChartStats;
    position: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({chartFieldStatus, position}) => {
    // Показываем индикатор только когда идет загрузка
    if (!chartFieldStatus.isLoading) return null;

    // Выбираем класс в зависимости от позиции
    const containerClass = position === 'belowAxis'
        ? styles.containerBottom
        : position === 'top'
            ? styles.containerTop
            : styles.container;

    return (
        <div className={containerClass}>
            {chartFieldStatus.loadingProgress > 0 ? (
                // Если есть прогресс - показываем его
                <div
                    className={styles.progressBar}
                    style={{ width: `${chartFieldStatus.loadingProgress}%` }}
                />
            ) : (
                // Если прогресса нет - показываем неопределенную анимацию
                <div className={styles.indeterminate} />
            )}
        </div>
    );
};

export default LoadingIndicator;