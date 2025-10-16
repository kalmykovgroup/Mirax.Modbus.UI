// src/features/scenarioEditor/ui/PendingChangesViewer/PendingChangesViewer.tsx

import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Save, X, AlertCircle } from 'lucide-react';
import type { Guid } from '@app/lib/types/Guid';
import type { RootState } from '@/baseStore/store';

import styles from './PendingChangesViewer.module.css';
import {selectAllCommands, selectHistorySize} from "@scenario/core/features/historySystem/historySlice.ts";

interface PendingChangesViewerProps {
    readonly scenarioId: Guid;
}

export const PendingChangesViewer: React.FC<PendingChangesViewerProps> = ({ scenarioId }) => {
    // Получаем все команды из истории
    const commands = useSelector((state: RootState) => selectAllCommands(state, scenarioId));
    const historySize = useSelector((state: RootState) => selectHistorySize(state, scenarioId));

    // Группируем команды по типам
    const stats = useMemo(() => {
        const counts = {
            create: 0,
            update: 0,
            delete: 0,
            batch: 0,
        };

        for (const cmd of commands) {
            if (cmd.type === 'batch') {
                counts.batch++;
            } else if (cmd.type === 'create') {
                counts.create++;
            } else if (cmd.type === 'update') {
                counts.update++;
            } else if (cmd.type === 'delete') {
                counts.delete++;
            }
        }

        return counts;
    }, [commands]);

    const totalChanges = stats.create + stats.update + stats.delete + stats.batch;

    const handleSave = useCallback(() => {
        // TODO: Отправить изменения на сервер
        console.log('[PendingChangesViewer] Saving changes:', commands);
    }, [commands]);

    const handleDiscard = useCallback(() => {
        // TODO: Очистить историю и откатить изменения
        console.log('[PendingChangesViewer] Discarding changes');
    }, []);

    if (totalChanges === 0) {
        return null;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <AlertCircle size={16} className={styles.icon} />
                <span className={styles.title}>Несохранённые изменения</span>
            </div>

            <div className={styles.stats}>
                {stats.create > 0 && (
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Создано:</span>
                        <span className={styles.statValue}>{stats.create}</span>
                    </div>
                )}
                {stats.update > 0 && (
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Обновлено:</span>
                        <span className={styles.statValue}>{stats.update}</span>
                    </div>
                )}
                {stats.delete > 0 && (
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Удалено:</span>
                        <span className={styles.statValue}>{stats.delete}</span>
                    </div>
                )}
                {stats.batch > 0 && (
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Батчей:</span>
                        <span className={styles.statValue}>{stats.batch}</span>
                    </div>
                )}
            </div>

            <div className={styles.actions}>
                <button className={styles.saveBtn} onClick={handleSave} title="Сохранить изменения">
                    <Save size={16} />
                    <span>Сохранить</span>
                </button>

                <button className={styles.discardBtn} onClick={handleDiscard} title="Отменить все изменения">
                    <X size={16} />
                </button>
            </div>

            <div className={styles.historyInfo}>
                История: {historySize} операций
            </div>
        </div>
    );
};