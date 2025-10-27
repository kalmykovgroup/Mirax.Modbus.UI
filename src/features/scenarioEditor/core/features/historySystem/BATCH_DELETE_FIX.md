# Исправление: Батчированное удаление/перенос ноды со связями

## Проблема

Когда пользователь удалял или переносил ноду, связи этой ноды удалялись из Redux, но эти удаления связей **не попадали в историю**.

### Три сценария:

**1. Удаление ноды (Delete):**
- Вызывается `deleteNode` → `contract.deleteEntity()` → `scenarioSlice.deleteStep`
- `deleteStep` удаляет ноду И все её связи из Redux
- ❌ Но удаление связей не записывалось в историю

**2. Вынос ноды на свободное пространство (Shift+Drag → поле):**
- `NodeDragStopHandler` определяет, что нода вынесена без target
- Вызывается `onStepDetachedFromBranch` → который вызывал `detachStepFromBranch`
- `detachStepFromBranch` обновлял `branchId` на пустую строку
- ❌ Нода оставалась в системе с пустым branchId вместо удаления
- ❌ Связи удалялись визуально, но не попадали в историю

**3. Перенос ноды в другую ветку (Shift+Drag → другая ветка):**
- `NodeDragStopHandler` определяет target (другая ветка)
- Вызывается `onStepAttachedToBranch` → `attachStepToBranch`
- `attachStepToBranch` обновлял только `branchId`
- ❌ Связи удалялись визуально, но не попадали в историю

### Последствия:
- ❌ При сохранении связи не удалялись на сервере
- ❌ При Undo ноды связи не восстанавливались
- ❌ Данные на клиенте и сервере расходились

## Решение

Модифицированы методы `deleteNode`, `attachStepToBranch` и обработчик `onStepDetachedFromBranch` в `useScenarioOperations.ts` и `ScenarioMap.tsx` для использования **batch-операций**.

### Решение 1: deleteNode (удаление через Delete)

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

### Решение 2: onStepDetachedFromBranch (Shift+Drag → свободное пространство)

```typescript
// ДО исправления:
onStepDetachedFromBranch: (stepId) => {
    operations.detachStepFromBranch(stepNode, x, y);
    // Обновлял branchId на '', нода оставалась в системе
}

// ПОСЛЕ исправления:
onStepDetachedFromBranch: (stepId) => {
    operations.deleteNode(stepNode);
    // Удаляет ноду и записывает удаление связей в историю через batch
}
```

**Ключевой момент:** Вынос ноды на свободное пространство = **полное удаление** ноды из сценария. Используется тот же механизм, что и при Delete.

### Решение 3: attachStepToBranch (Shift+Drag → другая ветка)

```typescript
// ДО исправления:
1. Обновляем branchId
2. Записываем Update в историю
3. ❌ Связи удаляются визуально, но не попадают в историю

// ПОСЛЕ исправления:
1. Получаем список связей из Redux
2. history.startBatch()
3. Удаляем связи через stepRelationContract.deleteEntity()
4. Записываем удаление связей в историю
5. Обновляем branchId через applySnapshot
6. Записываем Update в историю
7. history.commitBatch("Перенос ноды 'X' в другую ветку")
```

**Ключевой момент:** При переносе ноды в другую ветку связи должны быть удалены явно, т.к. `updateStep` их не трогает. Мы вызываем `stepRelationContract.deleteEntity()` для каждой связи и записываем удаление в историю.

### Результат:

**1. deleteNode (Delete)** - одна запись батча содержит:
- N операций Delete для связей
- 1 операция Delete для ноды

**2. onStepDetachedFromBranch (Shift+Drag → поле)** - одна запись батча содержит:
- N операций Delete для связей
- 1 операция Delete для ноды
- (Используется тот же `deleteNode`)

**3. attachStepToBranch (Shift+Drag → другая ветка)** - одна запись батча содержит:
- N операций Delete для связей
- 1 операция Update для ноды (новый branchId)

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

✅ **Сценарий 2: Вынос ноды на свободное пространство (Shift+Drag → поле)**
1. Создать ноду A в ветке
2. Создать ноду B в ветке
3. Создать связь A → B
4. Вынести ноду B на свободное пространство через Shift+Drag
5. Проверить историю: должна быть 1 запись батча "Удаление ноды 'B' со связями"
6. Батч содержит: 1 Delete связи + 1 Delete ноды
7. Undo: нода B восстанавливается в ветке и связь A → B восстанавливается
8. Redo: нода B и связь A → B удаляются

