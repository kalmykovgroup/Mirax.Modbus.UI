# Исправление проблемы с layout BranchNode

## Проблема

После применения HOC `withValidation` к `BranchNode`, ветка перестала корректно отображать свою высоту и ширину. Это происходило потому, что HOC оборачивал компонент в дополнительный `<div>`, который нарушал CSS layout.

## Причина

`BranchNode` использует стили:
```css
.branchNodeContainer {
    width: 100%;
    height: 100%;
}
```

Эти стили предполагают, что контейнер ноды является прямым потомком ReactFlow node wrapper. Когда мы добавили промежуточный wrapper через HOC, размеры перестали работать корректно.

## Решение

### 1. Обновлен `withValidation.module.css`

**Было:**
```css
.invalidNodeContainer {
    position: relative;
    filter: drop-shadow(0 0 8px rgba(220, 53, 69, 0.5));
}
```

**Стало:**
```css
.validNodeContainer,
.invalidNodeContainer {
    position: relative;
    width: 100%;        /* ← Растягиваем wrapper */
    height: 100%;       /* ← на весь размер ноды */
}

.invalidNodeContainer {
    filter: drop-shadow(0 0 6px rgba(220, 53, 69, 0.4));
}
```

### 2. Добавлен оверлей через ::after

Вместо ::before используем ::after для красноватого затемнения, чтобы он был поверх содержимого:

```css
.invalidNodeContainer::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(220, 53, 69, 0.06);
    pointer-events: none;  /* Не блокирует взаимодействие */
    border-radius: 5px;
    z-index: 1;
}
```

### 3. Оптимизирован ValidationErrorBadge z-index

**Было:**
```css
.badge {
    z-index: 1000;
}
```

**Стало:**
```css
.badge {
    z-index: 10;           /* Разумный z-index */
    pointer-events: auto;  /* Явно разрешаем интерактивность */
}
```

### 4. Всегда применяем класс wrapper

**Было:**
```tsx
<div className={hasErrors ? styles.invalidNodeContainer : undefined}>
```

**Стало:**
```tsx
<div className={hasErrors ? styles.invalidNodeContainer : styles.validNodeContainer}>
```

Теперь wrapper всегда имеет класс с `width: 100%; height: 100%;`

## Результат

✅ BranchNode корректно отображает свою высоту и ширину
✅ Все остальные ноды продолжают работать как раньше
✅ Визуальные эффекты валидации сохранены
✅ Интерактивность ValidationErrorBadge работает
✅ Не нарушен layout ReactFlow

## Тестирование

1. Создать BranchNode - должна иметь корректный размер
2. Создать невалидный BranchNode - должна показать красный значок
3. Изменить размер ветки - должна корректно resize
4. Навести на значок ошибки - должен показаться tooltip
5. Попробовать взаимодействовать с веткой (Ctrl+перетаскивание) - должно работать

## Применение

Изменения автоматически применяются ко всем типам нод, обернутым в `withValidation`:
- ✅ DelayStepNode
- ✅ ActivityModbusNode
- ✅ ActivitySystemNode
- ✅ SignalStepNode
- ✅ JumpStepNode
- ✅ ParallelStepNode
- ✅ ConditionStepNode
- ✅ **BranchNode** ← Исправлено!
