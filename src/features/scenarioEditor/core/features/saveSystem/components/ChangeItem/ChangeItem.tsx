// src/features/scenarioEditor/core/features/saveSystem/components/ChangeItem/ChangeItem.tsx

import React from 'react';
import { DbActionType } from '@scenario/shared/contracts/server/types/Api.Shared/Scenario/DbActionType';
import type { OperationDiff } from '../../operationDiffBuilder';
import styles from './ChangeItem.module.css';

export interface ChangeItemProps {
    change: OperationDiff;
    isSelected: boolean;
    onClick: () => void;
}

const ACTION_LABELS: Record<DbActionType, string> = {
    [DbActionType.Create]: 'Создание',
    [DbActionType.Update]: 'Изменение',
    [DbActionType.Delete]: 'Удаление',
};

const ACTION_ICONS: Record<DbActionType, string> = {
    [DbActionType.Create]: '➕',
    [DbActionType.Update]: '✏️',
    [DbActionType.Delete]: '🗑️',
};

export const ChangeItem: React.FC<ChangeItemProps> = ({ change, isSelected, onClick }) => {
    const actionLabel = ACTION_LABELS[change.action] || 'Неизвестно';
    const actionIcon = ACTION_ICONS[change.action] || '❓';
    const name = change.metadata.name || change.entityId;

    return (
        <button
            className={`${styles.item} ${isSelected ? styles.selected : ''} ${styles[`action-${change.action.toLowerCase()}`]}`}
            onClick={onClick}
            title={`${actionLabel} ${change.entityType}: ${name}`}
        >
            <div className={styles.icon}>{actionIcon}</div>
            <div className={styles.content}>
                <div className={styles.name}>{name}</div>
                <div className={styles.meta}>
                    <span className={styles.action}>{actionLabel}</span>
                    <span className={styles.separator}>•</span>
                    <span className={styles.type}>{change.entityType}</span>
                </div>
            </div>
        </button>
    );
};
