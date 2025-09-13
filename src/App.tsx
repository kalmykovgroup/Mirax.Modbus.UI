import {Component} from 'react'
import ErrorPage from "@ui/pages/ErrorPage/ErrorPage.tsx";
import {NavigateProvider} from "@app/providers/NavigateProvider.tsx";
import AppRouter from "@app/providers/AppRouter.tsx";
import ErrorBoundary from "@app/lib/hooks/ErrorBoundary.tsx";
import {UserActivityTracker} from "@app/lib/hooks/UserActivityTracker.tsx";
import {DeviceProvider} from "@app/lib/hooks/device/DeviceProvider.tsx";
import {ThemeProvider} from "@app/providers/theme/ThemeProvider.tsx";

/**
 * Главный компонент приложения.
 *
 * - Оборачивает всё в ErrorBoundary, чтобы отлавливать ошибки рендеринга компонентов.
 * - Ошибки из асинхронных операций (fetch, setTimeout) не перехватываются ErrorBoundary —
 *   их нужно обрабатывать вручную.
 * - DeviceProvider предоставляет информацию об устройстве (мобильный/десктоп) через контекст.
 * - AppRouter содержит маршруты всего приложения.
 * - RouteLogger логирует навигацию по маршрутам.
 * - NavigateProvider - предоставляет контекст для навигации по маршрутам, (redirectTo('/auth'))
 * - UserActivityTracker отслеживает активность пользователя и обновляет время последней активности.
 */
class App extends Component {

    render() {
        return (
            <ThemeProvider>
                <ErrorBoundary fallback={<ErrorPage/>}>
                    <NavigateProvider />
                    <UserActivityTracker />
                    <DeviceProvider>
                            <AppRouter/>
                    </DeviceProvider>
                </ErrorBoundary>
            </ThemeProvider>
        )
    }
}

export default App

