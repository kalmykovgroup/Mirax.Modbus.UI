import React from 'react';
import { Toaster, ToastBar, toast, type Toast } from 'react-hot-toast';

export function AppToaster() {
    // Глобальные флаги: какой тост «скопирован» и какой «копируется» сейчас
    const [copiedId, setCopiedId]   = React.useState<string | null>(null);
    const [copyingId, setCopyingId] = React.useState<string | null>(null);

    return (
        <Toaster
            position="top-right"
            toastOptions={{
                duration: 4000,
                success: { duration: 3000 },
                error:   { duration: 6000 },
                loading: { duration: Infinity },
                style: { paddingRight: 8 },
            }}
        >
            {(t) => (
                <ToastItem
                    t={t}
                    copiedId={copiedId}
                    setCopiedId={setCopiedId}
                    copyingId={copyingId}
                    setCopyingId={setCopyingId}
                />
            )}
        </Toaster>
    );
}

function ToastItem({
                       t,
                       copiedId,
                       setCopiedId,
                       copyingId,
                       setCopyingId,
                   }: {
    t: Toast;
    copiedId: string | null;
    setCopiedId: React.Dispatch<React.SetStateAction<string | null>>;
    copyingId: string | null;
    setCopyingId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
    const msgRef = React.useRef<HTMLDivElement>(null);

    const isCopied  = t.id === copiedId;
    const isCopying = t.id === copyingId;

    const copyError = async () => {
        if (t.type !== 'error') return;
        try {
            setCopyingId(t.id);
            const text = msgRef.current?.textContent?.trim() ?? '';
            if (!text) return;
            await navigator.clipboard.writeText(text);
            setCopiedId(t.id); // отметить текущий тост как «скопирован»
        } finally {
            setCopyingId((id) => (id === t.id ? null : id));
        }
    };

    // Если этот тост размонтировался, сбросим его флаги
    React.useEffect(() => {
        return () => {
            setCopiedId((id) => (id === t.id ? null : id));
            setCopyingId((id) => (id === t.id ? null : id));
        };
    }, [t.id, setCopiedId, setCopyingId]);

    return (
        <ToastBar toast={t}>
            {({ icon, message }) => (
                <>
                    {icon}
                    <div ref={msgRef} style={{ flex: 1, marginLeft: 8, userSelect: 'text' }}>
                        {message}
                    </div>

                    {/* Закрыть — для всех */}
                    <button
                        aria-label="Закрыть"
                        onClick={() => toast.dismiss(t.id)}
                        style={btn}
                        title="Закрыть"
                    >
                        ×
                    </button>

                    {/* Копировать — только для ошибок */}
                    {t.type === 'error' && (
                        <button
                            aria-label={isCopied ? 'Скопировано' : 'Скопировать текст ошибки'}
                            onClick={copyError}
                            style={btn}
                            disabled={isCopying}
                            title={isCopied ? 'Скопировано' : 'Скопировать'}
                        >

                            {isCopying ? '…' : isCopied ? <span style={{color: "#49cc90"}}>✓</span> : <span>⧉</span>}
                        </button>
                    )}
                </>
            )}
        </ToastBar>
    );
}

const btn: React.CSSProperties = {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: 1,
    padding: 4,
    marginLeft: 8,
    opacity: 0.85,
};
