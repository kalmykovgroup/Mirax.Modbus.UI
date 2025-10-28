# NodeEditButton - Универсальная кнопка редактирования для нод

## Описание

`NodeEditButton` - это универсальный компонент кнопки редактирования, который автоматически позиционируется в правом верхнем углу ноды и не требует дополнительной стилизации.

## Использование

### Простой способ (рекомендуется) - с хуком `useNodeEdit`

```tsx
import { useNodeEdit } from '../shared/NodeEditButton';
import { createPlaceholderContract } from '../shared/NodeEditModal/contracts/PlaceholderEditContract';

// Создайте контракт редактирования (или используйте заглушку)
const MyNodeEditContract = createPlaceholderContract('Моя нода');

export function MyNode({ id, data, selected }: Props) {
    const { ValidationIndicator } = useValidationIndicator(id);
    const { EditButton, containerProps } = useNodeEdit(id, selected, MyNodeEditContract);

    return (
        <div
            className={styles.container}
            aria-selected={selected}
            {...containerProps}  // Добавляет onMouseEnter/onMouseLeave
        >
            {ValidationIndicator}
            {EditButton}  {/* Просто добавьте компонент */}

            {/* Остальной контент ноды */}
        </div>
    );
}
```

### Ручной способ - без хука

```tsx
import { useState } from 'react';
import { NodeEditButton } from '../shared/NodeEditButton';
import { useNodeEditModal } from '../shared/NodeEditModal';

export function MyNode({ id, data, selected }: Props) {
    const [isHovered, setIsHovered] = useState(false);
    const { openEditModal } = useNodeEditModal();

    const handleEdit = () => {
        const node = rf.getNode(id);
        if (node) {
            openEditModal(node, MyNodeEditContract);
        }
    };

    return (
        <div
            className={styles.container}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <NodeEditButton
                visible={isHovered || selected}
                onClick={handleEdit}
            />

            {/* Остальной контент ноды */}
        </div>
    );
}
```

## Позиционирование

Кнопка автоматически позиционируется:
- **Положение:** Правый верхний угол (`top: 4px; right: 28px`)
- **Z-index:** 1000 (отображается поверх всех элементов ноды)
- **Сдвиг влево:** На 28px, чтобы не перекрывать ValidationErrorBadge

## Стилизация

Компонент полностью самодостаточен и не требует дополнительных CSS стилей в ноде.

### Внешний вид
- Синяя кнопка с иконкой карандаша
- Плавная анимация появления/исчезновения (opacity transition)
- Hover эффекты: увеличение размера и изменение цвета
- Тень для визуального выделения

## Создание контракта редактирования

Для создания полноценной формы редактирования создайте файл `YourNodeEditContent.tsx`:

```tsx
import type { NodeEditContract } from '../shared/NodeEditModal/types';
import type { YourNodeDto } from '...';

export const YourNodeEditContract: NodeEditContract<YourNodeDto> = {
    title: 'Редактирование вашей ноды',
    width: 700,

    validate: (dto) => {
        const errors: string[] = [];
        if (!dto.requiredField) {
            errors.push('Обязательное поле не заполнено');
        }
        return errors;
    },

    renderContent: ({ dto, onChange }) => (
        <div>
            <label>
                Название:
                <input
                    value={dto.name || ''}
                    onChange={(e) => onChange({ name: e.target.value })}
                />
            </label>
            {/* Другие поля формы */}
        </div>
    ),
};
```

## Заглушка для нод без формы редактирования

Используйте `createPlaceholderContract` для нод, для которых форма редактирования еще не реализована:

```tsx
import { createPlaceholderContract } from '../shared/NodeEditModal/contracts/PlaceholderEditContract';

const MyNodeEditContract = createPlaceholderContract('Название ноды');
```

Это покажет модальное окно с сообщением "Форма редактирования находится в разработке".

## Интеграция со системой истории

Все изменения автоматически сохраняются в историю через `operations.updateNode()`.
Реальное сохранение на сервер происходит только при использовании общей системы сохранения.

## Примеры

См. реализацию в:
- `ActivitySystemNode.tsx` - полная форма редактирования
- `DelayStepNode.tsx` - использование заглушки
- `BranchNode.tsx` - использование заглушки
