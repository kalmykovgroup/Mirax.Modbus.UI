# Save System

Система сохранения изменений сценариев на сервер на основе истории операций.

## Компоненты

### Core модули

- **`operationBuilder.ts`** - Конвертирует записи истории (`HistoryRecord[]`) в операции сервера (`ScenarioOperationDto[]`)
- **`saveSettingsSlice.ts`** - Redux slice для управления настройками сохранения (авто/ручной режим, статус сохранения)
- **`useSaveScenario.ts`** - Хук для сохранения с автосохранением (debounce 3 секунды)

### UI компоненты

- **`SaveIndicator`** - Индикатор состояния сохранения (сохранено/сохранение/ошибка)
- **`SaveSettingsButton`** - Кнопка открытия настроек режима сохранения
- **`ManualSaveButton`** - Кнопка ручного сохранения (видна только в ручном режиме)
- **`PreviewOperationsButton`** - Кнопка предпросмотра операций перед отправкой

## Как это работает

1. **История операций** - все изменения (создание/обновление/удаление) записываются в `historySlice`
2. **Построение операций** - при сохранении `operationBuilder` конвертирует историю в формат API
3. **Объединение операций** - множественные операции над одной сущностью схлопываются в одну:
   - `Create + Update(s)` → `Create` (с финальными данными)
   - `Create + Delete` → ничего (сущность создана и сразу удалена)
   - `Update(s)` → `Update` (с финальными данными)
   - `Update(s) + Delete` → `Delete` (с изначальными данными)
4. **Отправка на сервер** - через `useApplyScenarioChangesMutation` (RTK Query)
5. **Очистка истории** - после успешного сохранения история очищается

### Пример объединения

История:
```
1. Update Node X: { x: 100, y: 100, name: "Step 1" }
2. Update Node X: { x: 150, y: 100, name: "Step 1" }
3. Update Node X: { x: 150, y: 120, name: "Step 1" }
4. Update Node X: { x: 150, y: 120, name: "New Step" }
```

Результат отправки на сервер (1 операция):
```
Update Node X: { x: 150, y: 120, name: "New Step" }
```

## Режимы работы

### Автосохранение (по умолчанию)
- Изменения автоматически сохраняются через 3 секунды после последнего действия
- Таймер сбрасывается при каждом новом изменении (debounce)
- Настройка сохраняется в localStorage

### Ручное сохранение
- Пользователь сохраняет изменения вручную через кнопку "Сохранить"
- Кнопка активна только при наличии несохранённых изменений
- Поддержка горячих клавиш Ctrl+S (TODO)

## Формат операций

```typescript
interface ScenarioOperationDto {
  opId: Guid;              // ID операции (из history record)
  entity: DbEntityType;    // Step | StepRelation | Branch
  action: DbActionType;    // Create | Update | Delete
  payload: unknown;        // DTO сущности
}
```

## API Endpoint

```
POST /scenarios/{id}/change
Body: {
  scenarioId: Guid,
  operations: ScenarioOperationDto[]
}
```

## Визуальные состояния

### SaveIndicator
- 🟢 **Сохранено** - зелёный, показывает время последнего сохранения
- 🟡 **Сохранение...** - жёлтый с анимацией
- 🔴 **Ошибка** - красный, показывает текст ошибки

### ManualSaveButton
- **Активна** - синяя кнопка "Сохранить"
- **Неактивна** - серая кнопка (нет изменений)
- **Скрыта** - в режиме автосохранения

### PreviewOperationsButton
- Показывает количество операций в badge
- Открывает модальное окно с двумя вкладками:
  - **Список** - человеко-читаемый список операций
  - **JSON** - сырой JSON для отладки/копирования

## Интеграция

Все компоненты интегрированы в `ScenarioMap.tsx`:
- **Top-right Panel**: `SaveSettingsButton`, `SaveIndicator`
- **Top-left Panel**: `ManualSaveButton`, `PreviewOperationsButton`

## Зависимости

- Redux (`saveSettings` reducer зарегистрирован в `rootReducer.ts`)
- RTK Query (`scenarioApi.useApplyScenarioChangesMutation`)
- History System (читает `history.contexts[scenarioId].past`)

## Расширение

Для добавления новых типов сущностей:

1. Добавьте новый тип в `StepType` enum (если это шаг) или в `FlowType` (если другая сущность)
2. Обновите `ENTITY_TYPE_MAP` в `operationBuilder.ts`:

```typescript
import { FlowType } from '@scenario/core/ui/nodes/types/flowType';

const ENTITY_TYPE_MAP: Record<string, DbEntityType> = {
  [FlowType.YourNewStep]: DbEntityType.Step,
  // ...
};
```
