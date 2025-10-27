# Исправление: Батчированное удаление/отсоединение ноды со связями

## Проблема

Когда пользователь удалял или отсоединял ноду от ветки, связи этой ноды удалялись из Redux, но эти удаления связей **не попадали в историю**.

### Два сценария:

**1. Удаление ноды (Delete):**
- Вызывается `deleteNode` → `contract.deleteEntity()` → `scenarioSlice.deleteStep`
- `deleteStep` удаляет ноду И все её связи из Redux
- ❌ Но удаление связей не записывалось в историю

**2. Отсоединение от ветки (Shift+Drag):**
- Вызывается `detachStepFromBranch` → обновляет `branchId` на пустую строку
- Связи удаляются (визуально в ReactFlow и/или в Redux)
- ❌ Но удаление связей не записывалось в историю
- ❌ В истории видно только Update (изменение branchId), а не Delete связей

### Последствия:
- ❌ При сохранении связи не удалялись на сервере
- ❌ При Undo ноды связи не восстанавливались
- ❌ Данные на клиенте и сервере расходились

## Решение

Модифицированы методы `deleteNode` и `detachStepFromBranch` в `useScenarioOperations.ts` для использования **batch-операций**.

### Решение для deleteNode

### Логика работы:

```typescript
// ДО исправления:
1. Удаляем ноду через contract.deleteEntity()
2. Записываем удаление ноды в историю
3. ❌ Связи удаляются в scenarioSlice.deleteStep, но НЕ попадают в историю

// ПОСЛЕ исправления (v1 - неправильно):
1. history.startBatch()
2. Удаляем связи через stepRelationContract.deleteEntity()
3. Записываем удаление связей в историю
4. Удаляем ноду через contract.deleteEntity()
5. ❌ scenarioSlice.deleteStep пытается удалить связи снова, но они уже удалены!

// ПОСЛЕ исправления (v2 - правильно):
1. Получаем список связей из Redux (ДО удаления)
2. history.startBatch()
3. ⚠️ Записываем удаление связей в историю (НО НЕ вызываем deleteEntity для связей!)
4. Удаляем ноду через contract.deleteEntity()
   - Это вызывает scenarioSlice.deleteStep
   - deleteStep удаляет ноду и все её связи из Redux
5. Записываем удаление ноды в историю
6. history.commitBatch()
```

**Ключевой момент (deleteNode):** `scenarioSlice.deleteStep` автоматически удаляет все связи при удалении ноды. Мы не должны вызывать `stepRelationContract.deleteEntity()` для связей, иначе получим двойное удаление. Вместо этого мы только **записываем факт удаления связей в историю**.

### Решение для detachStepFromBranch

```typescript
// ДО исправления:
1. Обновляем branchId на ''
2. Записываем Update в историю
3. ❌ Связи удаляются (где-то), но не попадают в историю

// ПОСЛЕ исправления:
1. Получаем список связей из Redux
2. history.startBatch()
3. Удаляем связи через stepRelationContract.deleteEntity()
4. Записываем удаление связей в историю
5. Обновляем branchId через applySnapshot
6. Записываем Update в историю
7. history.commitBatch()
```

**Ключевой момент (detachStepFromBranch):** При отсоединении ноды от ветки связи должны быть удалены явно, т.к. `updateStep` их не трогает. Мы вызываем `stepRelationContract.deleteEntity()` для каждой связи и записываем удаление в историю.

### Результат:

**Для deleteNode** - одна запись батча содержит:
- Удаление всех связей ноды (Delete)
- Удаление самой ноды (Delete)

**Для detachStepFromBranch** - одна запись батча содержит:
- Удаление всех связей ноды (Delete)
- Обновление ноды (Update - изменение branchId на '')

При **Undo deleteNode** (обратный порядок):
1. Восстанавливается нода (из `before` snapshot)
2. Восстанавливаются все связи (из `before` snapshot)

При **Undo detachStepFromBranch** (обратный порядок):
1. Восстанавливается branchId ноды (из `before` snapshot)
2. Восстанавливаются все связи (из `before` snapshot)

При **Redo** (прямой порядок):
1. Удаляются все связи
2. Удаляется нода (deleteNode) или обновляется branchId (detachStepFromBranch)

## Критерии приёмки

✅ **Сценарий 1: Удаление ноды с связями (Delete)**
1. Создать ноду A
2. Создать ноду B
3. Создать связь A → B
4. Удалить ноду B (через Delete)
5. Проверить историю: должна быть 1 запись батча "Удаление ноды 'B' со связями"
6. Батч содержит: 1 Delete связи + 1 Delete ноды
7. Undo: нода B и связь A → B восстанавливаются
8. Redo: нода B и связь A → B удаляются

