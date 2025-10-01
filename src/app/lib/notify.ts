// src/app/lib/notify.ts
import toast, { type ToastOptions } from 'react-hot-toast'
import { extractErrorMessage } from '@charts/api/errorHandlers.ts'

export { extractErrorMessage }

export type NotifyId = string

type MsgSpec = string | { text?: string | undefined; toastOptions?: ToastOptions | undefined }

export type RunMsgs = {
    loading?: MsgSpec | undefined
    success?: MsgSpec | undefined
    /**
     * Сообщение об ошибке.
     * Варианты использования:
     *
     * 1. НЕ указано (undefined):
     *    - Нотификация НЕ показывается
     *    - В catch приходит оригинальная ошибка
     *
     * 2. Пустая строка '':
     *    - Автоматически извлекается через extractErrorMessage
     *    - Показывается с дефолтными опциями
     *
     * 3. Строка 'текст':
     *    - Показывается явное сообщение
     *
     * 4. Объект { text: 'текст' }:
     *    - Показывается явное сообщение
     *
     * 5. Объект { toastOptions: {...} }:
     *    - Автоматически извлекается через extractErrorMessage
     *    - Показывается с кастомными опциями (duration, icon и т.д.)
     *
     * 6. Объект { text: 'текст', toastOptions: {...} }:
     *    - Показывается явное сообщение с кастомными опциями
     */
    error?: MsgSpec | undefined
}

export type RunOpts = {
    id?: NotifyId | undefined
    silent?: boolean | undefined
    toastOptions?: ToastOptions | undefined
}

function toSpec(x?: MsgSpec): { text?: string | undefined; toastOptions?: ToastOptions | undefined } | undefined {
    if (x === undefined) return undefined
    return typeof x === 'string' ? { text: x } : x
}

export const notify = {
    show: (msg: string, opts?: { id?: NotifyId } & ToastOptions) => toast(msg, opts),
    success: (msg: string, opts?: { id?: NotifyId } & ToastOptions) => toast.success(msg, opts),
    error: (msg: string, opts?: { id?: NotifyId } & ToastOptions) => toast.error(msg, opts),
    loading: (msg: string, opts?: { id?: NotifyId } & ToastOptions) => toast.loading(msg, opts),
    dismiss: (id?: NotifyId) => (id ? toast.dismiss(id) : toast.dismiss()),

    /**
     * Выполняет Promise с автоматическим управлением нотификациями
     */
    async run<T>(promise: Promise<T>, msgs: RunMsgs = {}, opts?: RunOpts): Promise<T> {
        const { id, silent, toastOptions: globalOpts } = opts ?? {}
        const loading = toSpec(msgs.loading)
        const success = toSpec(msgs.success)
        const error = toSpec(msgs.error)

        // Показываем loading
        if (!silent && loading?.text) {
            const loadingOpts: ToastOptions = {
                duration: Infinity,
                ...globalOpts,
                ...loading.toastOptions,
                id,
            } as ToastOptions
            toast.loading(loading.text, loadingOpts)
        }

        try {
            const res = await promise

            // Успех
            if (!silent && success) {
                if (success.text) {
                    const successOpts: ToastOptions = {
                        ...globalOpts,
                        ...success.toastOptions,
                        id,
                    } as ToastOptions
                    toast.success(success.text, successOpts)
                } else if (loading?.text) {
                    toast.dismiss(id)
                }
            } else if (!silent && loading?.text) {
                toast.dismiss(id)
            }

            return res

        } catch (err) {
            // Обработка ошибки
            if (!silent) {
                // Проверяем, передан ли ключ 'error' в msgs
                const hasErrorKey = 'error' in msgs

                if (hasErrorKey && error !== undefined) {
                    // error указан - показываем нотификацию

                    // Определяем текст:
                    // - Если text явно указан и непустой - используем его
                    // - Иначе извлекаем автоматически
                    const text = (error.text !== undefined && error.text !== '')
                        ? error.text
                        : extractErrorMessage(err)

                    const errorOpts: ToastOptions = {
                        ...globalOpts,
                        ...error.toastOptions,
                        id,
                    } as ToastOptions

                    toast.error(text, errorOpts)
                } else if (loading?.text) {
                    // error НЕ указан - просто убираем loading без показа ошибки
                    toast.dismiss(id)
                }
            }

            // КРИТИЧНО: выбрасываем ОРИГИНАЛЬНУЮ ошибку без изменений
            throw err
        }
    },
}