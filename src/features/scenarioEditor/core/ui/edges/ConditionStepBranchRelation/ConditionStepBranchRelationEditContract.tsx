// src/features/scenarioEditor/core/ui/edges/ConditionStepBranchRelation/ConditionStepBranchRelationEditContract.tsx

import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/baseStore/store';
import type { EdgeEditContract, EdgeRenderContentParams } from '@scenario/core/ui/nodes/components/NodeEditModal/types.ts';
import type { ConditionStepBranchRelationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepBranchRelations/Condition/ConditionStepBranchRelationDto';
import { Block } from '@scenario/core/features/fieldLockSystem';
import { selectActiveScenarioId, selectStepById, selectBranchById } from '@scenario/store/scenarioSelectors';
import styles from './ConditionStepBranchRelationEditContract.module.css';

/**
 * Компонент содержимого для редактирования ConditionStepBranchRelation
 */
function ConditionStepBranchRelationEditContent({ edge, dto, onChange }: EdgeRenderContentParams<ConditionStepBranchRelationDto>) {
    const [conditionExpression, setConditionExpression] = useState(dto.conditionExpression || '');
    const [conditionOrder, setConditionOrder] = useState(dto.conditionOrder);

    const activeScenarioId = useSelector(selectActiveScenarioId);

    // Получаем информацию о condition-шаге и ветке
    const conditionStep = useSelector((state: RootState) =>
        activeScenarioId ? selectStepById(state, activeScenarioId, dto.conditionStepId) : undefined
    );

    const branch = useSelector((state: RootState) =>
        activeScenarioId ? selectBranchById(state, activeScenarioId, dto.branchId) : undefined
    );

    const handleConditionExpressionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newExpression = e.target.value;
        setConditionExpression(newExpression);
        onChange({ conditionExpression: newExpression || null });
    };

    const handleConditionOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newOrder = parseInt(e.target.value, 10);
        setConditionOrder(isNaN(newOrder) ? 0 : newOrder);
        onChange({ conditionOrder: isNaN(newOrder) ? 0 : newOrder });
    };

    return (
        <div className={styles.container}>
            {/* Информация о связи */}
            <Block
                group="conditionBranchRelationInfo"
                label="Информация о связи"
                description="Связь между condition-шагом и веткой"
                mode="wrap"
            >
                <div className={styles.infoGrid}>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>ID связи:</span>
                        <code className={styles.infoValue}>{dto.id}</code>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Condition-шаг:</span>
                        <span className={styles.stepName}>{conditionStep?.name || 'Неизвестный шаг'}</span>
                        <code className={styles.stepId}>({dto.conditionStepId})</code>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Целевая ветка:</span>
                        <span className={styles.branchName}>{branch?.name || 'Неизвестная ветка'}</span>
                        <code className={styles.stepId}>({dto.branchId})</code>
                    </div>
                </div>
            </Block>

            {/* Условие перехода */}
            <Block
                group="conditionBranchRelationCondition"
                label="Условие перехода на ветку"
                description="Условие, при котором происходит переход на ветку"
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
                        placeholder="Например: x > 10 (оставьте пустым для дефолтной ветки)"
                        rows={3}
                        className={styles.textarea}
                    />
                    <span className={styles.hint}>
                        Если пустое или null — это дефолтная ветка
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
                        Меньше значение = выше приоритет (проверяется раньше)
                    </span>
                </div>
            </Block>
        </div>
    );
}

/**
 * Контракт редактирования для ConditionStepBranchRelation
 */
export const ConditionStepBranchRelationEditContract: EdgeEditContract<ConditionStepBranchRelationDto> = {
    title: 'Редактирование условного перехода на ветку',
    width: 600,

    renderContent: (params) => <ConditionStepBranchRelationEditContent {...params} />,

    validate: (dto) => {
        const errors: string[] = [];

        if (dto.conditionOrder < 0) {
            errors.push('Приоритет не может быть отрицательным');
        }

        return errors;
    },
};
