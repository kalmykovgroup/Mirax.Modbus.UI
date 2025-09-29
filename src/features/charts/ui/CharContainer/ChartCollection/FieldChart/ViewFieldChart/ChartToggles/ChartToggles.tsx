import React from 'react';
import styles from './ChartToggles.module.css';

type BoolSetter = (v: boolean) => void;

type Props = {
    // Рендерим, только если пара передана
    showMin?: boolean;
    setShowMin?: BoolSetter;

    showMax?: boolean;
    setShowMax?: BoolSetter;

    showArea?: boolean;
    setShowArea?: BoolSetter;

    className?: string;
};

const ChartToggles: React.FC<Props> = ({
                                           showMin, setShowMin,
                                           showMax, setShowMax,
                                           showArea, setShowArea,
                                           className,
                                       }) => {
    return (
        <div className={`${styles.toggles} ${className ?? ''}`} role="group" aria-label="Показывать серии">
            {typeof showMin === 'boolean' && setShowMin && (
                <label className={styles.toggle}>
                    <input
                        type="checkbox"
                        checked={showMin}
                        onChange={(e) => setShowMin(e.target.checked)}
                    />
                    <span>Min</span>
                </label>
            )}

            {typeof showMax === 'boolean' && setShowMax && (
                <label className={styles.toggle}>
                    <input
                        type="checkbox"
                        checked={showMax}
                        onChange={(e) => setShowMax(e.target.checked)}
                    />
                    <span>Max</span>
                </label>
            )}

            {typeof showArea === 'boolean' && setShowArea && (
                <label className={styles.toggle}>
                    <input
                        type="checkbox"
                        checked={showArea}
                        onChange={(e) => setShowArea(e.target.checked)}
                    />
                    <span>Avg/Area</span>
                </label>
            )}
        </div>
    );
};

export default ChartToggles;