✅ **Сценарий 2: Отсоединение ноды от ветки (Shift+Drag)**
1. Создать ноду A в ветке
2. Создать ноду B в ветке
3. Создать связь A → B
4. Вынести ноду B из ветки через Shift+Drag
5. Проверить историю: должна быть 1 запись батча "Отсоединение ноды 'B' от ветки со связями"
6. Батч содержит: 1 Delete связи + 1 Update ноды (branchId: '' )
7. Undo: нода B возвращается в ветку и связь A → B восстанавливается
8. Redo: нода B выносится из ветки и связь A → B удаляется

✅ **Сценарий 3: Удаление ноды с множественными связями**
1. Создать ноды A, B, C
2. Создать связи A → C, B → C
3. Удалить ноду C
4. Проверить историю: должна быть 1 запись батча с 2 удалениями связей и удалением ноды
5. Undo: нода C и обе связи восстанавливаются
6. Redo: всё удаляется обратно

✅ **Сценарий 4: Сохранение на сервер**
1. Создать ноду A → B
2. Удалить ноду B
3. Сохранить
4. Проверить операции предпросмотра: должны быть операции Delete для связи и ноды
5. После сохранения на сервере связь и нода должны быть удалены

## Код изменений

### useScenarioOperations.ts:223-297

```typescript
const deleteNode = useCallback(
    (node: FlowNode) => {
        // ... валидация ...

        // Получаем все связи ДО удаления
        const state = store.getState();
        const scenarioState = state.scenario.scenarios[scenarioId];
        const relationsToDelete = Object.values(scenarioState.relations).filter(
            (rel) => rel.parentStepId === node.id || rel.childStepId === node.id
        );

        // ✅ Используем batch для группировки
        if (relationsToDelete.length > 0) {
            history.startBatch();

            // ⚠️ НЕ вызываем stepRelationContract.deleteEntity()!
            // deleteStep в scenarioSlice сам удалит связи из Redux.
            // Мы только записываем удаление связей в историю.
            for (const relation of relationsToDelete) {
                history.recordDelete(toEntity(relation, 'StepRelation'));
            }

            // Удаляем ноду (deleteStep внутри удалит и связи)
            contract.onBeforeDelete?.(dto);
            contract.deleteEntity(dto.id); // Это вызовет deleteStep
            history.recordDelete(toEntity(dto, node.type));

            history.commitBatch(`Удаление ноды "${dto.name || node.id}" со связями`);
        } else {
            // Если связей нет - удаляем просто ноду
            contract.onBeforeDelete?.(dto);
            contract.deleteEntity(dto.id);
            history.recordDelete(toEntity(dto, node.type));
        }

        return true;
    },
    [scenarioId, history, toEntity]
);
```

## Тестирование

### Автоматическое тестирование (TODO)
```typescript
describe('deleteNode with relations', () => {
  it('should create batch record for node deletion with relations', () => {
    // Arrange: создать ноды и связи
    // Act: удалить ноду
    // Assert: проверить что в истории 1 batch запись
  });

  it('should restore node and relations on undo', () => {
    // Arrange: создать и удалить ноду со связями
    // Act: undo
    // Assert: нода и связи восстановлены
  });

  it('should delete node and relations on redo', () => {
    // Arrange: создать, удалить, undo
    // Act: redo
    // Assert: нода и связи удалены
  });
});
```

### Ручное тестирование

1. ✅ Открыть сценарий
2. ✅ Создать 2 ноды и связь между ними
3. ✅ Выбрать вторую ноду и нажать Delete
4. ✅ Открыть панель истории - должна быть 1 запись батча
5. ✅ Нажать Undo - нода и связь восстанавливаются
6. ✅ Нажать Redo - нода и связь удаляются
7. ✅ Открыть "Предпросмотр изменений" - должны быть операции Delete для связи и ноды
8. ✅ Сохранить на сервер - должно успешно сохраниться

## Связанные файлы

- `useScenarioOperations.ts` - основное исправление
- `historySlice.ts` - логика undo/redo для batch (уже работала корректно)
- `scenarioSlice.ts` - deleteStep удаляет связи в Redux (не изменён)
- `operationBuilder.ts` - конвертация истории в операции API (не изменён)

## Дополнительные улучшения

- ✅ Добавлены логи для отладки батч-операций
- ✅ Описание батча включает имя ноды для лучшей читаемости в истории
- ✅ Обработка случая когда у ноды нет связей (не создаём пустой батч)
