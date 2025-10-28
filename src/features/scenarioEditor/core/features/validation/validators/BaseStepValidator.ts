// src/features/scenarioEditor/core/features/validation/validators/BaseStepValidator.ts

import type { StepBaseDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { createValidationResult, type ValidationResult } from '../contracts/ValidationContract';

/**
 * Базовый валидатор для всех степов
 * Проверяет общие поля, которые есть у всех типов степов
 */
export class BaseStepValidator {
    /**
     * Валидирует базовые поля степа
     */
    protected validateBase(dto: StepBaseDto): ValidationResult {
        const errors: string[] = [];

        // Имя обязательно и не должно быть пустым
        if (!dto.name || dto.name.trim() === '') {
            errors.push('Необходимо указать имя шага');
        }

        // TaskQueue обязателен
        if (!dto.taskQueue || dto.taskQueue.trim() === '') {
            errors.push('Необходимо указать очередь задач');
        }

        return createValidationResult(errors);
    }
}
