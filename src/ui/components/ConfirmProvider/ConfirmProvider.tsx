import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ConfirmDialog.module.css';

type Options = {
    title?: string | undefined;
    description?: string | undefined;
    confirmText?: string | undefined;
    cancelText?: string | undefined;
    danger?: boolean | undefined;           // красная кнопка подтверждения
    disableBackdropClose?: boolean | undefined;
};

type ConfirmFn = (opts?: Options) => Promise<boolean>;
const ConfirmCtx = createContext<ConfirmFn | undefined>(undefined);

export function useConfirm(): ConfirmFn {
    const ctx = useContext(ConfirmCtx);
    if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
    return ctx;
}

export const ConfirmProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const resolverRef = useRef<((v: boolean) => void) | undefined>(undefined);
    const [open, setOpen] = useState(false);
    const [opts, setOpts] = useState<Options>({});

    const close = (v: boolean) => {
        setOpen(false);
        resolverRef.current?.(v);
        resolverRef.current =  undefined;
    };

    const confirm = useCallback<ConfirmFn>((options) => {
        setOpts(options ?? {});
        setOpen(true);
        return new Promise<boolean>((resolve) => { resolverRef.current = resolve; });
    }, []);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape' && !opts.disableBackdropClose) close(false);
        if (e.key === 'Enter') close(true);
    };

    const ui = useMemo(() => (
        !open ? null :
            createPortal(
                <div className={styles.backdrop} aria-hidden={!open} onMouseDown={() => !opts.disableBackdropClose && close(false)}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="confirm-title"
                        aria-describedby="confirm-desc"
                        className={styles.dialog}
                        onMouseDown={(e) => e.stopPropagation()}
                        onKeyDown={onKeyDown}
                        tabIndex={-1}
                    >
                        {opts.title && <h3 id="confirm-title" className={styles.title}>{opts.title}</h3>}
                        {opts.description && <p id="confirm-desc" className={styles.desc}>{opts.description}</p>}
                        <div className={styles.actions}>
                            <button type="button" className={styles.btn} onClick={() => close(false)}>
                                {opts.cancelText ?? 'Cancel'}
                            </button>
                            <button
                                type="button"
                                className={`${styles.btn} ${opts.danger ? styles.danger : styles.primary}`}
                                onClick={() => close(true)}
                                autoFocus
                            >
                                {opts.confirmText ?? 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )
    ), [open, opts]);

    return (
        <ConfirmCtx.Provider value={confirm}>
            {children}
            {ui}
        </ConfirmCtx.Provider>
    );
};
