// src/features/scenarioEditor/core/ui/map/HistoryPanel/HistoryPanel.tsx

import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Undo, Redo, Trash2 } from 'lucide-react';

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
} from '@scenario/core/features/historySystem/historySlice.ts';
import type { HistoryRecord } from '@scenario/core/features/historySystem/types.ts';
import {useConfirm} from "@ui/components/ConfirmProvider/ConfirmProvider.tsx";

interface HistoryItemProps {
    record: HistoryRecord;
    index: number;
    isCurrent: boolean;
    isFuture: boolean;
    onClick: () => void;
}

function HistoryItem({ record, index, isCurrent, isFuture, onClick }: HistoryItemProps) {
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
            onClick={onClick}
            title={isFuture ? 'Отменено' : 'Кликните для перехода'}
        >
            <div className={styles.itemIcon}>{getIcon(record)}</div>
            <div className={styles.itemContent}>
                <div className={styles.itemDescription}>{getDescription(record)}</div>
                <div className={styles.itemTime}>{formatTime(record.timestamp)}</div>
            </div>
            <div className={styles.itemIndex}>#{index + 1}</div>
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

    const handleJumpTo = useCallback(
        async (targetIndex: number) => {
            if (!historyContext) return;

            const currentIndex = historyContext.past.length - 1;

            if (targetIndex < currentIndex) {
                // ✅ ИСПРАВЛЕНО: Переходим назад - делаем undo последовательно
                const undoCount = currentIndex - targetIndex;
                for (let i = 0; i < undoCount; i++) {
                    await dispatch(undoThunk({ contextId }));
                }
            } else if (targetIndex > currentIndex) {
                // ✅ ИСПРАВЛЕНО: Переходим вперед - делаем redo последовательно
                const redoCount = targetIndex - currentIndex;
                for (let i = 0; i < redoCount; i++) {
                    await dispatch(redoThunk({ contextId }));
                }
            }
        },
        [dispatch, contextId, historyContext]
    );

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
                        onClick={() => handleJumpTo(index)}
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
        </aside>
    );
}