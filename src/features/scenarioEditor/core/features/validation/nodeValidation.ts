// src/features/scenarioEditor/core/features/validation/nodeValidation.ts

import type { Guid } from '@app/lib/types/Guid';
import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import { validationRegistry } from './ValidationRegistry';
import type { ValidationResult } from './contracts/ValidationContract';

/**
 * Информация о невалидной ноде
 */
export interface InvalidNodeInfo {
    nodeId: Guid;
    nodeType: FlowType;
    nodeName: string;
    errors: string[];
}

// Реэкспортируем ValidationResult для обратной совместимости
export type { ValidationResult } from './contracts/ValidationContract';

/**
 * Валидирует ноду по её DTO используя зарегистрированный валидатор
 * @param dto - DTO ноды для валидации
 * @param type - Тип ноды
 * @returns Результат валидации с списком ошибок
 */
export function validateNodeDto(dto: any, type: FlowType): ValidationResult {
    // Получаем валидатор из registry
    const validator = validationRegistry.get(type);

    if (!validator) {
        console.warn(`[validateNodeDto] No validator found for type: ${type}`);
        // Если валидатор не найден - считаем ноду валидной
        return {
            valid: true,
            errors: [],
        };
    }

    // Выполняем валидацию через валидатор
    return validator.validate(dto);
}

/**
 * Проверяет, нужно ли валидировать данный тип ноды перед сохранением
 */
export function shouldValidateBeforeSave(_type: FlowType): boolean {
    // Все типы нод требуют валидации
    return true;
}
