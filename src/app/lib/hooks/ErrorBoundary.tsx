import React, { type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryState {
    hasError: boolean
    error?: Error | undefined
}

interface ErrorBoundaryProps {
    /**
     * Дочерние компоненты, которые будут отрисованы внутри ErrorBoundary
     */
    children: ReactNode

    /**
     * Компонент-заглушка, отображаемый при ошибке
     * Получает объект ошибки в пропсах (может быть undefined)
     */
    fallback: React.ReactElement<{ error?: Error | undefined }>
}

/**
 * ErrorBoundary — компонент для перехвата и обработки ошибок рендеринга React-компонентов.
 * Используется для graceful fallback UI, логирования ошибок и предотвращения краха всего приложения.
 *
 * @example
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <DangerousComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false }

    /**
     * Вызывается при возникновении ошибки в дочернем дереве.
     * Обновляет состояние, чтобы показать fallback UI.
     */
    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    /**
     * Хук для логирования ошибки — можно отправить в Sentry, LogRocket и т.д.
     */
    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('ErrorBoundary caught:', error, info)
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return React.cloneElement(this.props.fallback, {
                error: this.state.error,
            })
        }
        return this.props.children
    }
}

export default ErrorBoundary