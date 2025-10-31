# Система редактирования нод - Итоговая документация

## Обзор

Реализована универсальная система редактирования для всех типов нод в редакторе сценариев. Система позволяет редактировать настройки нод через модальные окна с автоматическим сохранением в историю.

## Основные компоненты

### 1. NodeEditButton - Универсальная кнопка редактирования

**Расположение:** `src/features/scenarioEditor/core/ui/nodes/shared/NodeEditButton/`

**Особенности:**
- Автоматическое позиционирование в правом верхнем углу (не требует стилизации в ноде)
- Появляется при наведении или выборе ноды
- Не перекрывает ValidationErrorBadge (сдвинута влево на 28px)
- Z-index: 1000 (отображается поверх всех элементов)

**Файлы:**
- `NodeEditButton.tsx` - Компонент кнопки
- `NodeEditButton.module.css` - Стили с автопозиционированием
- `useNodeEdit.tsx` - Хук для упрощенной интеграции
- `README.md` - Подробная документация по использованию

### 2. NodeEditModal - Система модальных окон

**Расположение:** `src/features/scenarioEditor/core/ui/nodes/shared/NodeEditModal/`

**Особенности:**
- Базовое модальное окно с кнопками Сохранить/Отменить
- Система контрактов для разных типов нод
- Валидация перед сохранением
- Draft state - изменения не применяются до нажатия "Сохранить"
- Интеграция с системой истории через `operations.updateNode()`

**Файлы:**
- `NodeEditModal.tsx` - Базовое модальное окно
- `NodeEditModalProvider.tsx` - Context provider
- `types.ts` - Интерфейс NodeEditContract
- `contracts/PlaceholderEditContract.tsx` - Заглушка для нод без формы

### 3. Контракты редактирования

**Паттерн:** Каждый тип ноды определяет свой контракт редактирования

**Пример контракта:**
```typescript
export const YourNodeEditContract: NodeEditContract<YourNodeDto> = {
    title: 'Редактирование',
    width: 700,
    validate: (dto) => {
        // Валидация
        return errors;
    },
    renderContent: ({ dto, onChange }) => (
        // Форма редактирования
    ),
};
```

## Интегрированные ноды

Кнопка редактирования добавлена во все типы нод:

| Нода | Файл | Контракт | Статус формы |
|------|------|----------|--------------|
| ActivitySystem | `ActivitySystemNode.tsx` | `ActivitySystemEditContract` | ✅ Реализовано |
| Delay | `DelayStepNode.tsx` | Заглушка | 🚧 В разработке |
| Branch | `BranchNode.tsx` | Заглушка | 🚧 В разработке |
| Condition | `ConditionStepNode.tsx` | Заглушка | 🚧 В разработке |
| Jump | `JumpStepNode.tsx` | Заглушка | 🚧 В разработке |
| Parallel | `ParallelStepNode.tsx` | Заглушка | 🚧 В разработке |
| Signal | `SignalStepNode.tsx` | Заглушка | 🚧 В разработке |
| ActivityModbus | `ActivityModbusNode.tsx` | Заглушка | 🚧 В разработке |

## Использование

### Добавление кнопки в новую ноду

```tsx
import { useValidationIndicator } from '@scenario/core/ui/nodes/components/ValidationIndicator';
import { useNodeEdit } from '../shared/NodeEditButton';
import { createPlaceholderContract } from '../shared/NodeEditModal/contracts/PlaceholderEditContract';

// Создайте контракт (или используйте заглушку)
const MyNodeEditContract = createPlaceholderContract('Моя нода');

export function MyNode({ id, data, selected }: Props) {
    const { ValidationIndicator, containerClassName } = useValidationIndicator(id);
    const { EditButton, containerProps } = useNodeEdit(id, selected, MyNodeEditContract);

    return (
        <div
            className={`${styles.container} ${containerClassName}`}
            aria-selected={selected}
            {...containerProps}  // onMouseEnter/onMouseLeave
        >
            {ValidationIndicator}
            {EditButton}  {/* Добавьте кнопку */}

            {/* Остальной контент */}
        </div>
    );
}
```

### Создание формы редактирования

