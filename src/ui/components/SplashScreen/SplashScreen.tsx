
import { Loader2 } from 'lucide-react'

/**
 * Компонент сплэш-загрузки.
 * Используется при инициализации приложения (например, во время восстановления состояния Redux).
 */
const SplashScreen = () => {
    return (
        <div className="flex items-center justify-center h-screen w-screen bg-white dark:bg-neutral-900">
            <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-300" />
                <p className="text-sm text-muted-foreground">Загрузка приложения...</p>
            </div>
        </div>
    )
}

export default SplashScreen