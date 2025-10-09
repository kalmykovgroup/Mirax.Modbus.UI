// src/features/mirax/components/SensorTabsSection/SensorTabsSection.tsx
import type { JSX } from 'react';

import styles from './SensorTabsSection.module.css';
import { useAppSelector } from '@/store/hooks';
import { selectActiveSensorTab } from '@chartsPage/charts/mirax/miraxSlice';
import type { Guid } from '@app/lib/types/Guid';
import {
    SensorTabBar
} from "@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/SensorsList/SensorTabBar/SensorTabBar.tsx";
import {
    SensorTabContent
} from "@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/SensorsList/SensorTabBar/SensorTabContent/SensorTabContent.tsx";

interface Props {
    readonly technicalRunId: Guid;
}

export function SensorTabsSection({ technicalRunId }: Props): JSX.Element {
    const activeSensorTab = useAppSelector((state) => selectActiveSensorTab(state, technicalRunId));

    return (
        <div className={styles.container}>
            {/* Вкладки сенсоров */}
            <SensorTabBar technicalRunId={technicalRunId} />

            {/* Содержимое активной вкладки */}
            <div className={styles.content}>
                {activeSensorTab ? (
                    <SensorTabContent sensorTab={activeSensorTab} />
                ) : (
                    <div className={styles.placeholder}>Нет активной вкладки сенсора</div>
                )}
            </div>
        </div>
    );
}