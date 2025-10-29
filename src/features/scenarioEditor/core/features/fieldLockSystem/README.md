# Система блокировки и управления видимостью полей

Гибкая система для управления доступом к полям редактирования в редакторе сценариев.

## Возможности

- ✅ **Блокировка полей** - запрет редактирования с визуальной индикацией
- ✅ **Скрытие полей** - полное удаление из UI
- ✅ **Группировка** - объединение полей в логические группы
- ✅ **Автоматическая регистрация** - группы регистрируются при первом использовании
- ✅ **Централизованное управление** - панель для управления всеми группами
- ✅ **Глобальная блокировка** - блокировка всех полей одной кнопкой

## Быстрый старт

### 1. Обертка полей компонентом Block

```tsx
import { Block } from '@scenario/core/features/fieldLockSystem';

function MyComponent() {
  return (
    <Block
      group="myGroup"
      label="Название группы"
      description="Описание группы (опционально)"
    >
      <input type="text" />
      <select>...</select>
    </Block>
  );
}
```

### 2. Режимы отображения

#### Wrap mode (с рамкой и заголовком)
```tsx
<Block group="basicInfo" label="Основная информация" mode="wrap">
  <input type="text" placeholder="Имя" />
  <input type="email" placeholder="Email" />
</Block>
```

#### Inline mode (без рамки)
```tsx
<Block group="advancedSettings" label="Расширенные настройки" mode="inline">
  <input type="number" />
</Block>
```

### 3. Управление состоянием группы

#### Из Redux
```tsx
import { useDispatch } from 'react-redux';
import { setGroupState, FieldGroupState } from '@scenario/core/features/fieldLockSystem';

function MyComponent() {
  const dispatch = useDispatch();

  const lockGroup = () => {
    dispatch(setGroupState({ groupId: 'myGroup', state: FieldGroupState.Locked }));
  };

  const hideGroup = () => {
    dispatch(setGroupState({ groupId: 'myGroup', state: FieldGroupState.Hidden }));
  };

  return (
    <>
      <button onClick={lockGroup}>Заблокировать</button>
      <button onClick={hideGroup}>Скрыть</button>
    </>
  );
}
```

#### Циклическое переключение
```tsx
import { toggleGroupState } from '@scenario/core/features/fieldLockSystem';

// visible → locked → hidden → visible
dispatch(toggleGroupState('myGroup'));
```

### 4. Проверка состояния группы

```tsx
import { useSelector } from 'react-redux';
import { selectIsGroupLocked, selectIsGroupHidden } from '@scenario/core/features/fieldLockSystem';

function MyComponent() {
  const isLocked = useSelector(selectIsGroupLocked('myGroup'));
  const isHidden = useSelector(selectIsGroupHidden('myGroup'));

  if (isHidden) return null;

  return (
    <div>
      {isLocked ? 'Поля заблокированы' : 'Поля доступны'}
    </div>
  );
}
```

### 5. Глобальная блокировка

```tsx
import { setGlobalLock, selectGlobalLock } from '@scenario/core/features/fieldLockSystem';

function MyComponent() {
  const dispatch = useDispatch();
  const globalLock = useSelector(selectGlobalLock);

  return (
    <button onClick={() => dispatch(setGlobalLock(!globalLock))}>
      {globalLock ? 'Разблокировать все' : 'Заблокировать все'}
    </button>
  );
}
```

## API

### Компоненты

#### `<Block>`
Основной компонент для обертки полей

**Props:**
- `group: string` - уникальный ID группы (обязательно)
- `label: string` - название группы (обязательно)
- `description?: string` - описание группы
- `mode?: 'wrap' | 'inline'` - режим отображения (по умолчанию 'wrap')
- `showLockIcon?: boolean` - показывать иконку замка (по умолчанию true)
- `className?: string` - дополнительный CSS класс

#### `<FieldLockPanel>`
Панель управления всеми группами

#### `<FieldLockPanelButton>`
Кнопка для открытия панели управления (уже добавлена в ScenarioMap)

### Хуки

#### `useFieldGroup(params)`
Хук для работы с группой полей

**Параметры:**
- `groupId: string` - ID группы
- `label: string` - название группы
- `description?: string` - описание

