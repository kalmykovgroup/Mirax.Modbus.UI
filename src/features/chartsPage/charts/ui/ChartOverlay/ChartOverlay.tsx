// components/chart/ChartOverlay/ChartOverlay.tsx
// Слой поверх графика для отображения состояний

import styles from './ChartOverlay.module.css';

// ============================================
// ТИПЫ
// ============================================

type OverlayType = 'loading' | 'error' | 'empty' | 'stale';

interface ChartOverlayProps {
    readonly type: OverlayType;
    readonly message?: string | undefined;
    readonly onRetry?: (() => void) | undefined;
}

// ============================================
// КОМПОНЕНТ
// ============================================

export function ChartOverlay({ type, message, onRetry }: ChartOverlayProps) {
    return (
        <div className={styles.overlay} data-type={type}>
            <div className={styles.content}>
                {type === 'loading' && (
                    <LoadingContent message={message} />
                )}

                {type === 'error' && (
                    <ErrorContent message={message} onRetry={onRetry} />
                )}

                {type === 'empty' && (
                    <EmptyContent message={message} />
                )}

                {type === 'stale' && (
                    <StaleContent message={message} />
                )}
            </div>
        </div>
    );
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
// ============================================

function LoadingContent({ message }: { message?: string | undefined }) {
    return (
        <>
            <div className={styles.spinner} />
            <p className={styles.message}>
                {message || 'Загрузка данных...'}
            </p>
        </>
    );
}

function ErrorContent({
                          message,
                          onRetry
                      }: {
    message?: string | undefined;
    onRetry?: (() => void) | undefined;
}) {
    return (
        <>
            <div className={styles.icon} data-icon="error">⚠️</div>
            <p className={styles.message}>
                {message || 'Ошибка загрузки данных'}
            </p>
            {onRetry && (
                <button
                    className={styles.retryButton}
                    onClick={onRetry}
                >
                    Повторить
                </button>
            )}
        </>
    );
}

function EmptyContent({ message }: { message?: string | undefined }) {
    return (
        <>
            <div className={styles.icon} data-icon="empty">📊</div>
            <p className={styles.message}>
                {message || 'Нет данных для отображения'}
            </p>
        </>
    );
}

function StaleContent({ message }: { message?: string | undefined }) {
    return (
        <div className={styles.staleIndicator}>
            <span className={styles.staleIcon}>⏳</span>
            <span className={styles.staleText}>
                {message || 'Загрузка точных данных...'}
            </span>
        </div>
    );
}