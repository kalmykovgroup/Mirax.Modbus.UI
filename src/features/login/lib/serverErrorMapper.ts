import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

/** Универсальная форма серверной ошибки по полю */
export type ServerFieldError = {
    field?: string | null | undefined
    message: string
}

/** Маппинг "серверное имя поля" -> "имя поля в форме" */
export type FieldMap<TFieldValues extends FieldValues> =
    Partial<Record<string, Path<TFieldValues>>>

/**
 * Нормализация серверного имени поля:
 * 1) сначала применяем явный map (server → client)
 * 2) если map не дал результата, берём последний сегмент после точки: "user.email" -> "email"
 * 3) если пусто — возвращаем null
 */
export function normalizeServerField<TFieldValues extends FieldValues>(
    serverField?: string | null | undefined,
    map?: FieldMap<TFieldValues> | undefined
): string | null {
    if (!serverField) return null
    const mapped = map?.[serverField as keyof typeof map]
    if (mapped) return mapped as string
    const last = serverField.split('.').pop()
    return last ?? serverField
}

/**
 * Основной маппер:
 * - Если server errors ссылаются на известные поля формы — ставим field error через setError
 * - Если поле незнакомо форме — копим сообщение как "общую" (root) ошибку
 * - Если errors пусты/не пришли — ставим root ошибку с defaultMessage
 *
 * Возвращает: кол-во ошибок по полям и общий текст (если был).
 */
export function mapServerErrorsToForm<TFieldValues extends FieldValues>(
    params: {
        errors?: ServerFieldError[] | null | undefined
        setError: UseFormSetError<TFieldValues>
        knownFields: Array<Path<TFieldValues>>
        fieldMap?: FieldMap<TFieldValues> | undefined
        defaultMessage?: string | undefined
    }
): { fieldErrors: number; commonMessage: string | null } {
    const { errors, setError, knownFields, fieldMap, defaultMessage } = params
    const known = new Set<string>(knownFields as string[])
    const rootKey = 'root' as Path<TFieldValues> // спец-ключ R-H-F для "общей" ошибки формы

    if (!errors || errors.length === 0) {
        const msg = defaultMessage ?? 'Неизвестная ошибка'
        setError(rootKey, { type: 'server', message: msg })
        return { fieldErrors: 0, commonMessage: msg }
    }

    let fieldErrors = 0
    const commonMessages: string[] = []

    for (const err of errors) {
        const norm = normalizeServerField<TFieldValues>(err.field, fieldMap)
        if (norm && known.has(norm)) {
            setError(norm as Path<TFieldValues>, { type: 'server', message: err.message })
            fieldErrors++
        } else {
            commonMessages.push(err.message)
        }
    }

    const commonMessage = commonMessages.length ? commonMessages.join('\n') : null
    if (commonMessage) {
        setError(rootKey, { type: 'server', message: commonMessage })
    }

    return { fieldErrors, commonMessage }
}

/**
 * Удобная обёртка для типичных payload'ов (например, LoginResponse или { errors, errorMessage }):
 * Пробует взять errors + errorMessage. Если errors нет — ставит root ошибку с errorMessage/defaultMessage.
 */
export function mapServerPayloadErrorsToForm<TFieldValues extends FieldValues>(
    payload: unknown,
    setError: UseFormSetError<TFieldValues>,
    knownFields: Array<Path<TFieldValues>>,
    fieldMap?: FieldMap<TFieldValues> | undefined,
    defaultMessage?: string | undefined
): string | null {
    const p = (payload ?? {}) as { errors?: ServerFieldError[] | undefined; errorMessage?: string | undefined }

    const { commonMessage } = mapServerErrorsToForm<TFieldValues>({
        errors: p.errors ?? null,
        setError: setError,
        knownFields,
        fieldMap,
        defaultMessage: p.errorMessage ?? defaultMessage
    })

    return commonMessage
}