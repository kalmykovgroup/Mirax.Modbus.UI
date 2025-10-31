// src/features/scenarioEditor/core/features/validation/validators/SignalStepValidator.ts

import type { SignalStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { FlowType } from '@scenario/core/types/flowType';
import type { NodeValidationContract, ValidationResult } from '../contracts/ValidationContract';
import { createValidationResult, combineValidationResults } from '../contracts/ValidationContract';
import { BaseStepValidator } from './BaseStepValidator';

/**
 * Валидатор для SignalStep
 */
export class SignalStepValidator extends BaseStepValidator implements NodeValidationContract<SignalStepDto> {
    readonly type = FlowType.Signal;
    readonly displayName = 'Signal Step Validator';

    validate(dto: SignalStepDto): ValidationResult {
        const baseResult = this.validateBase(dto);

        const errors: string[] = [];

        if (!dto.signalKey || dto.signalKey.trim() === '') {
            errors.push('Необходимо указать ключ сигнала');
        }

        const specificResult = createValidationResult(errors);
        return combineValidationResults(baseResult, specificResult);
    }
}
