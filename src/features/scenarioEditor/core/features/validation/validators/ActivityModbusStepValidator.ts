// src/features/scenarioEditor/core/features/validation/validators/ActivityModbusStepValidator.ts

import type { ActivityModbusStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { NodeValidationContract, ValidationResult } from '../contracts/ValidationContract';
import { createValidationResult, combineValidationResults } from '../contracts/ValidationContract';
import { BaseStepValidator } from './BaseStepValidator';

/**
 * Валидатор для ActivityModbusStep
 * Проверяет специфичные поля Modbus-действия
 */
export class ActivityModbusStepValidator extends BaseStepValidator implements NodeValidationContract<ActivityModbusStepDto> {
    readonly type = FlowType.ActivityModbus;
    readonly displayName = 'Activity Modbus Step Validator';

    validate(dto: ActivityModbusStepDto): ValidationResult {
        // Валидируем базовые поля
        const baseResult = this.validateBase(dto);

        // Валидируем специфичные поля
        const errors: string[] = [];

        if (!dto.sessionId) {
            errors.push('Необходимо выбрать сессию');
        }

        if (!dto.connectionConfigId) {
            errors.push('Необходимо выбрать конфигурацию подключения');
        }

        if (!dto.modbusDeviceActionId) {
            errors.push('Необходимо выбрать действие устройства');
        }

        if (!dto.modbusDeviceAddressId) {
            errors.push('Необходимо выбрать адрес устройства');
        }

        const specificResult = createValidationResult(errors);

        // Комбинируем результаты
        return combineValidationResults(baseResult, specificResult);
    }
}