1. Создайте файл `YourNodeEditContent.tsx` рядом с нодой
2. Определите контракт `NodeEditContract<YourNodeDto>`
3. Реализуйте `renderContent` с формой редактирования
4. Добавьте валидацию в `validate` (опционально)
5. Замените `createPlaceholderContract` на ваш контракт

**Пример:** См. `ActivitySystemEditContent.tsx`

## Интеграция с системой сохранения

1. **Изменения в модальном окне** → Draft state (не применяются сразу)
2. **Нажатие "Сохранить"** → Валидация → `operations.updateNode()` → История
3. **Общая система сохранения** → Реальное сохранение на сервер

```
[Модальное окно] → [История] → [Кнопка "Сохранить сценарий"] → [Сервер]
```

## Решенные проблемы

### Проблема 1: CSS Module Scoping
**Симптом:** Кнопка не появлялась при наведении
**Причина:** Селектор `.container:hover .editButton` не работал между разными модулями
**Решение:** Стили и позиционирование встроены в `NodeEditButton.module.css`

### Проблема 2: Конфликт с ValidationErrorBadge
**Симптом:** Кнопка и значок ошибки перекрывали друг друга
**Причина:** Оба элемента в позиции `top: 4px; right: 4px`
**Решение:** Кнопка сдвинута влево (`right: 28px`)

### Проблема 3: Необходимость стилизации в каждой ноде
**Симптом:** Требовалось добавлять CSS в каждую ноду
**Решение:** Создан `useNodeEdit` хук - всё управляется автоматически

## Архитектурные решения

1. **Паттерн контрактов** - позволяет легко добавлять новые типы нод
2. **Draft state** - изменения не применяются до подтверждения
3. **Автопозиционирование** - не требует CSS в нодах
4. **Хук useNodeEdit** - минимум кода для интеграции
5. **Заглушки** - кнопка работает даже без формы редактирования

## Следующие шаги

### Приоритет 1: Создание форм редактирования
- [ ] DelayStepNode - редактирование времени задержки
- [ ] ConditionStepNode - редактирование условий
- [ ] JumpStepNode - выбор целевого шага
- [ ] SignalStepNode - настройка сигнала
- [ ] ParallelStepNode - управление параллельными ветками
- [ ] ActivityModbusNode - настройка Modbus действий
- [ ] BranchNode - настройки ветки

### Приоритет 2: Улучшения
- [ ] Горячие клавиши (Enter для сохранения, Esc для отмены)
- [ ] Автофокус на первое поле формы
- [ ] Индикатор несохраненных изменений
- [ ] Подтверждение при закрытии с несохраненными изменениями

## Дополнительная документация

- `NodeEditButton/README.md` - Подробная документация по использованию кнопки
- `ActivitySystemEditContent.tsx` - Пример полноценной формы редактирования
- `EDIT_BUTTON_FIX.md` - История исправления проблем с отображением

## Файловая структура

```
src/features/scenarioEditor/core/ui/nodes/
├── shared/
│   ├── NodeEditButton/
│   │   ├── NodeEditButton.tsx
│   │   ├── NodeEditButton.module.css
│   │   ├── useNodeEdit.tsx
│   │   ├── index.ts
│   │   └── README.md
│   ├── NodeEditModal/
│   │   ├── NodeEditModal.tsx
│   │   ├── NodeEditModalProvider.tsx
│   │   ├── types.ts
│   │   ├── index.ts
│   │   └── contracts/
│   │       └── PlaceholderEditContract.tsx
│   └── EditButton/ (устаревший, можно удалить)
├── ActivitySystemNode/
│   ├── ActivitySystemNode.tsx
│   ├── ActivitySystemEditContent.tsx
│   └── ...
└── [другие ноды]/
    └── ...
```

## Итог

Создана полностью рабочая, расширяемая система редактирования нод:
- ✅ Кнопка редактирования на всех нодах
- ✅ Модальная система с валидацией
- ✅ Интеграция с историей
- ✅ Простая интеграция (3 строки кода)
- ✅ Не требует стилизации в нодах
- ✅ Готова к добавлению форм редактирования

Система готова к использованию и дальнейшему развитию!
