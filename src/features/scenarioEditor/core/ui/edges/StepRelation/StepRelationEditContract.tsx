// src/features/scenarioEditor/core/ui/edges/StepRelation/StepRelationEditContract.tsx

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/baseStore/store';
import type { EdgeEditContract, EdgeRenderContentParams } from '@scenario/core/ui/nodes/components/NodeEditModal/types.ts';
import type { StepRelationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepRelations/StepRelationDto';
import { Block } from '@scenario/core/features/fieldLockSystem';
import { selectActiveScenarioId, selectStepById } from '@scenario/store/scenarioSelectors';
import { EdgePathTypeSelector } from '@scenario/core/ui/edges/components/EdgePathTypeSelector/EdgePathTypeSelector';
import EdgePathType, { DefaultEdgePathType } from '@scenario/core/types/EdgePathType';
import styles from './StepRelationEditContract.module.css';

/**
 * Компонент содержимого для редактирования StepRelation
 */
function StepRelationEditContent({ /*edge*/ dto, onChange }: EdgeRenderContentParams<StepRelationDto>) {
    const [conditionExpression, setConditionExpression] = useState(dto.conditionExpression || '');
    const [conditionOrder, setConditionOrder] = useState(dto.conditionOrder);
    const [edgePathType, setEdgePathType] = useState<EdgePathType>(dto.edgePathType ?? DefaultEdgePathType.step);

    const activeScenarioId = useSelector(selectActiveScenarioId);

    // Получаем информацию о родительском и дочернем шагах
    const parentStep = useSelector((state: RootState) =>
        activeScenarioId ? selectStepById(state, activeScenarioId, dto.parentStepId) : undefined
    );

    const childStep = useSelector((state: RootState) =>
        activeScenarioId ? selectStepById(state, activeScenarioId, dto.childStepId) : undefined
    );

    const handleConditionExpressionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newExpression = e.target.value;
        setConditionExpression(newExpression);
        onChange({ conditionExpression: newExpression || undefined });
    };

    const handleConditionOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newOrder = parseInt(e.target.value, 10);
        setConditionOrder(isNaN(newOrder) ? 0 : newOrder);
        onChange({ conditionOrder: isNaN(newOrder) ? 0 : newOrder });
    };

    const handleEdgePathTypeChange = (newEdgePathType: EdgePathType) => {
        setEdgePathType(newEdgePathType);
        onChange({ edgePathType: newEdgePathType });
    };

    return (
        <div className={styles.container}>
            {/* Информация о связи */}
            <Block
                group="stepRelationInfo"
                label="Информация о связи"
                description="Связь между шагами сценария"
                mode="wrap"
            >
                <div className={styles.infoGrid}>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>ID связи:</span>
                        <code className={styles.infoValue}>{dto.id}</code>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>От шага:</span>
                        <span className={styles.stepName}>{parentStep?.name || 'Неизвестный шаг'}</span>
                        <code className={styles.stepId}>({dto.parentStepId})</code>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>К шагу:</span>
                        <span className={styles.stepName}>{childStep?.name || 'Неизвестный шаг'}</span>
                        <code className={styles.stepId}>({dto.childStepId})</code>
                    </div>
                </div>
            </Block>

            {/* Условие перехода */}
            <Block
                group="stepRelationCondition"
                label="Условие перехода"
                description="Условие, при котором срабатывает этот переход"
                mode="wrap"
            >
                <div className={styles.fieldGroup}>
                    <label htmlFor="condition-expression" className={styles.label}>
                        Условное выражение
                    </label>
                    <textarea
                        id="condition-expression"
                        value={conditionExpression}
                        onChange={handleConditionExpressionChange}
                        placeholder="Например: x > 10 (оставьте пустым для дефолтного перехода)"
                        rows={3}
                        className={styles.textarea}
                    />
                    <span className={styles.hint}>
                        Если пустое или null — это дефолтный переход
                    </span>
                </div>

                <div className={styles.fieldGroup}>
                    <label htmlFor="condition-order" className={styles.label}>
                        Приоритет проверки
                    </label>
                    <input
                        id="condition-order"
                        type="number"
                        value={conditionOrder}
                        onChange={handleConditionOrderChange}
                        min={0}
                        className={styles.input}
                    />
                    <span className={styles.hint}>
                        Меньше значение = выше приоритет проверки условия
                    </span>
                </div>
            </Block>

            {/* Тип визуального пути */}
            <Block
                group="stepRelationPathType"
                label="Визуальный стиль линии"
                description="Выберите как отображать линию связи на схеме"
                mode="wrap"
            >
                <EdgePathTypeSelector
                    value={edgePathType}
                    onChange={handleEdgePathTypeChange}
                    label="Тип линии"
                />
            </Block>
        </div>
    );
}

/**
 * Контракт редактирования для StepRelation
 */
export const StepRelationEditContract: EdgeEditContract<StepRelationDto> = {
    title: 'Редактирование связи между шагами',
    width: 600,

    renderContent: (params) => <StepRelationEditContent {...params} />,

    validate: (dto) => {
        const errors: string[] = [];

        // Валидация приоритета
        if (dto.conditionOrder < 0) {
            errors.push('Приоритет не может быть отрицательным');
        }

        return errors;
    },
};
