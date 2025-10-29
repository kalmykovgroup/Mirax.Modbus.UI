// src/features/scenarioEditor/core/ui/nodes/shared/NodeEditModal/NodeEditModal.tsx

import { useState, useEffect, useMemo } from 'react';
import { X, Save } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { Edge } from '@xyflow/react';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';
import type { NodeEditContract, EdgeEditContract } from './types';
import { selectAllGroups, selectIsGroupLocked, selectGlobalLock } from '@scenario/core/features/fieldLockSystem';
import { selectIsLocked } from '@scenario/core/features/lockSystem/lockSlice';
import styles from './NodeEditModal.module.css';

interface NodeEditModalProps {
    node?: FlowNode;
    edge?: Edge;
    contract: NodeEditContract | EdgeEditContract;
    onSave: (nodeOrEdge: FlowNode | Edge, updatedDto: any) => void;
    onCancel: () => void;
    stackDepth?: number;
    isTopmost?: boolean;
}

export function NodeEditModal({ node, edge, contract, onSave, onCancel, stackDepth = 0, isTopmost = true }: NodeEditModalProps) {
    // Определяем начальный DTO в зависимости от того, что редактируем
    const initialDto = node ? node.data.object : edge?.data?.relationDto;

    const [draftDto, setDraftDto] = useState(initialDto);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [originalDto] = useState(initialDto);

    // Селекторы для проверки блокировок
    const allGroups = useSelector(selectAllGroups);
    const scenarioLock = useSelector(selectIsLocked);
    const globalLock = useSelector(selectGlobalLock);

    // Сброс состояния при изменении ноды или edge
    useEffect(() => {
        const newDto = node ? node.data.object : edge?.data?.relationDto;
        setDraftDto(newDto);
        setValidationErrors([]);
    }, [node, edge]);

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
        onSave((node || edge)!, draftDto);
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
    const defaultTitle = node ? 'Редактирование ноды' : 'Редактирование связи';
    const title = contract.title || defaultTitle;

    // Смещение для вложенных окон
    const offsetX = stackDepth * 30;
    const offsetY = stackDepth * 30;

    // Затемнение фона только для верхнего окна
    const overlayOpacity = isTopmost ? 0.5 : 0;

    return (
        <div
            className={styles.overlay}
            onClick={handleOverlayClick}
            style={{
                backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
                pointerEvents: isTopmost ? 'auto' : 'none',
            }}
        >
            <div
                className={styles.modal}
                data-stack-depth={stackDepth}
                data-is-topmost={isTopmost}
                style={{
                    width: modalWidth,
                    transform: `translate(${offsetX}px, ${offsetY}px)`,
                    pointerEvents: 'auto',
                }}
            >
                {/* Header */}
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 className={styles.title}>{title}</h2>
                        {stackDepth > 0 && (
                            <span
                                style={{
                                    fontSize: '12px',
                                    color: '#888',
                                    background: '#2a2a2a',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                }}
                                title={`Глубина вложенности: ${stackDepth + 1}`}
                            >
                                Уровень {stackDepth + 1}
                            </span>
                        )}
                    </div>
                    <button
                        className={styles.closeButton}
                        onClick={handleCancel}
                        title={stackDepth > 0 ? 'Вернуться назад' : 'Закрыть'}
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

                    {node
                        ? contract.renderContent({
                              node,
                              dto: draftDto,
                              onChange: handleChange,
                          })
                        : contract.renderContent({
                              edge: edge!,
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