**Возвращает:**
- `isLocked: boolean` - группа заблокирована
- `isHidden: boolean` - группа скрыта
- `isVisible: boolean` - группа видима

### Redux Actions

#### Управление группами
- `registerGroup(payload)` - регистрация группы (автоматически вызывается в Block)
- `setGroupState(payload)` - установка состояния группы
- `toggleGroupState(groupId)` - циклическое переключение состояния
- `setMultipleGroupStates(payload)` - массовое изменение состояния
- `resetAllGroups()` - сброс всех групп в состояние Visible
- `unregisterGroup(groupId)` - удаление группы

#### Глобальная блокировка
- `setGlobalLock(locked: boolean)` - установка глобальной блокировки

### Redux Selectors

- `selectAllGroups(state)` - все зарегистрированные группы
- `selectGroupState(groupId)(state)` - состояние группы
- `selectIsGroupLocked(groupId)(state)` - группа заблокирована
- `selectIsGroupHidden(groupId)(state)` - группа скрыта
- `selectIsGroupVisible(groupId)(state)` - группа видима
- `selectGlobalLock(state)` - состояние глобальной блокировки
- `selectRegisteredGroupsCount(state)` - количество зарегистрированных групп
- `selectGroupsByState(targetState)(state)` - группы по состоянию

### Типы

#### `FieldGroupState`
```typescript
enum FieldGroupState {
  Visible = 'visible',    // Видимо и доступно
  Locked = 'locked',      // Видимо, но заблокировано
  Hidden = 'hidden',      // Полностью скрыто
}
```

#### `FieldGroupMetadata`
```typescript
interface FieldGroupMetadata {
  id: string;              // Уникальный ID
  label: string;           // Название
  description?: string;    // Описание
  state: FieldGroupState;  // Текущее состояние
  registeredAt: number;    // Дата регистрации
}
```

## Примеры использования

### Пример 1: Простая блокировка input

```tsx
<Block group="userName" label="Имя пользователя">
  <input type="text" value={name} onChange={e => setName(e.target.value)} />
</Block>
```

### Пример 2: Группа связанных полей

```tsx
<Block group="userAddress" label="Адрес" description="Информация о местоположении">
  <input type="text" placeholder="Улица" />
  <input type="text" placeholder="Город" />
  <input type="text" placeholder="Индекс" />
</Block>
```

### Пример 3: Управление несколькими группами

```tsx
import { setMultipleGroupStates, FieldGroupState } from '@scenario/core/features/fieldLockSystem';

// Скрыть все расширенные настройки
dispatch(setMultipleGroupStates([
  { groupId: 'advancedSettings', state: FieldGroupState.Hidden },
  { groupId: 'debugOptions', state: FieldGroupState.Hidden },
  { groupId: 'experimentalFeatures', state: FieldGroupState.Hidden },
]));
```

### Пример 4: Условная блокировка

```tsx
function MyForm() {
  const isAdmin = useSelector(selectIsAdmin);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isAdmin) {
      dispatch(setGroupState({ groupId: 'adminSettings', state: FieldGroupState.Locked }));
    }
  }, [isAdmin, dispatch]);

  return (
    <Block group="adminSettings" label="Настройки администратора">
      <input type="text" placeholder="Секретная настройка" />
    </Block>
  );
}
```

## Интеграция с существующими компонентами

Система уже интегрирована в:
- ✅ `DelayStepNode` - время задержки (группа: `delayNodeTime`)

Для добавления в другие ноды:
1. Импортировать `Block` из `@scenario/core/features/fieldLockSystem`
2. Обернуть input/select/textarea в компонент Block
3. Указать уникальный `group` ID и `label`
4. Группа автоматически появится в панели управления

## Стилизация

Все стили настраиваются через CSS-модули:
- `Block.module.css` - стили компонента Block
- `FieldLockPanel.module.css` - стили панели управления
- `GroupControl.module.css` - стили элемента управления группой

Компонент поддерживает темную тему и адаптивный дизайн.

## Логирование

Все действия логируются в консоль с префиксом `[fieldLockSlice]`:
- Регистрация групп
- Изменение состояния
- Установка глобальной блокировки

## Производительность

- Группы регистрируются только один раз при первом монтировании
- Используется `useMemo` для оптимизации селекторов
- Минимальное количество ре-рендеров
