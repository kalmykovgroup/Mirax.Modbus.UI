// src/features/scenarioEditor/core/features/saveSystem/components/ChangesPreviewPanel/ChangesPreviewPanel.tsx

import React, { useState } from 'react';
import { useSavePreview } from '../../useSavePreview';
import { ChangeItem } from '../ChangeItem/ChangeItem';
import { DiffViewer } from '../DiffViewer/DiffViewer';
import type { Guid } from '@app/lib/types/Guid';
import type { OperationDiff } from '../../operationDiffBuilder';
import styles from './ChangesPreviewPanel.module.css';

export interface ChangesPreviewPanelProps {
    scenarioId: Guid | null;
    onClose?: () => void;
}

export const ChangesPreviewPanel: React.FC<ChangesPreviewPanelProps> = ({ scenarioId, onClose }) => {
    const { changes, changesCount } = useSavePreview(scenarioId);
    const [selectedChange, setSelectedChange] = useState<OperationDiff | null>(null);

    if (changesCount === 0) {
        return (
            <div className={styles.panel}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Предпросмотр изменений</h3>
                    {onClose && (
                        <button className={styles.closeBtn} onClick={onClose} title="Закрыть">
                            ✕
                        </button>
                    )}
                </div>
                <div className={styles.empty}>
                    Нет несохраненных изменений
                </div>
            </div>
        );
    }

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <h3 className={styles.title}>
                    Предпросмотр изменений ({changesCount})
                </h3>
                {onClose && (
                    <button className={styles.closeBtn} onClick={onClose} title="Закрыть">
                        ✕
                    </button>
                )}
            </div>

            <div className={styles.content}>
                {/* Левая панель: список изменений */}
                <div className={styles.changesList}>
                    {changes.map((change) => (
                        <ChangeItem
                            key={change.opId}
                            change={change}
                            isSelected={selectedChange?.opId === change.opId}
                            onClick={() => setSelectedChange(change)}
                        />
                    ))}
                </div>

                {/* Правая панель: детальный diff */}
                <div className={styles.diffPanel}>
                    {selectedChange ? (
                        <DiffViewer diff={selectedChange} />
                    ) : (
                        <div className={styles.diffPlaceholder}>
                            Выберите изменение для просмотра деталей
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
