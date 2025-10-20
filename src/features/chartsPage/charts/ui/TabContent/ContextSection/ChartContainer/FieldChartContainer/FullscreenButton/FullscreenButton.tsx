// features/chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/FullscreenButton/FullscreenButton.tsx

import { memo } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import styles from './FullscreenButton.module.css';

interface FullscreenButtonProps {
    readonly isFullscreen: boolean;
    readonly onToggle: () => void;
    readonly disabled?: boolean | undefined;
}

export const FullscreenButton = memo(function FullscreenButton({
                                                                   isFullscreen,
                                                                   onToggle,
                                                                   disabled = false
                                                               }: FullscreenButtonProps) {
    return (
        <button
            type="button"
            className={styles.fullscreenButton}
            onClick={onToggle}
            disabled={disabled}
            aria-label={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
            title={isFullscreen ? 'Выйти из полноэкранного режима (Esc)' : 'Полноэкранный режим (F)'}
        >
            {isFullscreen ? (
                <Minimize2 size={18} className={styles.icon} />
            ) : (
                <Maximize2 size={18} className={styles.icon} />
            )}
        </button>
    );
});