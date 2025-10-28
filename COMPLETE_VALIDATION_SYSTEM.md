# Полная система валидации для редактора сценариев

## Общая сводка

Реализована комплексная система валидации нод с визуальной индикацией ошибок и автоматической фокусировкой на проблемных элементах.

## Часть 1: Базовая система валидации

### Что реализовано:

1. **Контракт-ориентированная архитектура**
   - `NodeValidationContract` - интерфейс для всех валидаторов
   - `BaseStepValidator` - базовый класс для степов
   - Специализированные валидаторы для каждого типа ноды

2. **ValidationRegistry**
   - Централизованное хранилище валидаторов
   - Автоматическая регистрация при инициализации
   - Доступ по типу ноды

3. **Интеграция в автосохранение**
   - Проверка валидности перед отправкой на сервер
   - Блокировка сохранения при наличии ошибок
   - Детальные сообщения об ошибках

4. **Блокировка создания новых нод**
   - Нельзя создать новую ноду с невалидными данными
   - Alert с перечислением проблем

### Валидаторы для типов нод:

| Тип ноды | Валидатор | Проверяемые поля |
|----------|-----------|------------------|
| **ActivityModbus** | ActivityModbusStepValidator | name, taskQueue, sessionId, connectionConfigId, modbusDeviceActionId, modbusDeviceAddressId |
| **ActivitySystem** | ActivitySystemStepValidator | name, taskQueue, systemActionId |
| **Delay** | DelayStepValidator | name, taskQueue, timeSpan |
| **Signal** | SignalStepValidator | name, taskQueue, signalKey |
| **Jump** | JumpStepValidator | name, taskQueue, jumpToStepId |
| **Parallel** | ParallelStepValidator | name, taskQueue, stepBranchRelations (минимум 2) |
| **Condition** | ConditionStepValidator | name, taskQueue, stepBranchRelations (минимум 2) |
| **Branch** | BranchValidator | name |

## Часть 2: Визуальная индикация

### Что реализовано:

1. **ValidationErrorBadge**
   - Красный восклицательный знак в правом верхнем углу
   - Пульсирующая анимация (2s цикл)
   - Tooltip с полным списком ошибок при наведении

2. **withValidation HOC**
   - Оборачивает любой компонент ноды
   - Автоматически получает ошибки валидации
   - Добавляет красноватое затемнение
   - Пульсирующее свечение (3s цикл)

3. **Фокусировка на ошибках**
   - Автоматический переход к невалидной ноде
   - Плавная анимация камеры (800ms)
   - Автоматическое выделение ноды
   - Оптимальное масштабирование

## Архитектура системы

```
┌─────────────────────────────────────────────────────────────┐
│                    Validation System                         │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐         ┌───────▼──────────┐
        │ Core Validation│         │ Visual Indication│
        └───────┬────────┘         └───────┬──────────┘
                │                           │
    ┌───────────┼───────────┐      ┌───────┼───────────┐
    │           │           │      │       │           │
┌───▼───┐  ┌───▼───┐  ┌───▼───┐  ▼       ▼           ▼
│Registry│  │Hooks  │  │Utils  │ Badge   HOC       Focus
└────────┘  └───────┘  └───────┘
    │           │           │
    ▼           ▼           ▼
Validators  Validation  Integration
           Components
```

## Структура файлов

```
validation/
├── contracts/
│   └── ValidationContract.ts           # Интерфейс валидаторов
├── validators/
│   ├── BaseStepValidator.ts            # Базовый класс
│   ├── ActivityModbusStepValidator.ts  # Для ActivityModbus
│   ├── ActivitySystemStepValidator.ts  # Для ActivitySystem
│   ├── DelayStepValidator.ts           # Для Delay
│   ├── SignalStepValidator.ts          # Для Signal
│   ├── JumpStepValidator.ts            # Для Jump
│   ├── ParallelStepValidator.ts        # Для Parallel
│   ├── ConditionStepValidator.ts       # Для Condition
│   └── BranchValidator.ts              # Для Branch
├── ValidationRegistry.ts               # Реестр валидаторов
├── nodeValidation.ts                   # Публичное API
├── useScenarioValidation.ts            # React хук
├── focusInvalidNode.ts                 # Утилиты фокусировки
├── index.ts                            # Экспорты
└── README.md                           # Документация

nodes/shared/
├── ValidationErrorBadge/
│   ├── ValidationErrorBadge.tsx        # Компонент значка
│   └── ValidationErrorBadge.module.css # Стили значка
└── withValidation/
    ├── withValidation.tsx              # HOC
    └── withValidation.module.css       # Стили эффектов

Интеграция:
├── useSaveScenario.ts                  # Автосохранение
├── ManualSaveButton.tsx                # Кнопка сохранения
└── NewNodesPanel.tsx                   # Панель создания нод
```

## Как работает система

### 1. Валидация при сохранении

```typescript
// useSaveScenario.ts
const validation = useScenarioValidation(scenarioId);

if (validation.hasInvalidNodes) {
    // Показываем ошибку
    dispatch(setSaveError(errorMessage));

    // Фокусируемся на первой невалидной ноде
    if (focusHandler) {
        focusHandler(firstInvalidNode.nodeId);
    }

    return; // Не сохраняем
}
```

