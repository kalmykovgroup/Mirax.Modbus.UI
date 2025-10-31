// src/features/scenarioEditor/core/ui/map/components/PreviewOperationsButton/OperationsPreviewModal.tsx

import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/baseStore/store.ts';
import type { ScenarioOperationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/ScenarioOperationDto.ts';
import { formatOperationForDisplay } from '@scenario/core/features/saveSystem/operationBuilder.ts';
import { buildOperationsDiff } from '@scenario/core/features/saveSystem/operationDiffBuilder.ts';
import { ChangeItem } from '@scenario/core/features/saveSystem/components/ChangeItem/ChangeItem.tsx';
import { DiffViewer } from '@scenario/core/features/saveSystem/components/DiffViewer/DiffViewer.tsx';
import type { OperationDiff } from '@scenario/core/features/saveSystem/operationDiffBuilder.ts';
import type { Guid } from '@app/lib/types/Guid.ts';
import styles from './OperationsPreviewModal.module.css';

interface OperationsPreviewModalProps {
    operations: ScenarioOperationDto[];
    scenarioId: Guid | null;
    onClose: () => void;
}

export function OperationsPreviewModal({ operations, scenarioId, onClose }: OperationsPreviewModalProps) {
    const [activeTab, setActiveTab] = useState<'diff' | 'json'>('diff');
    const [copied, setCopied] = useState(false);
    const [selectedChange, setSelectedChange] = useState<OperationDiff | null>(null);

    // Получаем историю для построения diff
    const historyContext = useSelector((state: RootState) =>
        scenarioId ? state.history.contexts[scenarioId] : null
    );

    // Строим diff для операций
    const changes = historyContext
        ? buildOperationsDiff(operations, historyContext.past, historyContext.lastSyncedIndex)
        : [];

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(operations, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3>Предпросмотр изменений</h3>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'diff' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('diff')}
                    >
                        Изменения ({operations.length})
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'json' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('json')}
                    >
                        JSON
                    </button>
                </div>

                <div className={styles.content}>
                    {activeTab === 'diff' && (
                        <div className={styles.diffView}>
                            {/* Левая панель: список изменений */}
                            <div className={styles.changesList}>
                                {changes.length > 0 ? (
                                    changes.map((change) => (
                                        <ChangeItem
                                            key={change.opId}
                                            change={change}
                                            isSelected={selectedChange?.opId === change.opId}
                                            onClick={() => setSelectedChange(change)}
                                        />
                                    ))
                                ) : (
                                    <div className={styles.list}>
                                        {operations.map((op, index) => (
                                            <div key={op.opId || index} className={styles.listItem}>
                                                <div className={styles.listItemNumber}>{index + 1}</div>
                                                <div className={styles.listItemText}>
                                                    {formatOperationForDisplay(op)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
                    )}

                    {activeTab === 'json' && (
                        <div className={styles.jsonContainer}>
                            <pre className={styles.json}>
                                {JSON.stringify(operations, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button className={styles.copyButton} onClick={handleCopy}>
                        {copied ? (
                            <>
                                <Check size={16} />
                                Скопировано!
                            </>
                        ) : (
                            <>
                                <Copy size={16} />
                                Скопировать JSON
                            </>
                        )}
                    </button>
                    <button className={styles.closeButtonFooter} onClick={onClose}>
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
}
