// src/features/scenarioEditor/core/ui/nodes/shared/SystemInfoPanel/SystemInfoPanel.tsx

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/baseStore/store';
import type { Guid } from '@app/lib/types/Guid';
import type { StepRelationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepRelations/StepRelationDto';
import { selectStepById, selectRelationById } from '@scenario/store/scenarioSelectors';
import styles from './SystemInfoPanel.module.css';

interface SystemInfoPanelProps {
    /** ID сценария */
    scenarioId: Guid;
    /** ID текущего шага */
    stepId: Guid;
    /** Тип шага */
    stepType: string;
    /** Координаты */
    position: { x: number; y: number };
    /** Размеры */
    size: { width: number; height: number };
    /** Входящие связи */
    parentRelations?: StepRelationDto[];
    /** Исходящие связи */
    childRelations?: StepRelationDto[];
    /** Дополнительная информация (опционально) */
    additionalInfo?: React.ReactNode;
}

export function SystemInfoPanel({
    scenarioId,
    stepId,
    stepType,
    position,
    size,
    parentRelations = [],
    childRelations = [],
    additionalInfo,
}: SystemInfoPanelProps) {
    // Получаем информацию о родительских шагах и связях
    const parentStepsInfo = useSelector((state: RootState) =>
        parentRelations.map((rel) => ({
            relation: rel,
            step: selectStepById(state, scenarioId, rel.parentStepId),
        }))
    );

    // Получаем информацию о дочерних шагах и связях
    const childStepsInfo = useSelector((state: RootState) =>
        childRelations.map((rel) => ({
            relation: rel,
            step: selectStepById(state, scenarioId, rel.childStepId),
        }))
    );

    return (
        <div className={styles.systemInfoPanel}>
            <div className={styles.header}>
                Системная информация (только чтение)
            </div>

            <div className={styles.grid}>
                <div className={styles.label}>ID:</div>
                <div className={styles.value}>{stepId}</div>

                <div className={styles.label}>Тип:</div>
                <div className={styles.value}>{stepType}</div>

                <div className={styles.label}>Позиция:</div>
                <div className={styles.value}>
                    x: {Math.round(position.x)}, y: {Math.round(position.y)}
                </div>

                <div className={styles.label}>Размер:</div>
                <div className={styles.value}>
                    {size.width} × {size.height} px
                </div>

                <div className={styles.label}>Входящие связи:</div>
                <div className={styles.value}>{parentRelations.length} шт.</div>

                <div className={styles.label}>Исходящие связи:</div>
                <div className={styles.value}>{childRelations.length} шт.</div>
            </div>

            {/* Дополнительная информация */}
            {additionalInfo && (
                <div className={styles.additionalInfo}>
                    {additionalInfo}
                </div>
            )}

            {/* Детали входящих связей */}
            {parentStepsInfo.length > 0 && (
                <div className={styles.relationsSection}>
                    <div className={styles.relationsSectionTitle}>
                        Входящие связи:
                    </div>
                    <div className={styles.relationsList}>
                        {parentStepsInfo.map(({ relation, step }, idx) => (
                            <div key={relation.id} className={styles.relationItem}>
                                <div className={styles.relationNumber}>{idx + 1}.</div>
                                <div className={styles.relationDetails}>
                                    <div className={styles.relationStep}>
                                        <span className={styles.relationLabel}>От шага:</span>{' '}
                                        <span className={styles.relationStepName}>
                                            {step?.name || 'Неизвестный шаг'}
                                        </span>
                                        <span className={styles.relationStepId}>({relation.parentStepId})</span>
                                    </div>
                                    {relation.conditionExpression && (
                                        <div className={styles.relationCondition}>
                                            <span className={styles.relationLabel}>Условие:</span>{' '}
                                            <code className={styles.conditionCode}>
                                                {relation.conditionExpression}
                                            </code>
                                        </div>
                                    )}
                                    {relation.conditionOrder !== undefined && relation.conditionOrder > 0 && (
                                        <div className={styles.relationOrder}>
                                            <span className={styles.relationLabel}>Приоритет:</span>{' '}
                                            {relation.conditionOrder}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Детали исходящих связей */}
            {childStepsInfo.length > 0 && (
                <div className={styles.relationsSection}>
                    <div className={styles.relationsSectionTitle}>
                        Исходящие связи:
                    </div>
                    <div className={styles.relationsList}>
                        {childStepsInfo.map(({ relation, step }, idx) => (
                            <div key={relation.id} className={styles.relationItem}>
                                <div className={styles.relationNumber}>{idx + 1}.</div>
                                <div className={styles.relationDetails}>
                                    <div className={styles.relationStep}>
                                        <span className={styles.relationLabel}>К шагу:</span>{' '}
                                        <span className={styles.relationStepName}>
                                            {step?.name || 'Неизвестный шаг'}
                                        </span>
                                        <span className={styles.relationStepId}>({relation.childStepId})</span>
                                    </div>
                                    {relation.conditionExpression && (
                                        <div className={styles.relationCondition}>
                                            <span className={styles.relationLabel}>Условие:</span>{' '}
                                            <code className={styles.conditionCode}>
                                                {relation.conditionExpression}
                                            </code>
                                        </div>
                                    )}
                                    {relation.conditionOrder !== undefined && relation.conditionOrder > 0 && (
                                        <div className={styles.relationOrder}>
                                            <span className={styles.relationLabel}>Приоритет:</span>{' '}
                                            {relation.conditionOrder}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
