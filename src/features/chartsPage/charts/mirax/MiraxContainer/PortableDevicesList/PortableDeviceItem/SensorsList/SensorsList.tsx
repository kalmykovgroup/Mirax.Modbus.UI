// src/features/mirax/components/SensorsList/SensorsList.tsx
import type { JSX } from 'react';

import styles from './SensorsList.module.css';
import type { SensorDto } from '@chartsPage/charts/mirax/contracts/SensorDto.ts';
import { SensorItem } from './SensorItem/SensorItem.tsx';
import type { Guid } from '@app/lib/types/Guid.ts';

interface Props {
    readonly sensors: readonly SensorDto[];
    readonly technicalRunId: Guid;
    readonly factoryNumber: string;
}

export function SensorsList({ sensors, technicalRunId, factoryNumber }: Props): JSX.Element {
    return (
        <ul className={styles.list}>
            {sensors.map((sensor, index) => (
                <SensorItem
                    key={`${sensor.gas}-${sensor.channelNumber}-${index}`}
                    sensor={sensor}
                    technicalRunId={technicalRunId}
                    factoryNumber={factoryNumber}
                />
            ))}
        </ul>
    );
}