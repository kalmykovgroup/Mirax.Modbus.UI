// src/features/scenarioEditor/core/ui/map/HistoryPanel/HistoryPanel.tsx

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Undo, Redo, Trash2, X } from 'lucide-react';

import styles from './HistoryPanel.module.css';

import type { AppDispatch, RootState } from '@/baseStore/store.ts';
import { selectActiveScenarioId } from '@scenario/store/scenarioSelectors.ts';
import {
    undoThunk,
    redoThunk,
    clearHistory,
    selectHistoryContext,
    selectCanUndo,
    selectCanRedo,
    registerConfirmUndo,
} from '@scenario/core/features/historySystem/historySlice.ts';
import type { HistoryRecord } from '@scenario/core/features/historySystem/types.ts';
import { useConfirm } from "@ui/components/ConfirmProvider/ConfirmProvider.tsx";
import { useHistoryHotkeys } from '@scenario/core/hooks/useHistoryHotkeys';

// Тип для описания изменения поля
interface FieldDiff {
    path: string;
    before: any;
    after: any;
    type: 'added' | 'removed' | 'changed';
}

// Функция для вычисления diff между двумя объектами
function computeDiff(before: any, after: any, path: string = ''): FieldDiff[] {
    const diffs: FieldDiff[] = [];

    // Если оба не объекты или один из них null/undefined
    if (typeof before !== 'object' || typeof after !== 'object' || before === null || after === null) {
        if (before !== after) {
            diffs.push({
                path: path || '(root)',
                before,
                after,
                type: 'changed',
            });
        }
        return diffs;
    }

    // Если это массивы
    if (Array.isArray(before) && Array.isArray(after)) {
        if (JSON.stringify(before) !== JSON.stringify(after)) {
            diffs.push({
                path: path || '(array)',
                before,
                after,
                type: 'changed',
            });
        }
        return diffs;
    }

    // Объединяем ключи обоих объектов
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
        const currentPath = path ? `${path}.${key}` : key;
        const beforeValue = before[key];
        const afterValue = after[key];

        if (!(key in before)) {
            // Поле добавлено
            diffs.push({
                path: currentPath,
                before: undefined,
                after: afterValue,
                type: 'added',
            });
        } else if (!(key in after)) {
            // Поле удалено
            diffs.push({
                path: currentPath,
                before: beforeValue,
                after: undefined,
                type: 'removed',
            });
        } else if (typeof beforeValue === 'object' && typeof afterValue === 'object' && beforeValue !== null && afterValue !== null) {
            // Рекурсивно сравниваем вложенные объекты
            if (!Array.isArray(beforeValue) && !Array.isArray(afterValue)) {
                diffs.push(...computeDiff(beforeValue, afterValue, currentPath));
            } else if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
                // Для массивов или смешанных типов - простое сравнение
                diffs.push({
                    path: currentPath,
                    before: beforeValue,
                    after: afterValue,
                    type: 'changed',
                });
            }
        } else if (beforeValue !== afterValue) {
            // Примитивные значения изменились
            diffs.push({
                path: currentPath,
                before: beforeValue,
                after: afterValue,
                type: 'changed',
            });
        }
    }

    return diffs;
}

// Компонент модального окна с детальным сравнением
interface DiffModalProps {
    record: HistoryRecord;
    onClose: () => void;
}

