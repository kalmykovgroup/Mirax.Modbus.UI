# Система контекстного меню для нод

## Описание

Реализована гибкая система контекстного меню для нод на карте сценария. Меню открывается при клике на ноду и отображает доступные действия.

## Архитектура

### 1. Контракты и типы

**`types.ts`** - Определяет интерфейсы системы:

```typescript
interface NodeContextMenuAction {
    id: string;                           // Уникальный ID действия
    label: string;                        // Отображаемый текст
    icon?: LucideIcon;                    // Иконка из lucide-react
    onClick: (node: FlowNode) => void;    // Обработчик клика
    destructive?: boolean;                // Красный цвет для опасных действий
    disabled?: boolean;                   // Отключенное состояние
    disabledTooltip?: string;             // Подсказка для отключенного действия
}

interface NodeContextMenuProvider {
    getActions(node: FlowNode): NodeContextMenuAction[];
}
```

### 2. Реестр провайдеров

**`NodeContextMenuRegistry.ts`** - Централизованное хранилище провайдеров:

```typescript
class NodeContextMenuRegistryClass {
    register(type: FlowType, provider: NodeContextMenuProvider): void
    get(type: FlowType): NodeContextMenuProvider | undefined
    has(type: FlowType): boolean
}
```

Позволяет регистрировать разные наборы действий для каждого типа ноды.

### 3. Провайдеры действий

**`BaseNodeContextMenuProvider.ts`** - Базовый провайдер с общими действиями:

- По умолчанию предоставляет действие "Удалить" (с иконкой Trash2)
- Можно расширить для добавления других общих действий
- Другие типы нод могут создавать свои провайдеры, наследуясь от базового

```typescript
class BaseNodeContextMenuProvider implements NodeContextMenuProvider {
    getActions(node: FlowNode): NodeContextMenuAction[] {
        return [this.getDeleteAction(node)];
    }
}
```

### 4. Компонент меню

**`NodeContextMenu.tsx`** - UI компонент контекстного меню:

**Особенности:**
- Отображается в центре ноды с полупрозрачным оверлеем
- Закрывается по клику вне меню
- Закрывается по нажатию Escape
- Поддерживает destructive actions (красный цвет)
- Поддерживает disabled состояние с tooltip

