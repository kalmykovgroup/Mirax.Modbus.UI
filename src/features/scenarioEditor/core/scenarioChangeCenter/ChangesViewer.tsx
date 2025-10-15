/**
 * ФАЙЛ: src/components/ChangesViewer/ChangesViewer.tsx
 *
 * Универсальный компонент для визуализации изменений любых сущностей
 */

import { type JSX, memo, useCallback } from 'react';
import classNames from 'classnames';
import styles from './ChangesViewer.module.css';
import type { ChangeVisual, Entity, FieldDiff } from '@scenario/core/scenarioChangeCenter/types';

export interface ChangesViewerProps<T extends Entity = Entity> {
    readonly changes: readonly ChangeVisual<T>[];
    readonly title?: string | undefined;
    readonly className?: string | undefined;
    readonly onApply?: (() => void | Promise<void>) | undefined;
    readonly onCancel?: (() => void) | undefined;
    readonly onRemove?: ((changeId: string) => void) | undefined;
    readonly showActions?: boolean | undefined;
    readonly formatFieldName?: ((entityType: string, field: string) => string) | undefined;
    readonly formatValue?: ((value: unknown) => string) | undefined;
    readonly formatEntityType?: ((entityType: string) => string) | undefined;
}

export const ChangesViewer = memo(function ChangesViewer<T extends Entity>({
                                                                               changes,
                                                                               title = 'Изменения',
                                                                               className,
                                                                               onApply,
                                                                               onCancel,
                                                                               onRemove,
                                                                               showActions = true,
                                                                               formatFieldName,
                                                                               formatValue,
                                                                               formatEntityType,
                                                                           }: ChangesViewerProps<T>): JSX.Element {
    const handleApply = useCallback(async (): Promise<void> => {
        if (onApply !== undefined) {
            await onApply();
        }
    }, [onApply]);

    const handleCancel = useCallback(() => {
        if (onCancel !== undefined) {
            if (window.confirm('Отменить все изменения?')) {
                onCancel();
            }
        }
    }, [onCancel]);

    const getActionLabel = useCallback((action: 'create' | 'update' | 'delete'): string => {
        switch (action) {
            case 'create':
                return 'Создание';
            case 'update':
                return 'Обновление';
            case 'delete':
                return 'Удаление';
        }
    }, []);

    const getActionClass = useCallback((action: 'create' | 'update' | 'delete'): string => {
        switch (action) {
            case 'create':
                return styles.typeCreate!;
            case 'update':
                return styles.typeUpdate!;
            case 'delete':
                return styles.typeDelete!;
        }
    }, []);

    const formatFieldNameInternal = useCallback(
        (entityType: string, field: string): string => {
            if (formatFieldName !== undefined) {
                return formatFieldName(entityType, field);
            }
            return field;
        },
        [formatFieldName]
    );

    const formatValueInternal = useCallback(
        (value: unknown): string => {
            if (formatValue !== undefined) {
                return formatValue(value);
            }

            if (value === null) return 'null';
            if (value === undefined) return '—';
            if (typeof value === 'string') return value;
            if (typeof value === 'number' || typeof value === 'boolean') return String(value);
            if (Array.isArray(value)) return `[${value.length} элементов]`;

            try {
                return JSON.stringify(value, null, 2);
            } catch {
                return String(value);
            }
        },
        [formatValue]
    );

    const formatEntityTypeInternal = useCallback(
        (entityType: string): string => {
            if (formatEntityType !== undefined) {
                return formatEntityType(entityType);
            }
            return entityType;
        },
        [formatEntityType]
    );

    const formatTimestamp = useCallback((timestamp: number): string => {
        const date = new Date(timestamp);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }, []);

    if (changes.length === 0) {
        return (
            <div className={classNames(styles.container, className)}>
                <div className={styles.empty}>Изменений нет</div>
            </div>
        );
    }

    return (
        <div className={classNames(styles.container, className)}>
            <div className={styles.header}>
                <h3 className={styles.title}>
                    {title} ({changes.length})
                </h3>
                {showActions && (
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.btnCancel}
                            onClick={handleCancel}
                        >
                            Отменить все
                        </button>
                        <button
                            type="button"
                            className={styles.btnApply}
                            onClick={handleApply}
                        >
                            Применить
                        </button>
                    </div>
                )}
            </div>

            <div className={styles.changesList}>
                {changes.map((change) => (
                    <ChangeItem
                        key={change.id}
                        change={change}
                        onRemove={onRemove}
                        getActionLabel={getActionLabel}
                        getActionClass={getActionClass}
                        formatFieldName={formatFieldNameInternal}
                        formatValue={formatValueInternal}
                        formatEntityType={formatEntityTypeInternal}
                        formatTimestamp={formatTimestamp}
                    />
                ))}
            </div>
        </div>
    );
});

