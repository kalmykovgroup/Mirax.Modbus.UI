import {Component} from 'react'
import ErrorPage from "@ui/pages/ErrorPage/ErrorPage.tsx";
import {NavigateProvider} from "@app/providers/routing/NavigateProvider.tsx";
import AppRouter from "@app/providers/AppRouter.tsx";
import ErrorBoundary from "@app/lib/hooks/ErrorBoundary.tsx";
import {UserActivityTracker} from "@app/lib/hooks/UserActivityTracker.tsx";
import {DeviceProvider} from "@app/lib/hooks/device/DeviceProvider.tsx";
import {ThemeProvider} from "@app/providers/theme/ThemeProvider.tsx";
import LoadingOverlay from "@ui/components/LoadingOverlay/LoadingOverlay.tsx";
import { ConfirmProvider } from "./ui/components/ConfirmProvider/ConfirmProvider";
import AnimatedGradientDark from "@ui/assets/AnimatedGradientDark/AnimatedGradientDark.tsx";
import {AppToaster} from "@ui/components/AppToaster/AppToaster.tsx";


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
 * - ConfirmProvider окно подтверждения, по типу alert
 * - Toaster уведомления
 * - LoadingOverlay заморозка окна
 */
class App extends Component {

    render() {
        return (
            <ThemeProvider>
                <ErrorBoundary fallback={<ErrorPage/>}>
                    <NavigateProvider />
                    <UserActivityTracker />
                    <DeviceProvider>
                        <ConfirmProvider>
                            <AppRouter/>
                            <AnimatedGradientDark />

                            <AppToaster/>

                            <LoadingOverlay />
                        </ConfirmProvider>
                    </DeviceProvider>
                </ErrorBoundary>
            </ThemeProvider>
        )
    }
}

export default App

