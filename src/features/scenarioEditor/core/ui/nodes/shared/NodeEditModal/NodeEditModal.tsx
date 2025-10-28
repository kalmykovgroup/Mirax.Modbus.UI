// src/features/scenarioEditor/core/ui/nodes/shared/NodeEditModal/NodeEditModal.tsx

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';
import type { NodeEditContract } from './types';
import styles from './NodeEditModal.module.css';

interface NodeEditModalProps {
    node: FlowNode;
    contract: NodeEditContract;
    onSave: (node: FlowNode, updatedDto: any) => void;
    onCancel: () => void;
}

export function NodeEditModal({ node, contract, onSave, onCancel }: NodeEditModalProps) {
    const [draftDto, setDraftDto] = useState(node.data.object);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Сброс состояния при изменении ноды
    useEffect(() => {
        setDraftDto(node.data.object);
        setValidationErrors([]);
    }, [node]);

    const handleChange = (updates: Partial<any>) => {
        setDraftDto((prev: any) => ({ ...prev, ...updates }));
        // Очищаем ошибки валидации при изменении
        setValidationErrors([]);
    };

    const handleSave = () => {
        // Валидация перед сохранением
        if (contract.validate) {
            const errors = contract.validate(draftDto);
            if (errors.length > 0) {
                setValidationErrors(errors);
                return;
            }
        }

        onSave(node, draftDto);
    };

    const handleCancel = () => {
        onCancel();
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleCancel();
        }
    };

    const modalWidth = contract.width || 600;
    const title = contract.title || 'Редактирование ноды';

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal} style={{ width: modalWidth }}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>{title}</h2>
                    <button
                        className={styles.closeButton}
                        onClick={handleCancel}
                        title="Закрыть"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {validationErrors.length > 0 && (
                        <div className={styles.errorMessage}>
                            <strong>Ошибки валидации:</strong>
                            <ul className={styles.errorList}>
                                {validationErrors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {contract.renderContent({
                        node,
                        dto: draftDto,
                        onChange: handleChange,
                    })}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button
                        className={`${styles.button} ${styles.cancelButton}`}
                        onClick={handleCancel}
                    >
                        Отмена
                    </button>
                    <button
                        className={`${styles.button} ${styles.saveButton}`}
                        onClick={handleSave}
                    >
                        <Save size={16} />
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
}
