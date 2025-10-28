// src/features/scenarioEditor/core/features/validation/contracts/ValidationContract.ts

import type { FlowType } from '@scenario/core/ui/nodes/types/flowType';

/**
 * Результат валидации
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Контракт валидатора для типа ноды
 * Каждый валидатор должен реализовать этот интерфейс
 */
export interface NodeValidationContract<TDto = any> {
    /**
     * Тип ноды, для которой применяется валидатор
     */
    readonly type: FlowType;

    /**
     * Валидирует DTO ноды
     * @param dto - DTO ноды для валидации
     * @returns Результат валидации с списком ошибок
     */
    validate(dto: TDto): ValidationResult;

    /**
     * Опциональное название валидатора (для отладки)
     */
    readonly displayName?: string;
}

/**
 * Базовая реализация результата валидации
 */
export function createValidationResult(errors: string[] = []): ValidationResult {
    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Вспомогательная функция для комбинирования результатов валидации
 */
export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
    const allErrors = results.flatMap(r => r.errors);
    return createValidationResult(allErrors);
}
