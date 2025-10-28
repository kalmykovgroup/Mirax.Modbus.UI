// src/features/scenarioEditor/core/features/validation/validators/ActivitySystemStepValidator.ts

import type { ActivitySystemStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { NodeValidationContract, ValidationResult } from '../contracts/ValidationContract';
import { createValidationResult, combineValidationResults } from '../contracts/ValidationContract';
import { BaseStepValidator } from './BaseStepValidator';

/**
 * Валидатор для ActivitySystemStep
 * Проверяет специфичные поля системного действия
 */
export class ActivitySystemStepValidator extends BaseStepValidator implements NodeValidationContract<ActivitySystemStepDto> {
    readonly type = FlowType.ActivitySystem;
    readonly displayName = 'Activity System Step Validator';

    validate(dto: ActivitySystemStepDto): ValidationResult {
        // Валидируем базовые поля
        const baseResult = this.validateBase(dto);

        // Валидируем специфичные поля
        const errors: string[] = [];

        if (!dto.systemActionId) {
            errors.push('Необходимо выбрать системное действие');
        }

        const specificResult = createValidationResult(errors);

        // Комбинируем результаты
        return combineValidationResults(baseResult, specificResult);
    }
}
