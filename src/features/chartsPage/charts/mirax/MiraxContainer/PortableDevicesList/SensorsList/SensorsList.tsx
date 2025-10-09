// src/features/mirax/components/SensorsList.tsx
import type { SensorDto } from '@chartsPage/charts/mirax/contracts/SensorDto';
import styles from './SensorsList.module.css';
import {
    SensorItem
} from "@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/SensorsList/SensorItem/SensorItem.tsx";
import type {JSX} from "react";

interface Props {
    readonly sensors: readonly SensorDto[];
}

export function SensorsList({ sensors }: Props): JSX.Element {
    return (
        <ul className={styles.list}>
            {sensors.map((sensor, index) => (
                <SensorItem key={`${sensor.gas}-${sensor.channelNumber}-${index}`} sensor={sensor} />
            ))}
        </ul>
    );
}