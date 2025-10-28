// src/features/scenarioEditor/core/ui/nodes/shared/ValidationIndicator/useValidationIndicator.tsx

import React from 'react';
import { useSelector } from 'react-redux';
import { ValidationErrorBadge } from '@scenario/core/ui/nodes/shared/ValidationErrorBadge/ValidationErrorBadge';
import styles from './ValidationIndicator.module.css';
import {selectActiveScenarioId} from "@scenario/store/scenarioSelectors.ts";
import {useNodeValidationErrors} from "@scenario/core/features/validation";

/**
 * Хук для добавления индикации валидации внутрь ноды
 */
export function useValidationIndicator(nodeId: string) {
    const scenarioId = useSelector(selectActiveScenarioId);
    const errors = useNodeValidationErrors(scenarioId, nodeId);
    const hasErrors = errors && errors.length > 0;

    /**
     * Компонент индикации валидации для вставки в ноду
     */
    const ValidationIndicator = React.useMemo(() => {
        if (!hasErrors) {
            return null;
        }

        return (
            <>
                <div className={styles.invalidOverlay} />
                <ValidationErrorBadge errors={errors} />
            </>
        );
    }, [hasErrors, errors]);

    return {
        /** Компонент для рендера внутри ноды */
        ValidationIndicator,
        /** Есть ли ошибки */
        hasErrors,
        /** Список ошибок */
        errors: errors || [],
        /** CSS класс для контейнера ноды (если нужно) */
        containerClassName: hasErrors ? styles.invalidNode : '',
    };
}