function DiffModal({ record: initialRecord, onClose }: DiffModalProps) {
    // Для batch операций - выбранная под-операция
    const [selectedSubRecord, setSelectedSubRecord] = useState<HistoryRecord | null>(null);

    // Определяем какую запись показывать
    const record = selectedSubRecord || initialRecord;

    // Вычисляем diff для выбранной записи (только для не-batch операций)
    const recordDiffs = useMemo(() => {
        if (record.type === 'batch') return [];
        if (!record.before || !record.after) return [];

        const beforeData = (record.before as any).data || record.before;
        const afterData = (record.after as any).data || record.after;

        return computeDiff(beforeData, afterData);
    }, [record]);

    const renderValue = (value: any): string => {
        if (value === null || value === undefined) return 'null';
        if (typeof value === 'boolean') return String(value);
        if (typeof value === 'number') return String(value);
        if (typeof value === 'string') {
            // Для коротких строк показываем полностью
            if (value.length < 50) return `"${value}"`;
            // Для длинных - сокращаем
            return `"${value.substring(0, 50)}..."`;
        }
        if (Array.isArray(value)) {
            // Для коротких массивов показываем содержимое
            if (value.length === 0) return '[]';
            if (value.length <= 3 && value.every(v => typeof v !== 'object')) {
                return `[${value.map(v => typeof v === 'string' ? `"${v}"` : String(v)).join(', ')}]`;
            }
            return `[${value.length} элементов]`;
        }
        if (typeof value === 'object') {
            const keys = Object.keys(value);
            if (keys.length === 0) return '{}';
            // Для маленьких объектов показываем содержимое
            if (keys.length <= 3) {
                const entries = keys.map(k => `${k}: ${typeof value[k] === 'string' ? `"${value[k]}"` : String(value[k])}`);
                return `{${entries.join(', ')}}`;
            }
            return `{${keys.length} полей}`;
        }
        return String(value);
    };

    const getDescription = (): string => {
        if (record.description) return record.description;
        const entityType = record.entityType;
        switch (record.type) {
            case 'create':
                return `Создание ${entityType}`;
            case 'update':
                return `Обновление ${entityType}`;
            case 'delete':
                return `Удаление ${entityType}`;
            case 'batch':
                return `Батч операций (${record.records?.length || 0})`;
            default:
                return 'Неизвестное действие';
        }
    };

    // Логирование для отладки
    console.log('[DiffModal] Record before:', record.before);
    console.log('[DiffModal] Record after:', record.after);
    if (record.before && record.after) {
        const beforeData = (record.before as any).data || record.before;
        const afterData = (record.after as any).data || record.after;
        console.log('[DiffModal] Before data:', beforeData);
        console.log('[DiffModal] After data:', afterData);
        console.log('[DiffModal] Computed diffs:', recordDiffs);
        console.log('[DiffModal] Number of changes:', recordDiffs.length);
    }

    // Проверяем является ли это batch операцией
    const isBatchOperation = initialRecord.type === 'batch';
    const batchRecords = isBatchOperation ? (initialRecord.records || []) : [];

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>{isBatchOperation && selectedSubRecord ? getDescription() : getDescription()}</h3>
                    <button className={styles.modalClose} onClick={onClose} title="Закрыть">
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {isBatchOperation ? (
                        <div className={styles.batchModalLayout}>
                            {/* Левая панель - список операций */}
                            <div className={styles.batchSidebar}>
                                <div className={styles.batchSidebarTitle}>
                                    Операции ({batchRecords.length})
                                </div>
                                <div className={styles.batchOperationsList}>
                                    {batchRecords.map((subRec: any, i: number) => (
                                        <div
                                            key={i}
                                            className={`${styles.batchOperationItem} ${selectedSubRecord === subRec ? styles.batchOperationItemActive : ''}`}
                                            onClick={() => setSelectedSubRecord(subRec)}
                                        >
                                            <span className={styles.batchItemNumber}>#{i + 1}</span>
                                            <div className={styles.batchItemInfo}>
                                                <span className={styles.batchItemType}>{subRec.type}</span>
                                                <span className={styles.batchItemEntityType}>{subRec.entityType}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Правая панель - детали выбранной операции */}
                            <div className={styles.batchDetailsPanel}>
                                {selectedSubRecord ? (
                                    renderOperationDetails(selectedSubRecord)
                                ) : (
                                    <div className={styles.batchNoSelection}>
                                        Выберите операцию из списка
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        renderOperationDetails(record)
                    )}
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.modalBtn} onClick={onClose}>
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );

    function renderOperationDetails(rec: HistoryRecord) {
        return (
            <>
                {rec.type === 'create' ? (
                    <div className={styles.createInfo}>
                        <p>Создан новый объект с полями:</p>
                        <div className={styles.fieldsList}>
                            {rec.after && Object.entries(((rec.after as any).data || rec.after)).map(([key, value]) => (
                                <div key={key} className={styles.fieldRow}>
                                    <span className={styles.fieldKey}>{key}:</span>
                                    <span className={styles.fieldValue}>{renderValue(value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : rec.type === 'delete' ? (
                    <div className={styles.deleteInfo}>
                        <p>Удален объект с полями:</p>
                        <div className={styles.fieldsList}>
                            {rec.before && Object.entries(((rec.before as any).data || rec.before)).map(([key, value]) => (
                                <div key={key} className={styles.fieldRow}>
                                    <span className={styles.fieldKey}>{key}:</span>
                                    <span className={styles.fieldValue}>{renderValue(value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : recordDiffs.length === 0 ? (
                    <div className={styles.noDiff}>Изменений не обнаружено</div>
                ) : (
                    <div className={styles.diffTable}>
                        <div className={styles.diffTableHeader}>
                            <div className={styles.diffHeaderCell}>Поле</div>
                            <div className={styles.diffHeaderCell}>Было</div>
                            <div className={styles.diffHeaderCell}>Стало</div>
                        </div>
                        {recordDiffs.map((diff, i) => (
                            <div key={i} className={`${styles.diffRow} ${styles[`diffRow_${diff.type}`]}`}>
                                <div className={styles.diffCell}>
                                    <code className={styles.fieldPath}>{diff.path}</code>
                                    <span className={styles.diffType}>{diff.type === 'added' ? '+ добавлено' : diff.type === 'removed' ? '- удалено' : '~ изменено'}</span>
                                </div>
                                <div className={styles.diffCell}>
                                    <code className={styles.diffValue}>{renderValue(diff.before)}</code>
                                </div>
                                <div className={styles.diffCell}>
                                    <code className={styles.diffValue}>{renderValue(diff.after)}</code>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </>
        );
    }
}

interface HistoryItemProps {
    record: HistoryRecord;
    index: number;
    isCurrent: boolean;
    isFuture: boolean;
    onOpenModal: () => void;
}

function HistoryItem({ record, index, isCurrent, isFuture, onOpenModal }: HistoryItemProps) {
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const getDescription = (record: HistoryRecord): string => {
        if (record.description) return record.description;

        if (record.type === 'batch') {
            return `Батч операций (${record.records.length})`;
        }

        const entityType = record.entityType;
        switch (record.type) {
            case 'create':
                return `Создание ${entityType}`;
            case 'update':
                return `Обновление ${entityType}`;
            case 'delete':
                return `Удаление ${entityType}`;
            default:
                return 'Неизвестное действие';
        }
    };

    const getIcon = (record: HistoryRecord): string => {
        switch (record.type) {
            case 'create':
                return '+';
            case 'update':
                return '✎';
            case 'delete':
                return '×';
            case 'batch':
                return '⋯';
            default:
                return '•';
        }
    };

    return (
        <div
            className={`${styles.historyItem} ${isCurrent ? styles.current : ''} ${isFuture ? styles.future : ''}`}
            onClick={onOpenModal}
            title="Кликните для просмотра деталей"
        >
            <div className={styles.itemHeader}>
                <div className={styles.itemIcon}>{getIcon(record)}</div>
                <div className={styles.itemContent}>
                    <div className={styles.itemDescription}>{getDescription(record)}</div>
                    <div className={styles.itemTime}>{formatTime(record.timestamp)}</div>
                </div>
                <div className={styles.itemIndex}>#{index + 1}</div>
            </div>
        </div>
    );
}

export function HistoryPanel() {
    const dispatch = useDispatch<AppDispatch>();
    const activeId = useSelector(selectActiveScenarioId);

    const confirm = useConfirm();

    // Используем activeId как contextId для истории
    const contextId = activeId ?? '';

    const historyContext = useSelector((state: RootState) => selectHistoryContext(state, contextId));
    const canUndo = useSelector((state: RootState) => selectCanUndo(state, contextId));
    const canRedo = useSelector((state: RootState) => selectCanRedo(state, contextId));

    // Состояние для модального окна
    const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);

    // Функция подтверждения для важных операций
    const confirmFn = useCallback(async (record: HistoryRecord) => {
        console.log('[HistoryPanel] Confirming undo for user-edit operation:', record);
        return await confirm({
            title: 'Отменить изменения?',
            description: 'Вы редактировали эту ноду/ветку через UI. Отменить изменения?',
            confirmText: 'Нет',
            cancelText: 'Да',
            danger: true,
        });
    }, [confirm]);

    // Регистрируем глобальную функцию подтверждения при монтировании
    useEffect(() => {
        console.log('[HistoryPanel] Registering confirm function');
        registerConfirmUndo(confirmFn);

        // Очищаем при размонтировании
        return () => {
            console.log('[HistoryPanel] Unregistering confirm function');
            registerConfirmUndo(null);
        };
    }, [confirmFn]);

    const handleOpenModal = useCallback((record: HistoryRecord) => {
        setSelectedRecord(record);
    }, []);

    const handleCloseModal = useCallback(() => {
        setSelectedRecord(null);
    }, []);

    const handleUndo = useCallback(() => {
        if (canUndo) {
            dispatch(undoThunk({ contextId }));
        }
    }, [dispatch, contextId, canUndo]);

    const handleRedo = useCallback(() => {
        if (canRedo) {
            dispatch(redoThunk({ contextId }));
        }
    }, [dispatch, contextId, canRedo]);

    // Регистрируем горячие клавиши для истории
    useHistoryHotkeys({
        onUndo: handleUndo,
        onRedo: handleRedo,
    }, !!activeId); // Включены только если есть активный сценарий

    const handleClear = useCallback(async () => {

        const ok = await confirm({
            title: 'Очистить всю историю изменений? Это действие нельзя отменить.',
            description: 'Данные будут удалены.',
            confirmText: 'Очистить',
            cancelText: 'Отменить',
            danger: true,
        });

        if (!ok) return;

        dispatch(clearHistory({ contextId }));

    }, [dispatch, contextId]);

    // Объединяем past и future для отображения всей истории
    const allRecords = useMemo(() => {
        if (!historyContext) return [];
        return [...historyContext.past, ...historyContext.future];
    }, [historyContext]);

    const currentIndex = historyContext?.past.length ? historyContext.past.length - 1 : -1;

    if (!activeId) {
        return (
            <aside className={styles.panel}>
                <div className={styles.placeholder}>Выберите сценарий</div>
            </aside>
        );
    }

    return (
        <aside className={styles.panel}>
            <div className={styles.list}>
                {allRecords.length === 0 && (
                    <div className={styles.placeholder}>История пуста</div>
                )}

                {allRecords.map((record, index) => (
                    <HistoryItem
                        key={record.id}
                        record={record}
                        index={index}
                        isCurrent={index === currentIndex}
                        isFuture={index > currentIndex}
                        onOpenModal={() => handleOpenModal(record)}
                    />
                ))}
            </div>

            <div className={styles.footer}>
                <div className={styles.stats}>
                    {historyContext && (
                        <>
                            <span>Прошлое: {historyContext.past.length}</span>
                            <span>•</span>
                            <span>Будущее: {historyContext.future.length}</span>
                        </>
                    )}
                </div>

                <div className={styles.actions}>
                    <button
                        className={styles.iconBtn}
                        title="Отменить (Ctrl+Z)"
                        onClick={handleUndo}
                        disabled={!canUndo}
                    >
                        <Undo size={16} />
                    </button>
                    <button
                        className={styles.iconBtn}
                        title="Повторить (Ctrl+Shift+Z)"
                        onClick={handleRedo}
                        disabled={!canRedo}
                    >
                        <Redo size={16} />
                    </button>
                    <button
                        className={styles.iconBtn}
                        title="Очистить историю"
                        onClick={handleClear}
                        disabled={allRecords.length === 0}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {selectedRecord && <DiffModal record={selectedRecord} onClose={handleCloseModal} />}
        </aside>
    );
}