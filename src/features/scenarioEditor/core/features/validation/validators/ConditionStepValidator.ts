// src/features/scenarioEditor/core/features/validation/validators/ConditionStepValidator.ts

import type { ConditionStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { FlowType } from '@scenario/core/types/flowType';
import type { NodeValidationContract, ValidationResult } from '../contracts/ValidationContract';
import { createValidationResult, combineValidationResults } from '../contracts/ValidationContract';
import { BaseStepValidator } from './BaseStepValidator';

/**
 * Валидатор для ConditionStep
 */
export class ConditionStepValidator extends BaseStepValidator implements NodeValidationContract<ConditionStepDto> {
    readonly type = FlowType.Condition;
    readonly displayName = 'Condition Step Validator';

    validate(dto: ConditionStepDto): ValidationResult {
        const baseResult = this.validateBase(dto);

        const errors: string[] = [];

        if (!dto.stepBranchRelations || dto.stepBranchRelations.length < 2) {
            errors.push('Необходимо создать минимум 2 ветки для условия');
        }

        const specificResult = createValidationResult(errors);
        return combineValidationResults(baseResult, specificResult);
    }
}
