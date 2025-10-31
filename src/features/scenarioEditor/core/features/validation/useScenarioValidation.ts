// src/features/scenarioEditor/core/features/validation/useScenarioValidation.ts

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/baseStore/store';
import type { Guid } from '@app/lib/types/Guid';
import { validateNodeDto, type InvalidNodeInfo, shouldValidateBeforeSave } from './nodeValidation';
import { FlowType } from '@scenario/core/types/flowType';

export interface ScenarioValidationResult {
    /**
     * Есть ли невалидные ноды в сценарии
     */
    hasInvalidNodes: boolean;

    /**
     * Список невалидных нод
     */
    invalidNodes: InvalidNodeInfo[];

    /**
     * Общее количество ошибок валидации
     */
    totalErrors: number;

    /**
     * Можно ли сохранить сценарий (нет невалидных нод)
     */
    canSave: boolean;
}

/**
 * Хук для валидации всего сценария
 * Проверяет все ноды (степы и ветки) на соответствие требованиям
 */
export function useScenarioValidation(scenarioId: Guid | null): ScenarioValidationResult {
    const scenarioState = useSelector((state: RootState) =>
        scenarioId ? state.scenario.scenarios[scenarioId] : null
    );

    const result = useMemo((): ScenarioValidationResult => {
        if (!scenarioState) {
            return {
                hasInvalidNodes: false,
                invalidNodes: [],
                totalErrors: 0,
                canSave: true,
            };
        }

        const invalidNodes: InvalidNodeInfo[] = [];

        // Валидация всех степов
        Object.values(scenarioState.steps).forEach((step) => {
            const stepType = step.type as FlowType;

            // Проверяем, нужно ли валидировать этот тип
            if (!shouldValidateBeforeSave(stepType)) {
                return;
            }

            const validation = validateNodeDto(step, stepType);

            if (!validation.valid) {
                invalidNodes.push({
                    nodeId: step.id,
                    nodeType: stepType,
                    nodeName: step.name || 'Без имени',
                    errors: validation.errors,
                });
            }
        });

        // Валидация всех веток
        Object.values(scenarioState.branches).forEach((branch) => {
            const branchType = FlowType.BranchNode;

            // Проверяем, нужно ли валидировать этот тип
            if (!shouldValidateBeforeSave(branchType)) {
                return;
            }

            const validation = validateNodeDto(branch, branchType);

            if (!validation.valid) {
                invalidNodes.push({
                    nodeId: branch.id,
                    nodeType: branchType,
                    nodeName: branch.name || 'Без имени',
                    errors: validation.errors,
                });
            }
        });

        const totalErrors = invalidNodes.reduce((sum, node) => sum + node.errors.length, 0);

        return {
            hasInvalidNodes: invalidNodes.length > 0,
            invalidNodes,
            totalErrors,
            canSave: invalidNodes.length === 0,
        };
    }, [scenarioState]);

    return result;
}

/**
 * Вспомогательный хук для получения ошибок валидации конкретной ноды
 */
export function useNodeValidationErrors(
    scenarioId: Guid | null,
    nodeId: Guid | null
): string[] {
    const validation = useScenarioValidation(scenarioId);

    if (!nodeId) {
        return [];
    }

    const nodeInfo = validation.invalidNodes.find((n) => n.nodeId === nodeId);
    return nodeInfo ? nodeInfo.errors : [];
}