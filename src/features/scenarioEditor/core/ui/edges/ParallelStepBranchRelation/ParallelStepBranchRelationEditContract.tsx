// src/features/scenarioEditor/core/ui/edges/ParallelStepBranchRelation/ParallelStepBranchRelationEditContract.tsx

import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/baseStore/store';
import type { EdgeEditContract, EdgeRenderContentParams } from '@scenario/core/ui/nodes/components/NodeEditModal/types.ts';
import type { ParallelStepBranchRelationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepBranchRelations/Parallel/ParallelStepBranchRelationDto';
import { Block } from '@scenario/core/features/fieldLockSystem';
import { selectActiveScenarioId, selectStepById, selectBranchById } from '@scenario/store/scenarioSelectors';
import { EdgePathTypeSelector } from '@scenario/core/ui/edges/components/EdgePathTypeSelector/EdgePathTypeSelector';
import EdgePathType, { DefaultEdgePathType } from '@scenario/core/types/EdgePathType';
import styles from './ParallelStepBranchRelationEditContract.module.css';

/**
 * Компонент содержимого для редактирования ParallelStepBranchRelation
 */
function ParallelStepBranchRelationEditContent({ /*edge*/ dto, onChange }: EdgeRenderContentParams<ParallelStepBranchRelationDto>) {
    const [edgePathType, setEdgePathType] = useState<EdgePathType>(dto.edgePathType ?? DefaultEdgePathType.branchLink);
    const activeScenarioId = useSelector(selectActiveScenarioId);

    // Получаем информацию о parallel-шаге и ветке
    const parallelStep = useSelector((state: RootState) =>
        activeScenarioId ? selectStepById(state, activeScenarioId, dto.parallelStepId) : undefined
    );

    const branch = useSelector((state: RootState) =>
        activeScenarioId ? selectBranchById(state, activeScenarioId, dto.branchId) : undefined
    );

    const handleEdgePathTypeChange = (newEdgePathType: EdgePathType) => {
        setEdgePathType(newEdgePathType);
        onChange({ edgePathType: newEdgePathType });
    };

    return (
        <div className={styles.container}>
            {/* Информация о связи */}
            <Block
                group="parallelBranchRelationInfo"
                label="Информация о связи"
                description="Связь между parallel-шагом и веткой"
                mode="wrap"
            >
                <div className={styles.infoGrid}>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>ID связи:</span>
                        <code className={styles.infoValue}>{dto.id}</code>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Parallel-шаг:</span>
                        <span className={styles.stepName}>{parallelStep?.name || 'Неизвестный шаг'}</span>
                        <code className={styles.stepId}>({dto.parallelStepId})</code>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Параллельная ветка:</span>
                        <span className={styles.branchName}>{branch?.name || 'Неизвестная ветка'}</span>
                        <code className={styles.stepId}>({dto.branchId})</code>
                    </div>
                </div>
            </Block>

            {/* Описание */}
            <div className={styles.description}>
                <p>
                    Эта связь определяет ветку, которая будет запущена параллельно с основным потоком выполнения.
                </p>
                <p>
                    Все ветки, связанные с parallel-шагом, выполняются одновременно.
                </p>
            </div>

            {/* Тип визуального пути */}
            <Block
                group="parallelBranchRelationPathType"
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
 * Контракт редактирования для ParallelStepBranchRelation
 */
export const ParallelStepBranchRelationEditContract: EdgeEditContract<ParallelStepBranchRelationDto> = {
    title: 'Редактирование параллельной ветки',
    width: 600,

    renderContent: (params) => <ParallelStepBranchRelationEditContent {...params} />,

    validate: () => {
        // Для параллельных связей нет редактируемых полей, всегда валидно
        return [];
    },
};