✅ **Сценарий 3: Перенос ноды в другую ветку (Shift+Drag → другая ветка)**
1. Создать ветку Branch1 и ветку Branch2
2. Создать ноду A в Branch1
3. Создать ноду B в Branch1
4. Создать связь A → B
5. Перенести ноду B в Branch2 через Shift+Drag
6. Проверить историю: должна быть 1 запись батча "Перенос ноды 'B' в другую ветку"
7. Батч содержит: 1 Delete связи + 1 Update ноды (новый branchId)
8. Undo: нода B возвращается в Branch1 и связь A → B восстанавливается
9. Redo: нода B переносится в Branch2 и связь A → B удаляется

✅ **Сценарий 4: Удаление ноды с множественными связями**
1. Создать ноды A, B, C
2. Создать связи A → C, B → C
3. Удалить ноду C
4. Проверить историю: должна быть 1 запись батча с 2 удалениями связей и удалением ноды
5. Undo: нода C и обе связи восстанавливаются
6. Redo: всё удаляется обратно

✅ **Сценарий 5: Сохранение на сервер**
1. Создать ноду A → B
2. Удалить ноду B
3. Сохранить
4. Проверить операции предпросмотра: должны быть операции Delete для связи и ноды
5. После сохранения на сервере связь и нода должны быть удалены

## Исправление валидации

### Проблема

В контрактах нод была валидация, которая запрещала удаление ноды, если у неё есть связи:

```typescript
case 'delete':
    if (dto.childRelations && dto.childRelations.length > 0) {
        return {
            valid: false,
            error: 'Нельзя удалить степ с дочерними связями. Сначала удалите связи.',
        };
    }
    return { valid: true };
```

### Решение

Убрана валидация из всех контрактов нод. Теперь ноду можно удалить всегда, а связи удаляются автоматически через batch:

```typescript
case 'delete':
    // Степ можно удалить всегда. Связи будут удалены автоматически в deleteNode через batch.
    return { valid: true };
```

### ScenarioMap.tsx - исправление двойного удаления

**До исправления:**
```typescript
onDeleted: (payload) => {
    // Удаляем ноды
    for (const node of payload.nodes) {
        operations.deleteNode(node); // ← Удаляет связи внутри
    }
    // Удаляем связи
    for (const edge of payload.edges) {
        operations.deleteRelation(edge.id); // ← Двойное удаление!
    }
}
```

**После исправления:**
```typescript
onDeleted: (payload) => {
    // Удаляем ноды (deleteNode автоматически удалит связи этих нод через batch)
    for (const node of payload.nodes) {
        if (node.data.__persisted === true) {
            operations.deleteNode(node);
        }
    }

    // Удаляем только те связи, которые НЕ связаны с удаляемыми нодами
    const deletedNodeIds = new Set(payload.nodes.map(n => n.id));
    for (const edge of payload.edges) {
        if (!deletedNodeIds.has(edge.source) && !deletedNodeIds.has(edge.target)) {
            operations.deleteRelation(edge.id);
        }
    }
}
```

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

- `useScenarioOperations.ts` - основное исправление deleteNode, attachStepToBranch
- `ScenarioMap.tsx` - исправление onDeleted (избежание двойного удаления связей)
- `historySlice.ts` - логика undo/redo для batch (уже работала корректно)
- `scenarioSlice.ts` - deleteStep удаляет связи в Redux (не изменён)
- `operationBuilder.ts` - конвертация истории в операции API (не изменён)
- Все `*NodeContract.ts` - убрана валидация delete (теперь можно удалять ноды со связями)

## Дополнительные улучшения

- ✅ Добавлены логи для отладки батч-операций
- ✅ Описание батча включает имя ноды для лучшей читаемости в истории
- ✅ Обработка случая когда у ноды нет связей (не создаём пустой батч)
- ✅ Убрана валидация delete из всех контрактов нод (DelayStepNodeContract, JumpStepNodeContract, ActivityModbusNodeContract, ActivitySystemNodeContract, SignalStepNodeContract, ConditionStepNodeContract, ParallelStepNodeContract)
- ✅ ScenarioMap.tsx теперь не удаляет связи повторно при Delete key (избегает двойного удаления)
