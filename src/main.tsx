
import { createRoot } from 'react-dom/client'
import "@ui/styles/index.css"
import App from './App.tsx'
import {Provider} from "react-redux";
import { PersistGate } from 'redux-persist/integration/react';
import {persistor, store} from "@/baseStore/store.ts";
import SplashScreen from "@ui/components/SplashScreen/SplashScreen.tsx";
import {BrowserRouter} from "react-router-dom";
import {apiClient} from "@/baseShared/api/apiClient.ts";
import {setStoreForInterceptors, setupInterceptors} from "@/baseShared/api/interceptors.ts";
import {registerAllNodeTypes} from "@scenario/ui/ScenarioEditorPage";



// Передаём store в interceptors и настраиваем
setStoreForInterceptors(store);
setupInterceptors(apiClient);

// ВАЖНО: инициализировать до рендера приложения
//initHistorySystem();

// ✅ Регистрируем все типы нод до рендера приложения
registerAllNodeTypes();

// Функциональный компонент для инициализации Persist (сброс transient полей после rehydrate)

createRoot(document.getElementById('root')!).render(
    /**
     * Корневой рендер приложения.
     *
     * Оборачиваем всё приложение в Redux Provider — чтобы сделать Redux store доступным для всех компонентов.
     * Далее используем PersistGate — компонент от redux-persist, который:
     * - приостанавливает рендер <App /> до восстановления состояния Redux из localStorage
     * - предотвращает "фликер" компонентов (например, чтобы ProtectedRoute не сработал до восстановления auth)
     *
     * persistGate.loading = null — значит, не отображаем спиннер/заглушку во время восстановления.
     */
    <Provider store={store}>
        <PersistGate loading={<SplashScreen label={"Загрузка приложения..."} threePointOffset={true}/>}  persistor={persistor}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </PersistGate>
    </Provider>
)

