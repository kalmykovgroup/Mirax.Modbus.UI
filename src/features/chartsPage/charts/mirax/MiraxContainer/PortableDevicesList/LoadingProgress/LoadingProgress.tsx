// src/features/mirax/components/LoadingProgress.tsx
import styles from './LoadingProgress.module.css';
import type {JSX} from "react";

interface Props {
    readonly progress: number;
    readonly message?: string | undefined;
}

export function LoadingProgress({ progress, message }: Props): JSX.Element {
    return (
        <div className={styles.container}>
            <div className={styles.progressBar}>
                <div
                    className={styles.progressFill}
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
            </div>
            {message && <p className={styles.message}>{message}</p>}
            <p className={styles.percentage}>{Math.round(progress)}%</p>
        </div>
    );
}