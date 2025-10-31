// src/features/scenarioEditor/core/features/validation/validators/BranchValidator.ts

import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto';
import { FlowType } from '@scenario/core/types/flowType';
import type { NodeValidationContract, ValidationResult } from '../contracts/ValidationContract';
import { createValidationResult } from '../contracts/ValidationContract';

/**
 * Валидатор для Branch
 * Проверяет поля ветки
 */
export class BranchValidator implements NodeValidationContract<BranchDto> {
    readonly type = FlowType.BranchNode;
    readonly displayName = 'Branch Validator';

    validate(dto: BranchDto): ValidationResult {
        const errors: string[] = [];

        // Имя обязательно
        if (!dto.name || dto.name.trim() === '') {
            errors.push('Необходимо указать имя ветки');
        }

        return createValidationResult(errors);
    }
}
