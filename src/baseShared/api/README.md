# Redux Toolkit + Axios + axios-retry + redux-persist Auth Template

## 📌 Описание
Данный шаблон представляет собой промышленную архитектуру для авторизации и хранения данных пользователя в **Redux Toolkit**, с поддержкой:
- **axios** для работы с API;
- **axios-retry** для автоматического повторного выполнения запросов при сетевых сбоях;
- **redux-persist** для сохранения авторизации между перезагрузками страницы;
- **interceptors** для глобальной обработки ошибок (в т.ч. 401 Unauthorized);
- Разделения API слоя и Redux логики.

---

## 📂 Структура проекта

```
src/
├── shared/
│   └── api/
│       ├── authApi.ts           # API-методы авторизации
│       └── base/
│           ├── apiClient.ts     # Клиент axios с interceptors и retry
│           ├── baseQuery.ts     # RTK Query baseQuery
│           ├── config.ts        # Конфигурация API
│           ├── interceptors.ts  # Interceptors axios
│           └── retryConfig.ts   # Настройки axios-retry
├── app/
│   ├── store.ts                 # Конфигурация Redux Store с redux-persist
│   └── rootReducer.ts           # Комбинация всех редьюсеров
└── features/
    └── auth/
        ├── authSlice.ts         # Redux slice для авторизации
        ├── authThunks.ts        # Thunk'и для login/logout
        └── types.ts             # Типы данных
```

---

## ⚙️ Как это работает

### 1. **apiClient.ts**
- Создаёт **axios instance** с `baseURL`, `withCredentials: true` и заголовком `X-Client-Type: web`.
- Подключает:
    - **axios-retry** через настройки в `retryConfig.ts`.
    - **interceptors** из `interceptors.ts`.

### 2. **retryConfig.ts**
- Настраивает количество повторов запросов и условия для повторного выполнения.
- Использует **экспоненциальную задержку**.
- Не повторяет POST-запросы (чтобы избежать дублей).

### 3. **interceptors.ts**
- **Request Interceptor**:
    - Добавляет заголовки.
- **Response Interceptor**:
    - При `401 Unauthorized` вызывает `resetAuthState` (logout).
    - Логирует ошибки.

### 4. **baseQuery.ts**
- Обёртка для RTK Query.
- Передаёт `AbortSignal` в axios.
- Возвращает `{ data }` или `{ error }`.

### 5. **authSlice.ts**
- Хранит:
    - `user`
    - `isAuthenticated`
    - `isLoading`
    - `error`
- Экшены:
    - `resetAuthState` — сброс авторизации.
- Обрабатывает login/logout через **authThunks.ts**.

### 6. **redux-persist**
- Сохраняет `auth.user` и `auth.isAuthenticated` в localStorage.
- Конфиг задаётся в `rootReducer.ts`.

---

## 🚀 Как использовать

### Установка зависимостей
```bash
npm install @reduxjs/toolkit react-redux redux-persist axios axios-retry
```

### Подключение Store
```tsx
// Main.tsx
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <App />
            </PersistGate>
        </Provider>
    </StrictMode>,
)
```

### Использование авторизации
```tsx
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { loginThunk, logoutThunk } from '@/features/auth/authThunks';

const LoginPage = () => {
  const dispatch = useAppDispatch();
  const { isLoading, isAuthenticated } = useAppSelector(state => state.auth);

  const handleLogin = () => {
    dispatch(loginThunk({ username: 'test', password: '1234' }));
  };

  const handleLogout = () => {
    dispatch(logoutThunk());
  };

  return (
    <div>
      {isAuthenticated ? (
        <>
          <h1>Вы авторизованы</h1>
          <button onClick={handleLogout}>Выйти</button>
        </>
      ) : (
        <>
          <h1>Вход</h1>
          <button disabled={isLoading} onClick={handleLogin}>Войти</button>
        </>
      )}
    </div>
  );
};
```

---

## 🔗 Связи между модулями
- `authSlice` ↔ `authThunks` — бизнес-логика авторизации.
- `authThunks` ↔ `authApi` — HTTP-запросы.
- `authApi` ↔ `apiClient` — axios с retry и interceptors.
- `apiClient` ↔ `retryConfig` / `interceptors` — настройки запросов.
- `rootReducer` ↔ `redux-persist` — сохранение данных пользователя.

---

## 📄 Лицензия
MIT
