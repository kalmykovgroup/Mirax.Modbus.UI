// src/features/scenarioEditor/core/features/validation/validators/ParallelStepValidator.ts

import type { ParallelStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { FlowType } from '@scenario/core/types/flowType';
import type { NodeValidationContract, ValidationResult } from '../contracts/ValidationContract';
import { createValidationResult, combineValidationResults } from '../contracts/ValidationContract';
import { BaseStepValidator } from './BaseStepValidator';

/**
 * Валидатор для ParallelStep
 */
export class ParallelStepValidator extends BaseStepValidator implements NodeValidationContract<ParallelStepDto> {
    readonly type = FlowType.Parallel;
    readonly displayName = 'Parallel Step Validator';

    validate(dto: ParallelStepDto): ValidationResult {
        const baseResult = this.validateBase(dto);

        const errors: string[] = [];

        if (!dto.stepBranchRelations || dto.stepBranchRelations.length < 2) {
            errors.push('Необходимо создать минимум 2 ветки для параллельного выполнения');
        }

        const specificResult = createValidationResult(errors);
        return combineValidationResults(baseResult, specificResult);
    }
}
