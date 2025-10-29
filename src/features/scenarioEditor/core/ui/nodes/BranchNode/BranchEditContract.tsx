// src/features/scenarioEditor/core/ui/nodes/BranchNode/BranchEditContract.tsx

import { useState } from 'react';
import type { NodeEditContract } from '@scenario/core/ui/nodes/shared/NodeEditModal/types';
import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto';
import { Block } from '@scenario/core/features/fieldLockSystem';

/**
 * Контракт редактирования для Branch (Ветка)
 */
export const BranchEditContract: NodeEditContract<BranchDto> = {
    title: 'Редактирование ветки',
    width: 600,

    renderContent: ({ dto, onChange }) => {
        const [name, setName] = useState(dto.name);
        const [description, setDescription] = useState(dto.description);
        const [waitForCompletion, setWaitForCompletion] = useState(dto.waitForCompletion);
        const [conditionExpression, setConditionExpression] = useState(dto.conditionExpression || '');
        const [conditionOrder, setConditionOrder] = useState(dto.conditionOrder);

        const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newName = e.target.value;
            setName(newName);
            onChange({ name: newName });
        };

        const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newDescription = e.target.value;
            setDescription(newDescription);
            onChange({ description: newDescription });
        };

        const handleWaitForCompletionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = e.target.checked;
            setWaitForCompletion(newValue);
            onChange({ waitForCompletion: newValue });
        };

        const handleConditionExpressionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newExpression = e.target.value;
            setConditionExpression(newExpression);
            onChange({ conditionExpression: newExpression || null });
        };

        const handleConditionOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newOrder = parseInt(e.target.value, 10);
            setConditionOrder(newOrder);
            onChange({ conditionOrder: isNaN(newOrder) ? 0 : newOrder });
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px' }}>
                {/* Название */}
                <Block
                    group="branchBasicInfo"
                    label="Основная информация"
                    description="Название и описание ветки"
                    mode="wrap"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label htmlFor="branch-name" style={{ fontWeight: 500, fontSize: '14px' }}>
                            Название ветки
                        </label>
                        <input
                            id="branch-name"
                            type="text"
                            value={name}
                            onChange={handleNameChange}
                            placeholder="Введите название ветки"
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px',
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label htmlFor="branch-description" style={{ fontWeight: 500, fontSize: '14px' }}>
                            Описание
                        </label>
                        <textarea
                            id="branch-description"
                            value={description}
                            onChange={handleDescriptionChange}
                            placeholder="Введите описание ветки"
                            rows={3}
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px',
                                resize: 'vertical',
                            }}
                        />
                    </div>
                </Block>

                {/* Ждать завершения (для параллельных веток) */}
                {dto.parallelStepId && (
                    <Block
                        group="branchParallelSettings"
                        label="Настройки параллельного выполнения"
                        description="Параметры для параллельных веток"
                        mode="wrap"
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                id="branch-wait"
                                type="checkbox"
                                checked={waitForCompletion}
                                onChange={handleWaitForCompletionChange}
                                style={{ width: '16px', height: '16px' }}
                            />
                            <label htmlFor="branch-wait" style={{ fontSize: '14px', cursor: 'pointer' }}>
                                Ждать завершения параллельной ветки
                            </label>
                        </div>
                    </Block>
                )}

                {/* Условие выполнения (для веток с условием) */}
                {dto.conditionStepId && (
                    <Block
                        group="branchConditionSettings"
                        label="Настройки условного выполнения"
                        description="Условие и приоритет проверки для условных веток"
                        mode="wrap"
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label htmlFor="branch-condition" style={{ fontWeight: 500, fontSize: '14px' }}>
                                Условие выполнения
                            </label>
                            <textarea
                                id="branch-condition"
                                value={conditionExpression}
                                onChange={handleConditionExpressionChange}
                                placeholder="Введите условие (например: x > 10)"
                                rows={2}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    fontFamily: 'monospace',
                                    resize: 'vertical',
                                }}
                            />
                            <span style={{ fontSize: '12px', color: '#666' }}>
                                Выражение для проверки условия перехода по ветке
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label htmlFor="branch-order" style={{ fontWeight: 500, fontSize: '14px' }}>
                                Приоритет проверки условия
                            </label>
                            <input
                                id="branch-order"
                                type="number"
                                value={conditionOrder}
                                onChange={handleConditionOrderChange}
                                min={0}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    width: '120px',
                                }}
                            />
                            <span style={{ fontSize: '12px', color: '#666' }}>
                                Порядок проверки условий (меньше = выше приоритет)
                            </span>
                        </div>
                    </Block>
                )}

                {/* Информация об ID */}
                <div style={{
                    padding: '12px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#666'
                }}>
                    <div><strong>ID:</strong> {dto.id}</div>
                    <div><strong>Сценарий:</strong> {dto.scenarioId}</div>
                    {dto.parallelStepId && <div><strong>Параллельный шаг:</strong> {dto.parallelStepId}</div>}
                    {dto.conditionStepId && <div><strong>Условный шаг:</strong> {dto.conditionStepId}</div>}
                </div>
            </div>
        );
    },

    validate: (dto) => {
        const errors: string[] = [];

        if (!dto.name || dto.name.trim().length === 0) {
            errors.push('Название ветки не может быть пустым');
        }

        if (dto.conditionStepId && dto.conditionExpression && dto.conditionExpression.trim().length === 0) {
            errors.push('Условие выполнения не может быть пустым для условной ветки');
        }

        return errors;
    },
};
