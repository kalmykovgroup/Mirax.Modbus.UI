// src/features/chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/PortableDeviceItem/SensorsList/SensorItem/SensorItem.tsx
import type { JSX } from 'react';

import styles from './SensorItem.module.css';
import type { SensorDto } from '@chartsPage/charts/mirax/contracts/SensorDto';

interface Props {
    readonly sensor: SensorDto;
}

export function SensorItem({ sensor }: Props): JSX.Element {
    return (
        <li className={styles.item}>
            <div className={styles.content}>
                <span className={styles.gas}>{sensor.gas}</span>
                <span className={styles.channel}>Канал {sensor.channelNumber}</span>
                {sensor.modification && (
                    <span className={styles.modification}>{sensor.modification}</span>
                )}
            </div>
        </li>
    );
}