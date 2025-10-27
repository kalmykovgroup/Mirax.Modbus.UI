// src/features/scenarioEditor/core/ui/map/components/PreviewOperationsButton/OperationsPreviewModal.tsx

import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import type { ScenarioOperationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/ScenarioOperationDto';
import { formatOperationForDisplay } from '@scenario/core/features/saveSystem/operationBuilder';
import styles from './OperationsPreviewModal.module.css';

interface OperationsPreviewModalProps {
    operations: ScenarioOperationDto[];
    onClose: () => void;
}

export function OperationsPreviewModal({ operations, onClose }: OperationsPreviewModalProps) {
    const [activeTab, setActiveTab] = useState<'list' | 'json'>('list');
    const [copied, setCopied] = useState(false);

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
                        className={`${styles.tab} ${activeTab === 'list' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('list')}
                    >
                        Список ({operations.length})
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'json' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('json')}
                    >
                        JSON
                    </button>
                </div>

                <div className={styles.content}>
                    {activeTab === 'list' && (
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
