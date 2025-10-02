// LoadingIndicator.tsx

import type { LoadingState } from "@chartsPage/ui/CharContainer/types.ts";
import React from "react";
import styles from "./LoadingIndicator.module.css";

export type LoadingIndicatorPosition = 'aboveAxis' | 'belowAxis' | 'top';

interface LoadingIndicatorProps {
    state: LoadingState;
    position?: LoadingIndicatorPosition;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
                                                               state,
                                                               position = 'aboveAxis' // По умолчанию над осью X
                                                           }) => {
    // Показываем индикатор только когда идет загрузка
    if (!state.active) return null;

    // Выбираем класс в зависимости от позиции
    const containerClass = position === 'belowAxis'
        ? styles.containerBottom
        : position === 'top'
            ? styles.containerTop
            : styles.container;

    return (
        <div className={containerClass}>
            {state.progress > 0 ? (
                // Если есть прогресс - показываем его
                <div
                    className={styles.progressBar}
                    style={{ width: `${state.progress}%` }}
                />
            ) : (
                // Если прогресса нет - показываем неопределенную анимацию
                <div className={styles.indeterminate} />
            )}
        </div>
    );
};

export default LoadingIndicator;