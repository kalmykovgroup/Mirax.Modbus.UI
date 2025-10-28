# Решение проблем - Система редактирования нод

## Проблема: "Uncaught SyntaxError: does not provide an export named..."

### Симптомы:
```
Uncaught SyntaxError: The requested module '/src/.../DelayStepNode.tsx'
does not provide an export named 'DelayStepNode'
```

### Причина:
Vite кеширует старую версию модуля и не может правильно обработать изменения.

### Решение:
1. **Остановите dev-сервер** (Ctrl+C в терминале)
2. **Очистите кеш:**
   ```bash
   rm -rf node_modules/.vite
   ```
3. **Перезапустите dev-сервер:**
   ```bash
   npm run dev
   ```
4. **Жесткое обновление в браузере:** Ctrl+F5 (или Ctrl+Shift+R)

## Проблема: "Element type is invalid. Received a promise that resolves to: undefined"

### Симптомы:
```
Error: Element type is invalid. Received a promise that resolves to: undefined.
Lazy element type must resolve to a class or function.
```

### Причина:
Попытка использовать lazy import с именованными экспортами некорректно.

### Решение:
Используйте прямые импорты в NodeContract файлах:

```typescript
// ✅ Правильно
import { DelayStepNode } from './DelayStepNode';

export const DelayStepNodeContract: NodeTypeContract<DelayStepDto> = {
    Component: DelayStepNode as any,
    // ...
};

// ❌ Неправильно (для именованных экспортов)
import { lazy } from 'react';
const DelayStepNode = lazy(() => import('./DelayStepNode').then(m => ({ default: m.DelayStepNode })));
```

## Проблема: Кнопка редактирования не появляется

### Решение 1: Проверьте hover
Кнопка появляется только при наведении мыши или когда нода выбрана. Попробуйте:
1. Навести мышь на ноду
2. Кликнуть на ноду (выбрать)

### Решение 2: Проверьте z-index
ValidationErrorBadge не должен перекрывать кнопку. Кнопка находится справа (`right: 28px`), значок ошибки - правее (`right: 4px`).

### Решение 3: Жесткое обновление
Ctrl+F5 в браузере для очистки кеша

## Проблема: Модальное окно не открывается

### Проверьте:
1. **NodeEditModalProvider** добавлен в `ScenarioMap.tsx`:
   ```tsx
   <NodeEditModalProvider>
       {/* ReactFlow и другие компоненты */}
   </NodeEditModalProvider>
   ```

2. **Контракт передан в useNodeEdit:**
   ```tsx
   const { EditButton, containerProps } = useNodeEdit(id, selected, MyEditContract);
   ```

3. **Консоль браузера** - проверьте ошибки JavaScript

## Проблема: Изменения в модальном окне не сохраняются

### Проверьте:
1. Контракт использует `onChange` для обновления:
   ```tsx
   renderContent: ({ dto, onChange }) => (
       <input
           value={dto.name}
           onChange={(e) => onChange({ name: e.target.value })}
       />
   )
   ```

2. Проверьте validation - возможно форма не проходит валидацию

3. Проверьте консоль - могут быть ошибки при сохранении

## Общие рекомендации

### При любых странных проблемах:
1. Остановите dev-сервер
2. Удалите кеш: `rm -rf node_modules/.vite`
3. Перезапустите: `npm run dev`
4. Жесткое обновление браузера: Ctrl+F5

### Проверка работоспособности:
1. Откройте редактор сценариев
2. Наведите на любую ноду
3. Должна появиться синяя кнопка с карандашом справа вверху
4. Клик должен открыть модальное окно

### Если проблема остается:
1. Проверьте консоль браузера (F12)
2. Проверьте консоль dev-сервера
3. Проверьте, что все файлы на месте:
   - `src/features/scenarioEditor/core/ui/nodes/shared/NodeEditButton/`
   - `src/features/scenarioEditor/core/ui/nodes/shared/NodeEditModal/`
