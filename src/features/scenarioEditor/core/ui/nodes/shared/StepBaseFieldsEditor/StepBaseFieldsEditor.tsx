// src/features/scenarioEditor/core/ui/nodes/shared/StepBaseFieldsEditor/StepBaseFieldsEditor.tsx

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { ExternalLink } from 'lucide-react';
import { Block } from '@scenario/core/features/fieldLockSystem';
import type { StepBaseDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import type { RootState } from '@/baseStore/store';
import { selectActiveScenarioId, selectBranchesListInScenario, selectStepById } from '@scenario/store/scenarioSelectors';
import { useNodeEditModal } from '@scenario/core/ui/nodes/shared/NodeEditModal/NodeEditModalProvider';
import { BranchEditContract } from '@scenario/core/ui/nodes/BranchNode/BranchEditContract';
import styles from './StepBaseFieldsEditor.module.css';

interface StepBaseFieldsEditorProps<TDto extends StepBaseDto> {
    /** DTO объект шага */
    dto: TDto;
    /** Коллбэк для изменения полей */
    onChange: (updates: Partial<TDto>) => void;
    /** Группа блокировки для основной информации (опционально, по умолчанию 'stepBasicInfo') */
    basicInfoGroup?: string;
    /** Группа блокировки для данных ввода/вывода (опционально, по умолчанию 'stepIOData') */
    ioDataGroup?: string;
    /** Группа блокировки для координат и размеров (опционально, по умолчанию 'stepGeometry') */
    geometryGroup?: string;
    /** Группа блокировки для информации о связях (опционально, по умолчанию 'stepRelations') */
    relationsGroup?: string;
}

/**
 * Универсальный компонент для редактирования всех полей StepBaseDto.
 * Переиспользуется во всех контрактах редактирования шагов.
 */
export function StepBaseFieldsEditor<TDto extends StepBaseDto>({
    dto,
    onChange,
    basicInfoGroup = 'stepBasicInfo',
    ioDataGroup = 'stepIOData',
    geometryGroup = 'stepGeometry',
    relationsGroup = 'stepRelations',
}: StepBaseFieldsEditorProps<TDto>) {
    const [name, setName] = useState(dto.name);
    const [description, setDescription] = useState(dto.description || '');
    const [taskQueue, setTaskQueue] = useState(dto.taskQueue);
    const [defaultInput, setDefaultInput] = useState(dto.defaultInput || '');
    const [defaultOutput, setDefaultOutput] = useState(dto.defaultOutput || '');
    const [x, setX] = useState(dto.x);
    const [y, setY] = useState(dto.y);
    const [width, setWidth] = useState(dto.width);
    const [height, setHeight] = useState(dto.height);

    const activeScenarioId = useSelector(selectActiveScenarioId);
    const { openEditModal } = useNodeEditModal();

    // Получаем ветки из активного сценария
    const branches = useSelector((state: RootState) =>
        activeScenarioId ? selectBranchesListInScenario(state, activeScenarioId) : []
    );

    // Находим ветку по branchId
    const branch = useMemo(() => branches.find((b) => b.id === dto.branchId), [branches, dto.branchId]);

    // Получаем информацию о родительских шагах (мемоизировано)
    const parentStepsInfo = useSelector(
        (state: RootState) =>
            dto.parentRelations.map((rel) => ({
                relation: rel,
                step: activeScenarioId ? selectStepById(state, activeScenarioId, rel.parentStepId) : undefined,
            })),
        (a, b) => {
            if (a.length !== b.length) return false;
            return a.every((item, idx) =>
                item.relation.id === b[idx].relation.id &&
                item.step?.id === b[idx].step?.id
            );
        }
    );

    // Получаем информацию о дочерних шагах (мемоизировано)
    const childStepsInfo = useSelector(
        (state: RootState) =>
            dto.childRelations.map((rel) => ({
                relation: rel,
                step: activeScenarioId ? selectStepById(state, activeScenarioId, rel.childStepId) : undefined,
            })),
        (a, b) => {
            if (a.length !== b.length) return false;
            return a.every((item, idx) =>
                item.relation.id === b[idx].relation.id &&
                item.step?.id === b[idx].step?.id
            );
        }
    );

    // Синхронизируем локальное состояние при изменении dto извне
    useEffect(() => {
        setName(dto.name);
        setDescription(dto.description || '');
        setTaskQueue(dto.taskQueue);
        setDefaultInput(dto.defaultInput || '');
        setDefaultOutput(dto.defaultOutput || '');
        setX(dto.x);
        setY(dto.y);
        setWidth(dto.width);
        setHeight(dto.height);
    }, [dto]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
        onChange({ name: newName } as Partial<TDto>);
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newDescription = e.target.value;
        setDescription(newDescription);
        onChange({ description: newDescription || undefined } as Partial<TDto>);
    };

    const handleTaskQueueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newQueue = e.target.value;
        setTaskQueue(newQueue);
        onChange({ taskQueue: newQueue } as Partial<TDto>);
    };

    const handleDefaultInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newInput = e.target.value;
        setDefaultInput(newInput);
        onChange({ defaultInput: newInput || undefined } as Partial<TDto>);
    };

    const handleDefaultOutputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newOutput = e.target.value;
        setDefaultOutput(newOutput);
        onChange({ defaultOutput: newOutput || undefined } as Partial<TDto>);
    };

    const handleXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newX = parseInt(e.target.value, 10);
        setX(isNaN(newX) ? 0 : newX);
        onChange({ x: isNaN(newX) ? 0 : newX } as Partial<TDto>);
    };

    const handleYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newY = parseInt(e.target.value, 10);
        setY(isNaN(newY) ? 0 : newY);
        onChange({ y: isNaN(newY) ? 0 : newY } as Partial<TDto>);
    };

    const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newWidth = parseInt(e.target.value, 10);
        setWidth(isNaN(newWidth) ? 0 : newWidth);
        onChange({ width: isNaN(newWidth) ? 0 : newWidth } as Partial<TDto>);
    };

    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHeight = parseInt(e.target.value, 10);
        setHeight(isNaN(newHeight) ? 0 : newHeight);
        onChange({ height: isNaN(newHeight) ? 0 : newHeight } as Partial<TDto>);
    };

    const handleOpenBranchEdit = useCallback(() => {
        if (!branch) return;

        // Создаем фейковую ноду для ветки
        const branchNode: any = {
            id: branch.id,
            type: 'BranchNode',
            data: {
                object: branch,
            },
        };

        openEditModal(branchNode, BranchEditContract);
    }, [branch, openEditModal]);

    return (
        <>
            {/* Основная информация */}
            <Block
                group={basicInfoGroup}
                label="Основная информация"
                description="Название, описание и очередь выполнения"
                mode="wrap"
            >
                <div className={styles.fieldGroup}>
                    <label htmlFor="step-name" className={styles.label}>
                        Название шага
                    </label>
                    <input
                        id="step-name"
                        type="text"
                        value={name}
                        onChange={handleNameChange}
                        placeholder="Введите название шага"
                        className={styles.input}
                    />
                </div>

                <div className={styles.fieldGroup}>
                    <label htmlFor="step-description" className={styles.label}>
                        Описание
                    </label>
                    <textarea
                        id="step-description"
                        value={description}
                        onChange={handleDescriptionChange}
                        placeholder="Введите описание шага"
                        rows={2}
                        className={styles.textarea}
                    />
                </div>

                <div className={styles.fieldGroup}>
                    <label htmlFor="step-queue" className={styles.label}>
                        Очередь выполнения
                    </label>
                    <input
                        id="step-queue"
                        type="text"
                        value={taskQueue}
                        onChange={handleTaskQueueChange}
                        placeholder="Название очереди задач"
                        className={styles.input}
                    />
                    <span className={styles.hint}>
                        Очередь для выполнения задачи (например: default, high-priority)
                    </span>
                </div>

                <div className={styles.fieldGroup}>
                    <label className={styles.label}>Ветка</label>
                    <div className={styles.branchInfo}>
                        <span className={styles.branchName}>{branch?.name || 'Неизвестная ветка'}</span>
                        {branch && (
                            <button
                                type="button"
                                onClick={handleOpenBranchEdit}
                                className={styles.branchButton}
                                title="Открыть редактирование ветки"
                            >
                                <ExternalLink size={12} />
                                Редактировать
                            </button>
                        )}
                    </div>
                </div>
            </Block>

            {/* Данные ввода/вывода */}
            <Block
                group={ioDataGroup}
                label="Данные ввода/вывода"
                description="Значения по умолчанию для входных и выходных данных"
                mode="wrap"
            >
                <div className={styles.fieldGroup}>
                    <label htmlFor="step-input" className={styles.label}>
                        Входные данные (по умолчанию)
                    </label>
                    <textarea
                        id="step-input"
                        value={defaultInput}
                        onChange={handleDefaultInputChange}
                        placeholder='{"key": "value"}'
                        rows={3}
                        className={styles.textarea}
                    />
                    <span className={styles.hint}>
                        JSON объект с входными данными
                    </span>
                </div>

                <div className={styles.fieldGroup}>
                    <label htmlFor="step-output" className={styles.label}>
                        Выходные данные (по умолчанию)
                    </label>
                    <textarea
                        id="step-output"
                        value={defaultOutput}
                        onChange={handleDefaultOutputChange}
                        placeholder='{"result": "success"}'
                        rows={3}
                        className={styles.textarea}
                    />
                    <span className={styles.hint}>
                        JSON объект с выходными данными
                    </span>
                </div>
            </Block>

            {/* Координаты и размеры */}
            <Block
                group={geometryGroup}
                label="Координаты и размеры"
                description="Позиция и размер элемента на canvas"
                mode="wrap"
            >
                <div className={styles.geometryGrid}>
                    <div className={styles.fieldGroup}>
                        <label htmlFor="step-x" className={styles.label}>
                            X
                        </label>
                        <input
                            id="step-x"
                            type="number"
                            value={x}
                            onChange={handleXChange}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label htmlFor="step-y" className={styles.label}>
                            Y
                        </label>
                        <input
                            id="step-y"
                            type="number"
                            value={y}
                            onChange={handleYChange}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label htmlFor="step-width" className={styles.label}>
                            Ширина
                        </label>
                        <input
                            id="step-width"
                            type="number"
                            value={width}
                            onChange={handleWidthChange}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label htmlFor="step-height" className={styles.label}>
                            Высота
                        </label>
                        <input
                            id="step-height"
                            type="number"
                            value={height}
                            onChange={handleHeightChange}
                            className={styles.input}
                        />
                    </div>
                </div>
            </Block>

            {/* Информация о связях */}
            <Block
                group={relationsGroup}
                label="Связи шага"
                description="Информация о входящих и исходящих связях"
                mode="wrap"
            >
                <div className={styles.relationsInfo}>
                    <div className={styles.relationsSummary}>
                        <div>
                            <strong>ID шага:</strong> <code className={styles.code}>{dto.id}</code>
                        </div>
                        <div>
                            <strong>Тип:</strong> {dto.type}
                        </div>
                        <div>
                            <strong>Входящих связей:</strong> {dto.parentRelations.length}
                        </div>
                        <div>
                            <strong>Исходящих связей:</strong> {dto.childRelations.length}
                        </div>
                    </div>

                    {/* Входящие связи */}
                    {parentStepsInfo.length > 0 && (
                        <div className={styles.relationsSection}>
                            <div className={styles.relationsSectionTitle}>
                                Входящие связи:
                            </div>
                            <div className={styles.relationsList}>
                                {parentStepsInfo.map(({ relation, step }, idx) => (
                                    <div key={`parent-${relation.id}-${idx}`} className={styles.relationItem}>
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

                    {/* Исходящие связи */}
                    {childStepsInfo.length > 0 && (
                        <div className={styles.relationsSection}>
                            <div className={styles.relationsSectionTitle}>
                                Исходящие связи:
                            </div>
                            <div className={styles.relationsList}>
                                {childStepsInfo.map(({ relation, step }, idx) => (
                                    <div key={`child-${relation.id}-${idx}`} className={styles.relationItem}>
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
            </Block>
        </>
    );
}
