// features/chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ViewFieldChart/ChartNavigator/ChartNavigator.tsx

import { memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './ChartNavigator.module.css';

interface ChartNavigatorProps {
    readonly totalFields: number;
    readonly currentIndex: number;
    readonly onPrevious: () => void;
    readonly onNext: () => void;
}

export const ChartNavigator = memo(function ChartNavigator({
                                                               totalFields,
                                                               currentIndex,
                                                               onPrevious,
                                                               onNext
                                                           }: ChartNavigatorProps) {
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < totalFields - 1;

    return (
        <div className={styles.navigator}>
            <button
                type="button"
                className={styles.navButton}
                onClick={onPrevious}
                disabled={!hasPrevious}
                aria-label="Предыдущий график"
                title="Предыдущий график (←)"
            >
                <ChevronLeft size={24} className={styles.icon} />
            </button>

            <div className={styles.info}>
                <span className={styles.counter}>
          {currentIndex + 1} / {totalFields}
        </span>
            </div>

            <button
                type="button"
                className={styles.navButton}
                onClick={onNext}
                disabled={!hasNext}
                aria-label="Следующий график"
                title="Следующий график (→)"
            >
                <ChevronRight size={24} className={styles.icon} />
            </button>
        </div>
    );
});