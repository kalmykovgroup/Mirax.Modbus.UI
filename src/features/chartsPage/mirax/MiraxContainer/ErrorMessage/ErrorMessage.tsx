// src/features/mirax/components/ErrorMessage.tsx
import styles from './ErrorMessage.module.css';
import type {JSX} from "react";

interface Props {
    readonly message: string;
    readonly onRetry?: (() => void) | undefined;
}

export function ErrorMessage({ message, onRetry }: Props): JSX.Element {
    return (
        <div className={styles.container}>
            <div className={styles.icon}>⚠️</div>
            <p className={styles.message}>{message}</p>
            {onRetry && (
                <button className={styles.retryButton} onClick={onRetry}>
                    Повторить попытку
                </button>
            )}
        </div>
    );
}