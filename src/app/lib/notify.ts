import toast, { type ToastOptions } from 'react-hot-toast';

export type NotifyId = string;

type MsgSpec = string | { text: string; toastOptions?: ToastOptions };

export type RunMsgs = {
    loading?: MsgSpec;
    success?: MsgSpec; // если undefined — успех не показываем
    error?: MsgSpec;   // если undefined — ошибку не показываем
};

export type RunOpts = {
    id?: NotifyId;
    silent?: boolean;
    /** Глобальные опции для ВСЕХ стадий; при совпадении ключей перетираются stage.toastOptions */
    toastOptions?: ToastOptions;
};

export function extractErrorMessage(input: unknown): string {
    if (!input) return 'Request failed';
    if (typeof input === 'string') return input;
    const any = input as any;
    if (typeof any.errorMessage === 'string') return any.errorMessage;
    if (typeof any.message === 'string') return any.message;
    try { return JSON.stringify(input); } catch { return 'Request failed'; }
}



function toSpec(x?: MsgSpec): { text: string; toastOptions?: ToastOptions } | undefined {
    if (!x) return undefined;
    return typeof x === 'string' ? { text: x } : x;
}

export const notify = {
    show:    (msg: string, opts?: { id?: NotifyId } & ToastOptions) => toast(msg, opts),
    success: (msg: string, opts?: { id?: NotifyId } & ToastOptions) => toast.success(msg, opts),
    error:   (msg: string, opts?: { id?: NotifyId } & ToastOptions) => toast.error(msg, opts),
    loading: (msg: string, opts?: { id?: NotifyId } & ToastOptions) => toast.loading(msg, opts),
    dismiss: (id?: NotifyId) => (id ? toast.dismiss(id) : toast.dismiss()),

    async run<T>(promise: Promise<T>, msgs: RunMsgs = {}, opts?: RunOpts): Promise<T> {
        const { id, silent, toastOptions: globalOpts } = opts ?? {};
        const loading = toSpec(msgs.loading);
        const success = toSpec(msgs.success);
        const error   = toSpec(msgs.error);

        if (!silent && loading?.text) {
            const loadingOpts: ToastOptions = {
                duration: Infinity, // дефолт для лоадера, если пользователь не переопределил
                ...globalOpts,
                ...loading.toastOptions,
                id,
            } as ToastOptions;
            toast.loading(loading.text, loadingOpts);
        }

        try {
            const res = await promise;
            if (!silent) {
                if (success?.text) {
                    const successOpts: ToastOptions = {
                        ...globalOpts,
                        ...success.toastOptions,
                        id,
                    } as ToastOptions;
                    toast.success(success.text, successOpts);
                } else if (loading?.text) {
                    toast.dismiss(id);
                }
            }
            return res;
        } catch (err) {
            if (!silent) {
                if (error?.text) {
                    // извлекаем текст ошибки, но не перетираем явный error.text, если он задан явно
                    const extracted = extractErrorMessage((err as any)?.response?.data ?? err);
                    const text = error.text ?? extracted;
                    const errorOpts: ToastOptions = {
                        ...globalOpts,
                        ...error.toastOptions,
                        id,
                    } as ToastOptions;
                    toast.error(text, errorOpts);
                } else if (loading?.text) {
                    toast.dismiss(id);
                }
            }
            throw err;
        }
    },
};
