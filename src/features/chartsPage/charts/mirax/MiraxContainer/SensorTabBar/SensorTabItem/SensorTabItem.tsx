// src/features/mirax/components/SensorTabBar/SensorTabItem/SensorTabItem.tsx
import { useCallback, type JSX } from 'react';
import classNames from 'classnames';

import styles from './SensorTabItem.module.css';
import type { SensorTab } from '@chartsPage/charts/mirax/miraxSlice.ts';

interface Props {
    readonly sensorTab: SensorTab;
    readonly isActive: boolean;
    readonly onActivate: () => void;
    readonly onClose: () => void;
}

export function SensorTabItem({ sensorTab, isActive, onActivate, onClose }: Props): JSX.Element {
    const handleClose = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onClose();
        },
        [onClose]
    );

    const { sensor } = sensorTab;

    const displayName = sensor.modification
        ? `${sensor.gas} (${sensor.modification})`
        : sensor.gas;

    return (
        <div
            className={classNames(styles.tab, isActive && styles.active)}
            onClick={onActivate}
            role="tab"
            aria-selected={isActive}
        >
      <span className={styles.title} title={displayName}>
        <span className={styles.gas}>{displayName}</span>
        <span className={styles.channel}>Канал {sensor.channelNumber}</span>
      </span>
            <button
                className={styles.closeButton}
                onClick={handleClose}
                aria-label="Закрыть вкладку"
                type="button"
            >
                ×
            </button>
        </div>
    );
}