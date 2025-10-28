// src/features/scenarioEditor/core/features/validation/index.ts

// Публичные функции для валидации
export { validateNodeDto, shouldValidateBeforeSave } from './nodeValidation';
export type { ValidationResult, InvalidNodeInfo } from './nodeValidation';

// Хуки для использования валидации в компонентах
export { useScenarioValidation, useNodeValidationErrors } from './useScenarioValidation';
export type { ScenarioValidationResult } from './useScenarioValidation';

// Registry валидаторов (для расширения и отладки)
export { validationRegistry } from './ValidationRegistry';

// Контракты валидации (для создания новых валидаторов)
export type { NodeValidationContract } from './contracts/ValidationContract';
export { createValidationResult, combineValidationResults } from './contracts/ValidationContract';

// Базовый валидатор для степов (для наследования)
export { BaseStepValidator } from './validators/BaseStepValidator';

// Утилиты для фокусировки на невалидных нодах
export { focusOnInvalidNode, focusOnFirstInvalidNode } from './focusInvalidNode';