### 2. Визуальная индикация

```typescript
// withValidation HOC
function ValidationWrapper(props) {
    const errors = useNodeValidationErrors(scenarioId, props.id);
    const hasErrors = errors && errors.length > 0;

    return (
        <div className={hasErrors ? styles.invalidNodeContainer : undefined}>
            {hasErrors && <ValidationErrorBadge errors={errors} />}
            <WrappedComponent {...props} />
        </div>
    );
}
```

### 3. Фокусировка на ошибке

```typescript
// focusInvalidNode.ts
export function focusOnInvalidNode(rf, nodeId, duration = 800) {
    const node = rf.getNode(nodeId);

    // Выделяем ноду
    rf.setNodes((nodes) =>
        nodes.map((n) => ({
            ...n,
            selected: n.id === nodeId,
        }))
    );

    // Фокусируем камеру
    rf.fitView({
        nodes: [node],
        duration,
        padding: 0.5,
        maxZoom: 1.5,
    });
}
```

## Примеры использования

### Добавление нового валидатора

```typescript
// 1. Создаем валидатор
class MyNewStepValidator extends BaseStepValidator
    implements NodeValidationContract<MyNewStepDto> {

    readonly type = FlowType.MyNewStep;
    readonly displayName = 'My New Step Validator';

    validate(dto: MyNewStepDto): ValidationResult {
        const baseResult = this.validateBase(dto);
        const errors: string[] = [];

        if (!dto.mySpecificField) {
            errors.push('Необходимо заполнить специфичное поле');
        }

        return combineValidationResults(baseResult,
            createValidationResult(errors));
    }
}

// 2. Регистрируем в ValidationRegistry.ts
this.register(new MyNewStepValidator());

// 3. Оборачиваем компонент ноды
export const MyNewStepNode = withValidation(MyNewStepNodeComponent);
```

### Использование валидации в компоненте

```typescript
import { useScenarioValidation } from '@scenario/core/features/validation';

function MyComponent() {
    const validation = useScenarioValidation(scenarioId);

    if (validation.hasInvalidNodes) {
        console.log('Невалидные ноды:', validation.invalidNodes);
        // [{nodeId, nodeType, nodeName, errors: ['error1', 'error2']}]
    }

    return (
        <div>
            Статус: {validation.canSave ? 'Можно сохранить' : 'Есть ошибки'}
        </div>
    );
}
```

## Визуальные эффекты

### CSS Анимации

```css
/* Пульсация значка ошибки */
@keyframes pulse {
    0%, 100% {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    50% {
        box-shadow: 0 2px 8px rgba(220, 53, 69, 0.6);
    }
}

/* Пульсация свечения ноды */
@keyframes errorPulse {
    0%, 100% {
        filter: drop-shadow(0 0 8px rgba(220, 53, 69, 0.5));
    }
    50% {
        filter: drop-shadow(0 0 12px rgba(220, 53, 69, 0.7));
    }
}
```

### Цветовая палитра

- **Основной цвет ошибок:** `#dc3545` (красный)
- **Фон tooltip:** `#2b2b2b` (темный)
- **Текст ошибок:** `#e0e0e0` (светлый)
- **Наложение:** `rgba(220, 53, 69, 0.08)` (прозрачный красный)

## Производительность

### Оптимизации:

1. **Мемоизация валидации**
   - `useMemo` для кеширования результатов
   - Перерасчет только при изменении нод

2. **HOC паттерн**
   - Переиспользование логики без дублирования
   - Минимальные дополнительные ререндеры

3. **GPU-ускоренные анимации**
   - Используются `transform` и `opacity`
   - Не вызывают reflow/repaint

4. **Селективное обновление**
   - Redux селекторы с точным сравнением
   - Обновление только измененных нод

## Тестирование

### Сценарии тестирования:

1. **Создание невалидной ноды**
   - Создать ноду без заполнения полей
   - Должен появиться красный значок
   - При наведении - tooltip с ошибками
   - Нельзя создать еще одну ноду

2. **Попытка сохранения**
   - Нажать "Сохранить" с невалидными нодами
   - Должна показаться ошибка
   - Камера переместится к первой невалидной ноде
   - Нода будет выделена

3. **Исправление ошибок**
   - Заполнить все обязательные поля
   - Красный значок должен исчезнуть
   - Свечение ноды должно пропасть
   - Сохранение должно работать

## Преимущества решения

✅ **Интуитивно** - визуальная индикация понятна пользователю
✅ **Информативно** - детальное описание каждой ошибки
✅ **Автоматизировано** - система сама направляет к проблеме
✅ **Масштабируемо** - легко добавить новые типы нод
✅ **Производительно** - минимальное влияние на рендеринг
✅ **Поддерживаемо** - чистая архитектура и разделение ответственности

## Заключение

Система валидации полностью решает все поставленные задачи:

1. ✅ Автосохранение не отправляет невалидные данные
2. ✅ Блокировка создания новых нод при наличии невалидных
3. ✅ Визуальная индикация ошибок (значок, tooltip, затемнение)
4. ✅ Автоматическая фокусировка на проблемных нодах

Пользователь получает полный контроль над валидностью данных и всегда знает, что нужно исправить!
