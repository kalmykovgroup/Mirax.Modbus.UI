/**
 * ФАЙЛ: src/features/scenarioEditor/components/ScenarioChangesViewer/ScenarioChangesViewer.tsx
 *
 * Готовый контейнер для отображения изменений сценария
 * Использование: <ScenarioChangesViewer />
 */

import { type JSX, memo, useCallback, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '@/baseStore/store.ts';
import { selectActiveScenarioId, refreshScenarioById } from '@/features/scenarioEditor/store/scenarioSlice';
import type { ScenarioOperationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/ScenarioOperationDto';
import type { Guid } from '@app/lib/types/Guid';
import { DbEntityType } from '@scenario/shared/contracts/server/types/Api.Shared/Scenario/DbEntityType';
import { DbActionType } from '@scenario/shared/contracts/server/types/Api.Shared/Scenario/DbActionType';
import { scenarioApi } from '@/features/scenarioEditor/shared/api/scenarioApi';
import { useEntityChanges } from '@scenario/core/scenarioChangeCenter/useEntityChanges';
import { ChangesViewer } from '@scenario/core/scenarioChangeCenter/ChangesViewer';
import type { EntityChange } from '@scenario/core/scenarioChangeCenter/types';
import { selectChangesState } from '@scenario/store/scenarioChangesSlice';

export interface ScenarioChangesViewerProps {
    readonly className?: string | undefined;
}

export const ScenarioChangesViewer = memo(function ScenarioChangesViewer({
                                                                             className,
                                                                         }: ScenarioChangesViewerProps): JSX.Element | null {
    const dispatch = useDispatch<AppDispatch>();
    const activeScenarioId = useSelector(selectActiveScenarioId);

    // 🔍 ОТЛАДКА: Весь state изменений
    const changesState = useSelector(selectChangesState);

    // 🔍 ОТЛАДКА: Логируем activeScenarioId и весь state
    useEffect(() => {
        console.log('🎯 ScenarioChangesViewer DEBUG:', {
            activeScenarioId,
            contextsKeys: Object.keys(changesState.contexts),
            fullState: changesState,
        });
    }, [activeScenarioId, changesState]);

    // Хуки для всех типов сущностей
    const steps = useEntityChanges<{ id: string }>({
        contextId: activeScenarioId ?? '',
        entityType: 'Step',
    });

    const branches = useEntityChanges<{ id: string }>({
        contextId: activeScenarioId ?? '',
        entityType: 'Branch',
    });

    const relations = useEntityChanges<{ id: string }>({
        contextId: activeScenarioId ?? '',
        entityType: 'StepRelation',
    });

    // 🔍 ОТЛАДКА: Логируем результаты хуков
    useEffect(() => {
        console.log('📊 Changes from hooks:', {
            steps: {
                count: steps.changesCount,
                changes: steps.changes,
                visualChanges: steps.visualChanges,
            },
            branches: {
                count: branches.changesCount,
                changes: branches.changes,
            },
            relations: {
                count: relations.changesCount,
                changes: relations.changes,
            },
        });
    }, [steps.changesCount, steps.changes, steps.visualChanges, branches.changesCount, branches.changes, relations.changesCount, relations.changes]);

    // Объединяем все изменения
    const allChanges = useMemo(() => {
        const combined = [
            ...steps.visualChanges,
            ...branches.visualChanges,
            ...relations.visualChanges,
        ];
        console.log('📋 Combined changes:', combined.length, combined);
        return combined;
    }, [steps.visualChanges, branches.visualChanges, relations.visualChanges]);

    // Применить изменения - отправить на сервер
    const handleApply = useCallback(async (): Promise<void> => {
        if (activeScenarioId === null || activeScenarioId === undefined) {
            return;
        }

        // Преобразуем изменения в ScenarioOperationDto
        const operations: ScenarioOperationDto[] = [
            ...toOperations(steps.changes),
            ...toOperations(branches.changes),
            ...toOperations(relations.changes),
        ];

        if (operations.length === 0) {
            return;
        }

        try {
            // Отправляем на сервер
            await dispatch(
                scenarioApi.endpoints.applyScenarioChanges.initiate({
                    scenarioId: activeScenarioId,
                    operations,
                })
            ).unwrap();

            // Очищаем изменения
            steps.clearChanges();
            branches.clearChanges();
            relations.clearChanges();

            // Перезагружаем сценарий с сервера
            await dispatch(refreshScenarioById(activeScenarioId, true));

            console.log('✅ Изменения успешно применены');
        } catch (error) {
            console.error('❌ Ошибка при применении изменений:', error);
        }
    }, [activeScenarioId, steps, branches, relations, dispatch]);

    // Отменить все изменения
    const handleCancel = useCallback(() => {
        steps.clearChanges();
        branches.clearChanges();
        relations.clearChanges();
    }, [steps, branches, relations]);

    // Форматирование названий сущностей
    const formatEntityType = useCallback((entityType: string): string => {
        const types: Record<string, string> = {
            Step: 'Шаг',
            Branch: 'Ветка',
            StepRelation: 'Связь шагов',
            ConditionStepBranchRelation: 'Связь условия',
            ParallelStepBranchRelation: 'Связь параллели',
        };
        const result = types[entityType];
        return result !== undefined ? result : entityType;
    }, []);

    // Форматирование названий полей
    const formatFieldName = useCallback((entityType: string, field: string): string => {
        const commonFields: Record<string, string> = {
            id: 'ID',
            name: 'Название',
            description: 'Описание',
            x: 'X координата',
            y: 'Y координата',
            width: 'Ширина',
            height: 'Высота',
            branchId: 'ID ветки',
            parentId: 'ID родителя',
            childId: 'ID потомка',
        };

        if (entityType === 'Step') {
            const stepFields: Record<string, string> = {
                ...commonFields,
                delaySeconds: 'Задержка (сек)',
                isActive: 'Активен',
                priority: 'Приоритет',
            };
            const result = stepFields[field];
            return result !== undefined ? result : field;
        }

        const result = commonFields[field];
        return result !== undefined ? result : field;
    }, []);

    // Форматирование значений
    const formatValue = useCallback((value: unknown): string => {
        if (value === null) return 'null';
        if (value === undefined) return '—';

        if (typeof value === 'boolean') {
            return value ? '✓ Да' : '✗ Нет';
        }

        if (typeof value === 'string') {
            return value;
        }

        if (typeof value === 'number') {
            return String(value);
        }

        if (Array.isArray(value)) {
            return value.length > 0 ? value.join(', ') : '[]';
        }

        try {
            return JSON.stringify(value, null, 2);
        } catch {
            return String(value);
        }
    }, []);

    // Если нет активного сценария - не показываем
    if (activeScenarioId === null || activeScenarioId === undefined) {
        console.log('⚠️ activeScenarioId is null/undefined');
        return null;
    }

    return (
        <ChangesViewer
            changes={allChanges}
            title="Изменения сценария"
            className={className}
            onApply={handleApply}
            onCancel={handleCancel}
            formatEntityType={formatEntityType}
            formatFieldName={formatFieldName}
            formatValue={formatValue}
        />
    );
});

/**
 * Преобразует EntityChange в ScenarioOperationDto
 */
function toOperations(changes: readonly EntityChange[]): ScenarioOperationDto[] {
    return changes.map(change => ({
        opId: crypto.randomUUID() as Guid,
        entity: change.entityType as DbEntityType,
        action: change.action === 'create' ? DbActionType.Create
            : change.action === 'update' ? DbActionType.Update
                : DbActionType.Delete,
        payload: change.current ?? change.entityId,
    }));
}