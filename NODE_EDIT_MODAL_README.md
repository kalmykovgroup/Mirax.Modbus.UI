# Система модальных окон для редактирования нод

## Обзор

Создана универсальная система модальных окон для редактирования нод в редакторе сценариев. Система основана на едином контракте, что позволяет легко добавлять новые типы нод.

## Архитектура

### 1. Базовые компоненты

#### `NodeEditModal` (базовый компонент модального окна)
- **Расположение**: `src/features/scenarioEditor/core/ui/nodes/shared/NodeEditModal/`
- **Функции**:
  - Рендерит модальное окно с кнопками "Сохранить" и "Отмена"
  - Управляет черновиком данных (draft state)
  - Выполняет валидацию перед сохранением
  - Показывает ошибки валидации

#### `NodeEditModalProvider` (провайдер состояния)
- **Функции**:
  - Управляет состоянием открытия/закрытия модального окна
  - Предоставляет контекст через `useNodeEditModal()`
  - Интегрирован с системой операций (`useScenarioOperations`)
  - Автоматически сохраняет изменения в историю

#### `EditButton` (кнопка редактирования)
- **Расположение**: `src/features/scenarioEditor/core/ui/nodes/shared/EditButton/`
- **Функции**:
  - Показывается при наведении на ноду или когда нода выбрана
  - Универсальна для всех типов нод

### 2. Контракт редактирования (`NodeEditContract`)

```typescript
interface NodeEditContract<TDto = any> {
    // Рендерит содержимое формы редактирования
    renderContent: (props: {
        node: FlowNode;
        dto: TDto;
        onChange: (updatedDto: Partial<TDto>) => void;
    }) => ReactNode;

    // Валидация данных перед сохранением (опционально)
    validate?: (dto: TDto) => string[];

    // Заголовок модального окна (опционально)
    title?: string;

    // Ширина модального окна (опционально, по умолчанию 600px)
    width?: string | number;
}
```

## Использование

### Шаг 1: Создайте контракт редактирования для вашей ноды

```typescript
// YourNodeEditContent.tsx
import type { YourNodeDto } from '@scenario/shared/contracts/.../YourNodeDto';
import type { NodeEditContract } from '../shared/NodeEditModal';
import styles from './YourNodeEditContent.module.css';

export const YourNodeEditContract: NodeEditContract<YourNodeDto> = {
    title: 'Редактирование вашей ноды',
    width: 700, // опционально

    validate: (dto) => {
        const errors: string[] = [];

        if (!dto.requiredField) {
            errors.push('Обязательное поле не заполнено');
        }

        return errors;
    },

    renderContent: ({ dto, onChange }) => {
        return (
            <div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Название</label>
                    <input
                        type="text"
                        value={dto.name || ''}
                        onChange={(e) => onChange({ name: e.target.value })}
                    />
                </div>

                {/* Добавьте другие поля */}
            </div>
        );
    },
};
```

### Шаг 2: Интегрируйте EditButton в компонент ноды

```typescript
// YourNode.tsx
import { useReactFlow } from '@xyflow/react';
import { EditButton } from '../shared/EditButton';
import { useNodeEditModal } from '../shared/NodeEditModal';
import { YourNodeEditContract } from './YourNodeEditContent';
import editButtonStyles from '../shared/EditButton/EditButton.module.css';

export function YourNode({ id, data, selected }: NodeProps) {
    const rf = useReactFlow();
    const { openEditModal } = useNodeEditModal();

    const handleEdit = () => {
        const node = rf.getNode(id);
        if (node) {
            openEditModal(node, YourNodeEditContract);
        }
    };

    return (
        <div className={`${styles.container} ${editButtonStyles.container}`} aria-selected={selected}>
            <EditButton onClick={handleEdit} />

            {/* Остальное содержимое ноды */}
        </div>
    );
}
```

### Шаг 3: Добавьте стили (опционально)

Используйте готовые стили из `ActivitySystemEditContent.module.css` или создайте свои.

## Пример: ActivitySystemNode

Полный пример реализации можно посмотреть в:
- `ActivitySystemNode.tsx` - интеграция EditButton
- `ActivitySystemEditContent.tsx` - контракт редактирования
- `ActivitySystemEditContent.module.css` - стили формы

## Как это работает

1. **Пользователь наводит на ноду** → появляется иконка редактирования (EditButton)
2. **Клик на иконку** → вызывается `handleEdit()` → `openEditModal(node, contract)`
3. **Открывается модальное окно** с формой из `contract.renderContent()`
4. **Пользователь редактирует** → изменения сохраняются в draft state
5. **Клик "Сохранить"** → валидация через `contract.validate()`
6. **Если валидация пройдена** → `operations.updateNode()` → изменения в истории
7. **Изменения попадут на сервер** при общем сохранении (Ctrl+S или автосохранение)

## Преимущества

✅ **Единый контракт** - все ноды следуют одному паттерну
✅ **Типобезопасность** - полная поддержка TypeScript
✅ **Валидация** - встроенная система валидации перед сохранением
✅ **История изменений** - автоматическая интеграция с системой Undo/Redo
✅ **Централизованное сохранение** - изменения сохраняются через общую систему
✅ **Переиспользуемые компоненты** - EditButton и стили можно использовать везде

## Добавление новой ноды

Для добавления редактирования новой ноды:

1. Создайте файл `YourNodeEditContent.tsx` с контрактом `NodeEditContract`
2. Добавьте `EditButton` в компонент вашей ноды
3. Импортируйте хук `useNodeEditModal()` и вызовите `openEditModal()`
4. Готово! Система сама позаботится о сохранении и валидации

## Стилизация

Базовые стили модального окна находятся в:
- `NodeEditModal.module.css` - стили самого модального окна
- `EditButton.module.css` - стили кнопки редактирования
- `ActivitySystemEditContent.module.css` - пример стилей для формы (можно переиспользовать)

## Интеграция

Провайдер `NodeEditModalProvider` уже интегрирован в `ScenarioMap.tsx` и доступен для всех нод через контекст.
