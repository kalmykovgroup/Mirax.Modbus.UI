// features/chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/ResetZoomButton/ResetZoomButton.tsx

import { memo } from 'react';
import styles from './ResetZoomButton.module.css';

interface ResetZoomButtonProps {
    readonly onClick: () => void;
    readonly disabled?: boolean | undefined;
    readonly label?: string;
}

export const ResetZoomButton = memo<ResetZoomButtonProps>(function ResetZoomButton({
                                                                                       onClick,
                                                                                       label,
                                                                                       disabled = false
                                                                                   }) {
    return (
        <button
            type="button"
            className={styles.button}
            onClick={onClick}
            disabled={disabled}
            aria-label="Сбросить зум всех графиков"
            title="Сбросить зум всех графиков"
        >
            <svg
                className={styles.icon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
            </svg>
            <span className={styles.text}>{label ?? "Сбросить зум"}</span>
        </button>
    );
});