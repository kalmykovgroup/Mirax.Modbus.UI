// src/features/scenarioEditor/core/features/validation/ValidationRegistry.ts

import type { FlowType } from '@scenario/core/types/flowType';
import type { NodeValidationContract } from './contracts/ValidationContract';

// Импортируем все валидаторы
import { ActivityModbusStepValidator } from './validators/ActivityModbusStepValidator';
import { ActivitySystemStepValidator } from './validators/ActivitySystemStepValidator';
import { DelayStepValidator } from './validators/DelayStepValidator';
import { SignalStepValidator } from './validators/SignalStepValidator';
import { JumpStepValidator } from './validators/JumpStepValidator';
import { ParallelStepValidator } from './validators/ParallelStepValidator';
import { ConditionStepValidator } from './validators/ConditionStepValidator';
import { BranchValidator } from './validators/BranchValidator';

/**
 * Registry всех валидаторов нод
 * Централизованное хранилище валидаторов с доступом по типу ноды
 */
class ValidationRegistryClass {
    private validators = new Map<FlowType, NodeValidationContract>();

    constructor() {
        // Регистрируем все валидаторы
        this.register(new ActivityModbusStepValidator());
        this.register(new ActivitySystemStepValidator());
        this.register(new DelayStepValidator());
        this.register(new SignalStepValidator());
        this.register(new JumpStepValidator());
        this.register(new ParallelStepValidator());
        this.register(new ConditionStepValidator());
        this.register(new BranchValidator());
    }

    /**
     * Регистрирует валидатор
     */
    private register(validator: NodeValidationContract): void {
        if (this.validators.has(validator.type)) {
            console.warn(`[ValidationRegistry] Validator for type "${validator.type}" is already registered. Overwriting.`);
        }
        this.validators.set(validator.type, validator);
    }

    /**
     * Получает валидатор по типу ноды
     */
    get(type: FlowType): NodeValidationContract | undefined {
        return this.validators.get(type);
    }

    /**
     * Проверяет, есть ли валидатор для типа
     */
    has(type: FlowType): boolean {
        return this.validators.has(type);
    }

    /**
     * Возвращает все зарегистрированные валидаторы
     */
    getAll(): NodeValidationContract[] {
        return Array.from(this.validators.values());
    }

    /**
     * Возвращает количество зарегистрированных валидаторов
     */
    get size(): number {
        return this.validators.size;
    }
}

/**
 * Глобальный экземпляр registry валидаторов
 */
export const validationRegistry = new ValidationRegistryClass();
