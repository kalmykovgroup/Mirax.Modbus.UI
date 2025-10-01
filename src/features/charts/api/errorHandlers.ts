
export function extractErrorMessage(input: unknown): string {
    if (!input) return 'Request failed'
    if (typeof input === 'string') return input

    const any = input as any

    // 1) RTK Query rejected response: error.data.errorMessage
    if (any.data && typeof any.data === 'object') {
        // Проверяем структуру ApiResponse
        if (typeof any.data.errorMessage === 'string' && any.data.errorMessage) {
            return any.data.errorMessage
        }
        if (typeof any.data.message === 'string' && any.data.message) {
            return any.data.message
        }
    }

    // 2) Прямое поле errorMessage (для обратной совместимости)
    if (typeof any.errorMessage === 'string' && any.errorMessage) {
        return any.errorMessage
    }

    // 3) Прямое поле message
    if (typeof any.message === 'string' && any.message) {
        return any.message
    }

    // 4) Axios response.data (для сетевых ошибок)
    if (any.response?.data) {
        return extractErrorMessage(any.response.data)
    }

    // 5) Fallback - пытаемся сериализовать
    try {
        const str = JSON.stringify(input)
        // Если получили пустой объект - возвращаем дефолтное сообщение
        if (str === '{}' || str === 'null') {
            return 'Request failed'
        }
        return str
    } catch {
        return 'Request failed'
    }
}
