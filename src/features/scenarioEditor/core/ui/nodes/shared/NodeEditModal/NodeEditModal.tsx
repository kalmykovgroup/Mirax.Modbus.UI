// src/features/scenarioEditor/core/ui/nodes/shared/NodeEditModal/NodeEditModal.tsx

import { useState, useEffect, useMemo } from 'react';
import { X, Save } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';
import type { NodeEditContract } from './types';
import { selectAllGroups, selectIsGroupLocked, selectGlobalLock } from '@scenario/core/features/fieldLockSystem';
import { selectIsLocked } from '@scenario/core/features/lockSystem/lockSlice';
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
    const [originalDto] = useState(node.data.object);

    // Селекторы для проверки блокировок
    const allGroups = useSelector(selectAllGroups);
    const scenarioLock = useSelector(selectIsLocked);
    const globalLock = useSelector(selectGlobalLock);

    // Сброс состояния при изменении ноды
    useEffect(() => {
        setDraftDto(node.data.object);
        setValidationErrors([]);
    }, [node]);

    // Проверка изменений: сравниваем draftDto с originalDto
    const hasChanges = useMemo(() => {
        return JSON.stringify(draftDto) !== JSON.stringify(originalDto);
    }, [draftDto, originalDto]);

    // Проверка: все ли группы заблокированы
    const allGroupsLocked = useMemo(() => {
        // Если глобальная блокировка или блокировка карты активна - все заблокировано
        if (scenarioLock || globalLock) return true;

        // Проверяем все зарегистрированные группы
        const groupIds = Object.keys(allGroups);
        if (groupIds.length === 0) return false; // Нет групп - не блокируем

        // Проверяем каждую группу на блокировку
        return groupIds.every((groupId) => {
            const group = allGroups[groupId];
            // Группа заблокирована если state === 'locked' или глобальная блокировка
            return group.state === 'locked' || scenarioLock || globalLock;
        });
    }, [allGroups, scenarioLock, globalLock]);

    const handleChange = (updates: Partial<any>) => {
        setDraftDto((prev: any) => ({ ...prev, ...updates }));
        // Очищаем ошибки валидации при изменении
        setValidationErrors([]);
    };

    const handleSave = () => {
        // Не сохраняем если нет изменений
        if (!hasChanges) {
            console.log('[NodeEditModal] No changes detected, skipping save');
            onCancel();
            return;
        }

        // Валидация перед сохранением
        if (contract.validate) {
            const errors = contract.validate(draftDto);
            if (errors.length > 0) {
                setValidationErrors(errors);
                return;
            }
        }

        console.log('[NodeEditModal] Saving changes', { originalDto, draftDto });
        onSave(node, draftDto);
    };

    // Определяем можно ли сохранять: есть изменения И не все поля заблокированы
    const canSave = hasChanges && !allGroupsLocked;

    // Определяем сообщение для тултипа
    const getSaveTooltip = () => {
        if (allGroupsLocked) return 'Все поля заблокированы';
        if (!hasChanges) return 'Нет изменений для сохранения';
        return 'Сохранить изменения';
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
                        disabled={!canSave}
                        title={getSaveTooltip()}
                    >
                        <Save size={16} />
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
}
