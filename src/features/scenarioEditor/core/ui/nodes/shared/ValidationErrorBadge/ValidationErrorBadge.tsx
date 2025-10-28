// src/features/scenarioEditor/core/ui/nodes/shared/ValidationErrorBadge/ValidationErrorBadge.tsx

import { useState } from 'react';
import styles from './ValidationErrorBadge.module.css';

interface ValidationErrorBadgeProps {
    errors: string[];
}

/**
 * Компонент отображения ошибок валидации на ноде
 * Показывает красный восклицательный знак с tooltip при наведении
 */
export function ValidationErrorBadge({ errors }: ValidationErrorBadgeProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    if (!errors || errors.length === 0) {
        return null;
    }

    return (
        <div
            className={styles.badge}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className={styles.icon}>!</div>

            {showTooltip && (
                <div className={styles.tooltip}>
                    <div className={styles.tooltipHeader}>
                        Ошибки валидации:
                    </div>
                    <ul className={styles.errorList}>
                        {errors.map((error, index) => (
                            <li key={index} className={styles.errorItem}>
                                {error}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
