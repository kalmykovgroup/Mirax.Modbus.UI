# Система валидации нод для редактора сценариев

## Описание

Эта система валидации предотвращает отправку невалидных данных на сервер при автоматическом сохранении и блокирует создание новых нод, пока существующие не заполнены корректно.

## Архитектура

Система построена на основе **контрактов** и **регистра валидаторов**:

```
┌──────────────────────────────────────┐
│   NodeValidationContract (интерфейс) │  ← Контракт, который должны реализовать все валидаторы
└──────────────┬───────────────────────┘
               │ implements
               ├─────────────────────────────┐
               │                             │
       ┌───────▼──────────┐         ┌───────▼──────────┐
       │ BaseStepValidator│         │  BranchValidator │
       │   (базовый класс)│         │                  │
       └───────┬──────────┘         └──────────────────┘
               │ extends
    ┌──────────┼──────────┬──────────┬──────────────┐
    │          │          │          │              │
┌───▼───┐  ┌──▼───┐  ┌───▼───┐  ┌───▼───┐     ┌───▼───┐
│Modbus │  │System│  │ Delay │  │Signal │ ... │Etc... │
│Step   │  │Step  │  │ Step  │  │ Step  │     │       │
└───────┘  └──────┘  └───────┘  └───────┘     └───────┘
                          │
                          ▼
                ┌──────────────────┐
                │ValidationRegistry│  ← Централизованный доступ к валидаторам
                └──────────────────┘
```

## Основные компоненты

### 1. `contracts/ValidationContract.ts`
Определяет контракт, который должны реализовать все валидаторы:

```typescript
interface NodeValidationContract<TDto = any> {
  readonly type: FlowType;              // Тип ноды
  validate(dto: TDto): ValidationResult; // Функция валидации
  readonly displayName?: string;         // Название для отладки
}
```

### 2. `validators/` - Директория с валидаторами

#### `BaseStepValidator.ts`
Базовый валидатор для всех степов. Проверяет общие поля:
- `name` (не пустое)
- `taskQueue` (не пустое)

#### Специфичные валидаторы степов:
Каждый валидатор наследуется от `BaseStepValidator` и добавляет свои проверки:

- **ActivityModbusStepValidator** - требует: sessionId, connectionConfigId, modbusDeviceActionId, modbusDeviceAddressId
- **ActivitySystemStepValidator** - требует: systemActionId
- **DelayStepValidator** - требует: timeSpan (не может быть PT0S)
- **SignalStepValidator** - требует: signalKey
- **JumpStepValidator** - требует: jumpToStepId
- **ParallelStepValidator** - требует: минимум 2 ветки
- **ConditionStepValidator** - требует: минимум 2 ветки

#### `BranchValidator.ts`
Валидатор для веток. Проверяет:
- `name` (не пустое)

### 3. `ValidationRegistry.ts`
Централизованный реестр всех валидаторов. Автоматически регистрирует все валидаторы и предоставляет доступ по типу ноды.

### 4. `useScenarioValidation.ts`
Хук для проверки валидности всего сценария:

```typescript
const validation = useScenarioValidation(scenarioId);

// Результат:
{
  hasInvalidNodes: boolean;      // Есть ли невалидные ноды
  invalidNodes: InvalidNodeInfo[]; // Список невалидных нод с ошибками
  totalErrors: number;           // Общее количество ошибок
  canSave: boolean;              // Можно ли сохранить (нет невалидных нод)
}
```

### 5. Интеграция в `useSaveScenario.ts`
Автосохранение теперь:
- Проверяет валидность нод перед отправкой запроса
- Не отправляет запрос, если есть невалидные ноды
- Показывает понятное сообщение об ошибке с перечислением проблем

### 6. Интеграция в `NewNodesPanel.tsx`
Панель создания нод:
- Блокирует создание новых нод, если есть невалидные
- Показывает alert с перечислением невалидных нод и их ошибок

## Примеры использования

### Проверка валидности сценария

```typescript
import { useScenarioValidation } from '@scenario/core/features/validation';

function MyComponent() {
  const validation = useScenarioValidation(scenarioId);

  if (validation.hasInvalidNodes) {
    console.log('Невалидные ноды:', validation.invalidNodes);
  }

  return <div>Валидация: {validation.canSave ? '✓' : '✗'}</div>;
}
```

### Проверка конкретной ноды

```typescript
import { useNodeValidationErrors } from '@scenario/core/features/validation';

function MyNodeComponent({ nodeId }: { nodeId: Guid }) {
  const errors = useNodeValidationErrors(scenarioId, nodeId);

  if (errors) {
    return (
      <div className="errors">
        {errors.map(err => <div key={err}>{err}</div>)}
      </div>
    );
  }

  return null;
}
```

### Валидация отдельного DTO

```typescript
import { validateNodeDto } from '@scenario/core/features/validation';

const dto: DelayStepDto = { /* ... */ };
const result = validateNodeDto(dto, FlowType.Delay);

if (!result.valid) {
  console.log('Ошибки:', result.errors);
}
```

## Как добавить валидацию для нового типа ноды

### Шаг 1: Создайте новый валидатор

Создайте файл `validators/MyNewStepValidator.ts`:

```typescript
import type { MyNewStepDto } from '@scenario/shared/contracts/...';
import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { NodeValidationContract, ValidationResult } from '../contracts/ValidationContract';
import { createValidationResult, combineValidationResults } from '../contracts/ValidationContract';
import { BaseStepValidator } from './BaseStepValidator';

export class MyNewStepValidator extends BaseStepValidator implements NodeValidationContract<MyNewStepDto> {
    readonly type = FlowType.MyNewStep;
    readonly displayName = 'My New Step Validator';

    validate(dto: MyNewStepDto): ValidationResult {
        // Валидируем базовые поля (name, taskQueue)
        const baseResult = this.validateBase(dto);

        // Валидируем специфичные поля
        const errors: string[] = [];

        if (!dto.mySpecificField) {
            errors.push('Необходимо заполнить специфичное поле');
        }

        const specificResult = createValidationResult(errors);

        // Комбинируем результаты
        return combineValidationResults(baseResult, specificResult);
    }
}
```

### Шаг 2: Зарегистрируйте валидатор

Откройте `ValidationRegistry.ts` и добавьте импорт и регистрацию:

```typescript
import { MyNewStepValidator } from './validators/MyNewStepValidator';

// В конструкторе:
this.register(new MyNewStepValidator());
```

Готово! Валидатор автоматически будет использоваться системой.

## Архитектурные решения

### Почему валидация в отдельном модуле?
- Разделение ответственности (separation of concerns)
- Переиспользуемость валидаторов
- Легкость тестирования
- Централизованная логика валидации

### Почему блокируем создание новых нод?
- Предотвращаем накопление невалидных данных
- Улучшаем UX - пользователь сразу видит проблему
- Упрощаем отладку - меньше невалидных нод

### Почему не отправляем невалидные данные?
- Экономим трафик и нагрузку на сервер
- Предотвращаем ошибки валидации на бэкенде
- Улучшаем производительность (нет лишних запросов)

## Возможные улучшения

1. **Визуальная индикация невалидных нод** - подсветка на карте
2. **Real-time валидация при редактировании** - показывать ошибки сразу
3. **Более детальные сообщения об ошибках** - с подсказками как исправить
4. **Валидация связей между нодами** - проверка корректности графа
5. **Локализация сообщений** - поддержка нескольких языков
