// src/features/mirax/components/SensorTabContent/SensorTabContent.tsx
import type { JSX } from 'react';

import styles from './SensorTabContent.module.css';
import type { SensorTab } from '@chartsPage/charts/mirax/miraxSlice.ts';
import { SensorChartPlaceholder } from './SensorChartPlaceholder/SensorChartPlaceholder.tsx';

interface Props {
    readonly sensorTab: SensorTab;
}

export function SensorTabContent({ sensorTab }: Props): JSX.Element {
    const { technicalRun, device, sensor } = sensorTab;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h3 className={styles.title}>
                        {sensor.modification ? `${sensor.gas} (${sensor.modification})` : sensor.gas}
                    </h3>
                    <span className={styles.subtitle}>Канал {sensor.channelNumber}</span>
                </div>

                <div className={styles.metadata}>
                    <div className={styles.metaGroup}>
                        <span className={styles.metaLabel}>Испытание:</span>
                        <span className={styles.metaValue}>{technicalRun.name ?? 'Без названия'}</span>
                    </div>
                    <div className={styles.metaGroup}>
                        <span className={styles.metaLabel}>Устройство:</span>
                        <span className={styles.metaValue}>
              {device.name ?? `Устройство ${device.factoryNumber}`}
            </span>
                    </div>
                    <div className={styles.metaGroup}>
                        <span className={styles.metaLabel}>Заводской номер:</span>
                        <span className={styles.metaValue}>№{device.factoryNumber}</span>
                    </div>
                </div>
            </div>

            <div className={styles.content}>
                <SensorChartPlaceholder
                    technicalRun={technicalRun}
                    device={device}
                    sensor={sensor}
                />
            </div>
        </div>
    );
}