interface ChangeItemProps<T extends Entity = Entity> {
    readonly change: ChangeVisual<T>;
    readonly onRemove?: ((changeId: string) => void) | undefined;
    readonly getActionLabel: (action: 'create' | 'update' | 'delete') => string;
    readonly getActionClass: (action: 'create' | 'update' | 'delete') => string;
    readonly formatFieldName: (entityType: string, field: string) => string;
    readonly formatValue: (value: unknown) => string;
    readonly formatEntityType: (entityType: string) => string;
    readonly formatTimestamp: (timestamp: number) => string;
}

const ChangeItem = memo(function ChangeItem<T extends Entity>({
                                                                  change,
                                                                  onRemove,
                                                                  getActionLabel,
                                                                  getActionClass,
                                                                  formatFieldName,
                                                                  formatValue,
                                                                  formatEntityType,
                                                                  formatTimestamp,
                                                              }: ChangeItemProps<T>): JSX.Element {
    const handleRemove = useCallback(() => {
        if (onRemove !== undefined) {
            onRemove(change.id);
        }
    }, [onRemove, change.id]);

    return (
        <div className={styles.changeItem}>
            <div className={styles.changeHeader}>
                <span className={classNames(styles.changeType, getActionClass(change.action))}>
                    {getActionLabel(change.action)}
                </span>
                <span className={styles.entityType}>
                    {formatEntityType(change.entityType)}
                </span>
                <span className={styles.entityId}>
                    ID: {change.entityId.slice(0, 8)}...
                </span>
                <span className={styles.timestamp}>
                    {formatTimestamp(change.timestamp)}
                </span>
                {onRemove !== undefined && (
                    <button
                        type="button"
                        className={styles.btnRemove}
                        onClick={handleRemove}
                        title="Удалить изменение"
                    >
                        ✕
                    </button>
                )}
            </div>

            {change.diffs.length > 0 && (
                <div className={styles.diffsList}>
                    {change.diffs.map((diff, index) => (
                        <DiffItem
                            key={`${diff.field}-${index}`}
                            diff={diff}
                            changeAction={change.action}
                            entityType={change.entityType}
                            formatFieldName={formatFieldName}
                            formatValue={formatValue}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

interface DiffItemProps {
    readonly diff: FieldDiff;
    readonly changeAction: 'create' | 'update' | 'delete';
    readonly entityType: string;
    readonly formatFieldName: (entityType: string, field: string) => string;
    readonly formatValue: (value: unknown) => string;
}

const DiffItem = memo(function DiffItem({
                                            diff,
                                            changeAction,
                                            entityType,
                                            formatFieldName,
                                            formatValue,
                                        }: DiffItemProps): JSX.Element {
    const fieldName = formatFieldName(entityType, diff.field);
    const oldValue = formatValue(diff.oldValue);
    const newValue = formatValue(diff.newValue);

    if (changeAction === 'create') {
        return (
            <div className={styles.diffItem}>
                <span className={styles.diffField}>{fieldName}:</span>
                <span className={styles.diffValueNew}>{newValue}</span>
            </div>
        );
    }

    if (changeAction === 'delete') {
        return (
            <div className={styles.diffItem}>
                <span className={styles.diffField}>{fieldName}:</span>
                <span className={styles.diffValueOld}>{oldValue}</span>
            </div>
        );
    }

    return (
        <div className={styles.diffItem}>
            <span className={styles.diffField}>{fieldName}:</span>
            <span className={styles.diffValueOld}>{oldValue}</span>
            <span className={styles.diffArrow}>→</span>
            <span className={styles.diffValueNew}>{newValue}</span>
        </div>
    );
});