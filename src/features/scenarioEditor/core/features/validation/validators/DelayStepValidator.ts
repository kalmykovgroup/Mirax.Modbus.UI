// src/features/scenarioEditor/core/features/validation/validators/DelayStepValidator.ts

import type { DelayStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { NodeValidationContract, ValidationResult } from '../contracts/ValidationContract';
import { createValidationResult, combineValidationResults } from '../contracts/ValidationContract';
import { BaseStepValidator } from './BaseStepValidator';

/**
 * Валидатор для DelayStep
 * Проверяет специфичные поля задержки
 */
export class DelayStepValidator extends BaseStepValidator implements NodeValidationContract<DelayStepDto> {
    readonly type = FlowType.Delay;
    readonly displayName = 'Delay Step Validator';

    validate(dto: DelayStepDto): ValidationResult {
        // Валидируем базовые поля
        const baseResult = this.validateBase(dto);

        // Валидируем специфичные поля
        const errors: string[] = [];

        if (!dto.timeSpan || dto.timeSpan === 'PT0S') {
            errors.push('Необходимо указать время задержки');
        }

        const specificResult = createValidationResult(errors);

        // Комбинируем результаты
        return combineValidationResults(baseResult, specificResult);
    }
}
