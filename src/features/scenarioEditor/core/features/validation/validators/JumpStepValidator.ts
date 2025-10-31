// src/features/scenarioEditor/core/features/validation/validators/JumpStepValidator.ts

import type { JumpStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { FlowType } from '@scenario/core/types/flowType';
import type { NodeValidationContract, ValidationResult } from '../contracts/ValidationContract';
import { createValidationResult, combineValidationResults } from '../contracts/ValidationContract';
import { BaseStepValidator } from './BaseStepValidator';

/**
 * Валидатор для JumpStep
 */
export class JumpStepValidator extends BaseStepValidator implements NodeValidationContract<JumpStepDto> {
    readonly type = FlowType.Jump;
    readonly displayName = 'Jump Step Validator';

    validate(dto: JumpStepDto): ValidationResult {
        const baseResult = this.validateBase(dto);

        const errors: string[] = [];

        if (!dto.jumpToStepId) {
            errors.push('Необходимо указать целевой шаг для перехода');
        }

        const specificResult = createValidationResult(errors);
        return combineValidationResults(baseResult, specificResult);
    }
}
