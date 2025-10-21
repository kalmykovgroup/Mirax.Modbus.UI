# Scenario Designer

## Зачем этот модуль
Это **редактор сценариев** на базе **@xyflow/react (React Flow)**. Он даёт:
- кастомные типы нод (Jump, Delay, Parallel, Branch, …);
- выбор и множественный выбор с удалением (Del/Backspace);
- протягивание соединений (drag) с **валидатором** по матрице правил;
- предотвращение дублей рёбер;
- синхронизацию coords (x/y) в `node.data` для отображения в нодах;
- простое расширение типами/правилами.

---

## Структура файлов

```
src/app/scenario-designer/
├── ScenarioEditorPage.tsx          # Обёртка с <ReactFlowProvider>
├── ScenarioEditorCore.tsx          # Логика редактора + <ReactFlow/>
├── graph/ 
│   ├── nodeTypes.ts                # реестр компонентов нод
│   ├── connectionRules.ts          # правила соединений (ALLOW_MAP / TARGET_ALLOW_MAP)
│   ├── isValidConnection.ts        # фабрика валидатора соединений
│   ├── utils.ts                    # утилиты (например, isDuplicateEdgeArray)
│   ├── useSelection.ts             # выбор/удаление + хоткеи
│   └── useConnectContext.ts        # контекст drag-соединения + broadcast в node.data
└── types/
    └── FlowNode.ts                # типы графа (FlowNode/FlowEdge/FlowType/…)
```

---

## Что делает каждый файл

### ScenarioEditorPage.tsx
Мини-обёртка над редактором. Поднимает **ReactFlowProvider**, без него хуки `useReactFlow()` и др. работать не будут.

### ScenarioEditorCore.tsx
**Основной компонент редактора.**
Отвечает за:
- локальное состояние `nodes` / `edges`;
- регистрацию `nodeTypes`;
- выбор/удаление (`useSelection`);
- контекст drag-соединения (`useConnectContext`);
- построение валидатора соединений (`createIsValidConnection`);
- применение изменений к нодам (`onNodesChange`);
- рендер `<ReactFlow/>`.
 
### graph/nodeTypes.ts
Реестр соответствий `node.type → React-компонент`.

### graph/connectionRules.ts
Матрицы правил:
- `ALLOW_MAP`: источник → допустимые цели.
- `TARGET_ALLOW_MAP`: цель ← допустимые источники.

### graph/isValidConnection.ts
Фабрика валидатора соединений. Делает проверки:
- базовые (`source`, `target`, не self-loop);
- дубль ребра;
- правила матриц.

### graph/utils.ts
Утилиты (например, `isDuplicateEdgeArray`).

### graph/useSelection.ts
Хук для работы с выбором:
- множества выбранных нод и рёбер;
- `onSelectionChange`;
- `deleteSelected()` + хоткеи Delete/Backspace.

### graph/useConnectContext.ts
Хук для drag-соединения. Широковещает в `node.data`:
- `connectFrom`;
- `connectFromType`;
- `isConnecting`.

### types/FlowNode.ts
Типы графа: `FlowType`, `FlowNode`, `FlowEdge`, `ConnectFrom`, `StepNodeData`, `ConnectContext`.

---

## Как добавить новый тип ноды
1. Добавить значение в `FlowType`.
2. Написать компонент ноды.
3. Зарегистрировать его в `nodeTypes.ts`.
4. (опционально) Добавить правила соединений.

## Как добавить правило соединений
- Источник → цель:
  ```ts
  ALLOW_MAP[FlowType.Parallel] = new Set([FlowType.BranchNode]);
  ```
- Цель ← источники:
  ```ts
  TARGET_ALLOW_MAP[FlowType.BranchNode] = new Set([
    FlowType.Condition,
    FlowType.Parallel,
  ]);
  ```

---

## Подводные камни
- **Ошибка zustand provider** → обязательно оборачивай в `<ReactFlowProvider>`.
- **`edgesRef.current` undefined** → инициализируй `useRef<FlowEdge[]>([])`.
- **Координаты в data** → только для UI, позиционирование всегда из `node.position`.
- **Группы** → `parentId`, `extent: 'parent'`, `expandParent: true`.