**Стили** (`NodeContextMenu.module.css`):
- Темная тема (#2b2b2b фон)
- Плавные hover эффекты
- Иконки 16x16px
- Минимальная ширина 150px

### 5. Хук управления состоянием

**`useNodeContextMenu.ts`** - Хук для работы с меню:

```typescript
const { state, openMenu, closeMenu } = useNodeContextMenu();

// state.node - текущая нода
// state.actions - действия для текущей ноды
// state.isOpen - открыто ли меню
```

### 6. Инициализация

**`initializeProviders.ts`** - Регистрация провайдеров для всех типов нод:

```typescript
initializeNodeContextMenuProviders((node: FlowNode) => {
    // Обработчик удаления
    if (node.data.__persisted === true) {
        operations.deleteNode(node);
    } else {
        setNodes((nds) => nds.filter((n) => n.id !== node.id));
    }
});
```

## Интеграция в ScenarioMap

1. **Импорты:**
```typescript
import {
    NodeContextMenu,
    useNodeContextMenu,
    initializeNodeContextMenuProviders
} from '@scenario/core/ui/nodes/shared/NodeContextMenu';
```

2. **Состояние:**
```typescript
const contextMenu = useNodeContextMenu();
```

3. **Инициализация провайдеров:**
```typescript
React.useEffect(() => {
    initializeNodeContextMenuProviders((node: FlowNode) => {
        // Обработчик удаления ноды
        if (node.data.__persisted === true) {
            operations.deleteNode(node);
        } else {
            setNodes((nds) => nds.filter((n) => n.id !== node.id));
        }
        contextMenu.closeMenu();
    });
}, [operations, setNodes, contextMenu]);
```

4. **Обработчик клика на ноду:**
```typescript
const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: FlowNode): void => {
        contextMenu.openMenu(node);
    },
    [contextMenu]
);
```

5. **Рендер меню:**
```typescript
<ReactFlow
    onNodeClick={handleNodeClick}
    // ... другие props
>
    {/* ... */}

    {contextMenu.state.isOpen && contextMenu.state.node && (
        <NodeContextMenu
            node={contextMenu.state.node}
            actions={contextMenu.state.actions}
            onClose={contextMenu.closeMenu}
        />
    )}
</ReactFlow>
```

## Изменения

### Удалено
- ❌ Кнопка "Удалить" из `Panel position="bottom-left"` в ScenarioMap.tsx

### Добавлено
- ✅ Контекстное меню при клике на ноду
- ✅ Систему провайдеров действий для разных типов нод
- ✅ Базовое действие "Удалить" для всех типов нод

## Расширение системы

### Добавление новых действий

Чтобы добавить специфические действия для типа ноды:

1. **Создать кастомный провайдер:**

```typescript
// DelayStepContextMenuProvider.ts
import { Copy } from 'lucide-react';
import { BaseNodeContextMenuProvider } from './BaseNodeContextMenuProvider';

export class DelayStepContextMenuProvider extends BaseNodeContextMenuProvider {
    getActions(node: FlowNode): NodeContextMenuAction[] {
        const baseActions = super.getActions(node); // Получаем "Удалить"

        return [
            {
                id: 'duplicate',
                label: 'Дублировать',
                icon: Copy,
                onClick: (node) => {
                    // Логика дублирования
                },
            },
            ...baseActions, // "Удалить" в конце
        ];
    }
}
```

2. **Зарегистрировать в `initializeProviders.ts`:**

```typescript
import { DelayStepContextMenuProvider } from './providers/DelayStepContextMenuProvider';

export function initializeNodeContextMenuProviders(onDelete: (node: FlowNode) => void): void {
    // Специализированный провайдер для Delay
    NodeContextMenuRegistry.register(
        FlowType.Delay,
        new DelayStepContextMenuProvider(onDelete)
    );

    // Базовый провайдер для остальных
    const createProvider = () => new BaseNodeContextMenuProvider(onDelete);
    NodeContextMenuRegistry.register(FlowType.ActivityModbus, createProvider());
    // ...
}
```

### Пример: Добавить "Редактировать" для всех нод

```typescript
// BaseNodeContextMenuProvider.ts
import { Edit, Trash2 } from 'lucide-react';

export class BaseNodeContextMenuProvider implements NodeContextMenuProvider {
    protected onEdit?: (node: FlowNode) => void;

    constructor(onDelete?: (node: FlowNode) => void, onEdit?: (node: FlowNode) => void) {
        this.onDelete = onDelete;
        this.onEdit = onEdit;
    }

    getActions(node: FlowNode): NodeContextMenuAction[] {
        const actions: NodeContextMenuAction[] = [];

        if (this.onEdit) {
            actions.push({
                id: 'edit',
                label: 'Редактировать',
                icon: Edit,
                onClick: this.onEdit,
            });
        }

        actions.push(this.getDeleteAction(node));

        return actions;
    }
}
```

## Зарегистрированные типы нод

Все следующие типы нод имеют контекстное меню с действием "Удалить":

- ✅ DelayStepNode
- ✅ ActivityModbusNode
- ✅ ActivitySystemNode
- ✅ SignalStepNode
- ✅ JumpStepNode
- ✅ ParallelStepNode
- ✅ ConditionStepNode
- ✅ BranchNode

## Структура файлов

```
src/features/scenarioEditor/core/ui/nodes/shared/NodeContextMenu/
├── index.ts                          # Экспорты
├── types.ts                          # Контракты и типы
├── NodeContextMenuRegistry.ts        # Реестр провайдеров
├── NodeContextMenu.tsx               # UI компонент
├── NodeContextMenu.module.css        # Стили
├── useNodeContextMenu.ts             # Хук управления состоянием
├── initializeProviders.ts            # Инициализация провайдеров
└── providers/
    └── BaseNodeContextMenuProvider.ts # Базовый провайдер
```

## UI/UX

### Поведение
1. **Открытие:** Клик на любую ноду
2. **Закрытие:**
   - Клик вне меню
   - Нажатие Escape
   - Выполнение любого действия
3. **Позиционирование:** Центр ноды

### Визуальные эффекты
- Полупрозрачный оверлей на всем экране
- Плавная анимация hover (0.15s)
- Destructive actions отображаются красным цветом (#ef4444)
- Disabled actions - полупрозрачные с курсором not-allowed

## Тестирование

1. Кликнуть на любую ноду → должно появиться меню
2. Кликнуть на "Удалить" → нода удаляется, меню закрывается
3. Кликнуть вне меню → меню закрывается без действий
4. Нажать Escape → меню закрывается
5. Проверить для всех 8 типов нод

## Будущие улучшения

1. **Добавить больше действий:**
   - Дублировать ноду
   - Редактировать свойства
   - Копировать/Вставить
   - Экспорт/Импорт

2. **Условная видимость действий:**
   - Показывать разные действия в зависимости от состояния ноды
   - Disabled состояние для действий, недоступных в текущем контексте

3. **Подменю:**
   - Группировка действий в подменю
   - Контекстные подменю для сложных операций

4. **Горячие клавиши:**
   - Отображение горячих клавиш рядом с действиями
   - Поддержка выполнения действий по горячим клавишам
