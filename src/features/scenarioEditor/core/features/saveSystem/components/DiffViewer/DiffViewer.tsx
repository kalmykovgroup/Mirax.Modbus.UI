// src/features/scenarioEditor/core/features/saveSystem/components/DiffViewer/DiffViewer.tsx

import React from 'react';
import { DbActionType } from '@scenario/shared/contracts/server/types/Api.Shared/Scenario/DbActionType';
import type { OperationDiff } from '../../operationDiffBuilder';
import styles from './DiffViewer.module.css';

export interface DiffViewerProps {
    diff: OperationDiff;
}

const ACTION_LABELS: Record<DbActionType, string> = {
    [DbActionType.Create]: 'Создание',
    [DbActionType.Update]: 'Изменение',
    [DbActionType.Delete]: 'Удаление',
};

/**
 * Рендерит JSON с подсветкой изменений
 */
const JsonView: React.FC<{ data: any; title: string }> = ({ data, title }) => {
    // Убираем служебные поля для чистого отображения
    const cleanData = { ...data };
    delete cleanData.entityType;
    delete cleanData.__persisted;

    const jsonString = JSON.stringify(cleanData, null, 2);

    return (
        <div className={styles.jsonView}>
            <div className={styles.jsonTitle}>{title}</div>
            <pre className={styles.jsonContent}>
                <code>{jsonString}</code>
            </pre>
        </div>
    );
};

/**
 * Вычисляет и показывает измененные поля между before и after
 */
const FieldChanges: React.FC<{ before: any; after: any }> = ({ before, after }) => {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    // Собираем все ключи из обоих объектов
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

    for (const key of allKeys) {
        // Пропускаем служебные поля
        if (key === 'entityType' || key === '__persisted') continue;

        const oldValue = before?.[key];
        const newValue = after?.[key];

        // Сравниваем значения (простое сравнение)
        const oldJson = JSON.stringify(oldValue);
        const newJson = JSON.stringify(newValue);

        if (oldJson !== newJson) {
            changes.push({
                field: key,
                oldValue,
                newValue,
            });
        }
    }

    if (changes.length === 0) {
        return <div className={styles.noChanges}>Нет изменений в полях</div>;
    }

    return (
        <div className={styles.fieldChanges}>
            <div className={styles.fieldChangesTitle}>Измененные поля ({changes.length})</div>
            {changes.map((change) => (
                <div key={change.field} className={styles.fieldChange}>
                    <div className={styles.fieldName}>{change.field}</div>
                    <div className={styles.fieldValues}>
                        <div className={styles.fieldValue}>
                            <span className={styles.fieldLabel}>Было:</span>
                            <code className={styles.oldValue}>
                                {change.oldValue === undefined ? 'undefined' : JSON.stringify(change.oldValue)}
                            </code>
                        </div>
                        <div className={styles.fieldValue}>
                            <span className={styles.fieldLabel}>Стало:</span>
                            <code className={styles.newValue}>
                                {change.newValue === undefined ? 'undefined' : JSON.stringify(change.newValue)}
                            </code>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff }) => {
    const actionLabel = ACTION_LABELS[diff.action] || 'Неизвестно';
    const name = diff.metadata.name || diff.entityId;

    return (
        <div className={styles.viewer}>
            <div className={styles.header}>
                <h4 className={styles.title}>
                    {actionLabel}: {name}
                </h4>
                <div className={styles.subtitle}>
                    {diff.entityType} • {diff.entityId}
                </div>
            </div>

            <div className={styles.content}>
                {/* Для Create: только after */}
                {diff.action === DbActionType.Create && diff.after && (
                    <div className={styles.singleView}>
                        <JsonView data={diff.after.data} title="Новая сущность" />
                    </div>
                )}

                {/* Для Delete: только before */}
                {diff.action === DbActionType.Delete && diff.before && (
                    <div className={styles.singleView}>
                        <JsonView data={diff.before.data} title="Удаляемая сущность" />
                    </div>
                )}

                {/* Для Update: before и after с выделением изменений */}
                {diff.action === DbActionType.Update && diff.before && diff.after && (
                    <div className={styles.updateView}>
                        {/* Измененные поля вверху */}
                        <FieldChanges before={diff.before.data} after={diff.after.data} />

                        {/* Полные JSON ниже */}
                        <div className={styles.fullJsons}>
                            <JsonView data={diff.before.data} title="Как на сервере (до)" />
                            <JsonView data={diff.after.data} title="Как сейчас на клиенте (после)" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
