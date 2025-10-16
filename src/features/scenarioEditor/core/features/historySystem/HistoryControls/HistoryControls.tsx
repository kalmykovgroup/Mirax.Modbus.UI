// src/features/scenarioEditor/ui/HistoryControls/HistoryControls.tsx

import React, { useCallback, useEffect } from 'react';
import { Undo2, Redo2, RotateCcw } from 'lucide-react';
import styles from './HistoryControls.module.css';
import {useHistory} from "@scenario/core/features/historySystem/useHistory.ts";

interface HistoryControlsProps {
    readonly contextId: string;
}

export const HistoryControls: React.FC<HistoryControlsProps> = ({ contextId }) => {
    const { canUndo, canRedo, historySize, lastCommand, undo, redo, clear } = useHistory(contextId, {
        autoInit: true,
        config: {
            maxHistorySize: 100,
            enableBatching: true,
        },
    });

    // Горячие клавиши
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+Z (Cmd+Z на Mac) - Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (canUndo) undo();
            }

            // Ctrl+Shift+Z (Cmd+Shift+Z на Mac) - Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                if (canRedo) redo();
            }

            // Альтернативный Redo: Ctrl+Y
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                if (canRedo) redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canUndo, canRedo, undo, redo]);

    const handleClear = useCallback(() => {
        if (window.confirm('Очистить всю историю? Это действие необратимо.')) {
            clear();
        }
    }, [clear]);

    return (
        <div className={styles.container}>
            <button
                className={styles.btn}
                onClick={undo}
                disabled={!canUndo}
                title={`Отменить (Ctrl+Z)${lastCommand ? ` - ${lastCommand.description || lastCommand.type}` : ''}`}
            >
                <Undo2 size={18} />
                <span className={styles.label}>Отменить</span>
            </button>

            <button
                className={styles.btn}
                onClick={redo}
                disabled={!canRedo}
                title="Повторить (Ctrl+Shift+Z или Ctrl+Y)"
            >
                <Redo2 size={18} />
                <span className={styles.label}>Повторить</span>
            </button>

            <div className={styles.divider} />

            <div className={styles.info}>
                <span className={styles.count}>{historySize}</span>
            </div>

            {historySize > 0 && (
                <button
                    className={`${styles.btn} ${styles.clearBtn}`}
                    onClick={handleClear}
                    title="Очистить историю"
                >
                    <RotateCcw size={16} />
                </button>
            )}
        </div>
    );
};