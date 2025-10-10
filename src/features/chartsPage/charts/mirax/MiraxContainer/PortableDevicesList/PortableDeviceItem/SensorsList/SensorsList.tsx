// src/features/chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/PortableDeviceItem/SensorsList/SensorsList.tsx
import type { JSX } from 'react';

import styles from './SensorsList.module.css';
import type { SensorDto } from '@chartsPage/charts/mirax/contracts/SensorDto';
import { SensorItem } from './SensorItem/SensorItem';

interface Props {
    readonly sensors: readonly SensorDto[];
}

export function SensorsList({ sensors }: Props): JSX.Element {
    return (
        <ul className={styles.list}>
            {sensors.map((sensor, index) => (
                <SensorItem
                    key={`${sensor.gas}-${sensor.channelNumber}-${index}`}
                    sensor={sensor}
                />
            ))}
        </ul>
    );
}