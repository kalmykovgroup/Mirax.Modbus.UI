# Исправление: Кнопка редактирования не появляется при наведении

## Проблема
При наведении на ноду кнопка редактирования не появлялась.

## Причина
Проблема была в CSS модулях - селекторы `.container:hover .editButton` не работали корректно из-за скоупинга классов в разных модулях.

**Дополнительная проблема:** Кнопка редактирования и ValidationErrorBadge находились в одной позиции (top-right), что приводило к их перекрытию. ValidationErrorBadge имеет приоритет (появляется при ошибках валидации), поэтому кнопка редактирования была перемещена в левый верхний угол.

## Решение

### 1. Обновлены стили в `ActivitySystemNode.module.css`

Добавлены правила для отображения кнопки:

```css
/* Edit button - показывается при наведении или выборе */
.editButton {
    position: absolute !important;
    top: 4px !important;
    left: 4px !important;  /* Слева, чтобы не перекрывать ValidationErrorBadge справа */
    opacity: 0 !important;
    transition: opacity 0.2s !important;
    z-index: 100 !important;
}

.container:hover .editButton,
.container[aria-selected="true"] .editButton {
    opacity: 1 !important;
}
```

### 2. Обновлен компонент `ActivitySystemNode.tsx`

Кнопка теперь обернута в div с классом `styles.editButton`:

```tsx
<div className={styles.editButton}>
    <EditButton onClick={handleEdit} />
</div>
```

### 3. Упрощены стили в `EditButton.module.css`

Удалены правила с селекторами `.container`, так как позиционирование теперь управляется в родительском модуле.

## Как это работает

1. **При наведении на ноду** (`styles.container:hover`) → класс `.editButton` получает `opacity: 1`
2. **При выборе ноды** (`aria-selected="true"`) → класс `.editButton` получает `opacity: 1`
3. **По умолчанию** → `opacity: 0` (кнопка скрыта)

## Применение к другим нодам

Чтобы добавить кнопку редактирования к другой ноде:

1. **Добавьте стили в CSS модуль ноды:**

```css
.editButton {
    position: absolute !important;
    top: 4px !important;
    left: 4px !important;  /* Слева, чтобы не перекрывать ValidationErrorBadge справа */
    opacity: 0 !important;
    transition: opacity 0.2s !important;
    z-index: 100 !important;
}

.container:hover .editButton,
.container[aria-selected="true"] .editButton {
    opacity: 1 !important;
}
```

2. **Добавьте в компонент:**

```tsx
import { useReactFlow } from '@xyflow/react';
import { EditButton } from '../shared/EditButton';
import { useNodeEditModal } from '../shared/NodeEditModal';
import { YourNodeEditContract } from './YourNodeEditContent';

// В компоненте:
const rf = useReactFlow();
const { openEditModal } = useNodeEditModal();

const handleEdit = () => {
    const node = rf.getNode(id);
    if (node) {
        openEditModal(node, YourNodeEditContract);
    }
};

// В render:
<div className={styles.editButton}>
    <EditButton onClick={handleEdit} />
</div>
```

3. **Убедитесь, что контейнер ноды имеет `position: relative`**

Готово! Теперь при наведении на ноду или её выборе будет появляться кнопка редактирования.
