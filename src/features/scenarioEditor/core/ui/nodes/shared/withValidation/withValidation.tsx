// src/features/scenarioEditor/core/ui/nodes/shared/withValidation/withValidation.tsx

import { ComponentType } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import { useSelector } from 'react-redux';
import { selectActiveScenarioId } from '@scenario/store/scenarioSelectors';
import { useNodeValidationErrors } from '@scenario/core/features/validation';
import { ValidationErrorBadge } from '../ValidationErrorBadge/ValidationErrorBadge';
import type { FlowNodeData } from '@scenario/shared/contracts/models/FlowNodeData';
import styles from './withValidation.module.css';

/**
 * HOC для добавления визуальной индикации ошибок валидации к ноде
 * Добавляет:
 * - Красный восклицательный знак в правом верхнем углу
 * - Tooltip с ошибками при наведении
 * - Красноватое затемнение самой ноды
 */
export function withValidation<TDto = any>(
    WrappedComponent: ComponentType<NodeProps<Node<FlowNodeData<TDto>>>>
) {
    return function ValidationWrapper(props: NodeProps<Node<FlowNodeData<TDto>>>) {
        const scenarioId = useSelector(selectActiveScenarioId);
        const errors = useNodeValidationErrors(scenarioId, props.id);

        const hasErrors = errors && errors.length > 0;

        return (
            <div
                className={hasErrors ? styles.invalidNodeContainer : styles.validNodeContainer}
                data-node-id={props.id}
                data-has-validation-errors={hasErrors}
            >
                {hasErrors && <ValidationErrorBadge errors={errors} />}
                <WrappedComponent {...props} />
            </div>
        );
    };
}
