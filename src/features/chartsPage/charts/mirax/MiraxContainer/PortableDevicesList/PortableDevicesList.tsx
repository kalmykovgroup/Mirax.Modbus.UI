// src/features/mirax/components/PortableDevicesList.tsx
import type { PortableDeviceDto } from '@chartsPage/charts/mirax/contracts/PortableDeviceDto.ts';

import styles from './PortableDevicesList.module.css';
import {
    PortableDeviceItem
} from "@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/PortableDeviceItem/PortableDeviceItem.tsx";
import type {JSX} from "react";

interface Props {
    readonly devices: readonly PortableDeviceDto[];
    readonly technicalRunId: string;
}

export function PortableDevicesList({ devices, technicalRunId }: Props): JSX.Element {
    return (
        <ul className={styles.list}>
            {devices.map((device, index) => (
                <PortableDeviceItem
                    isFirst={index == 0}
                    key={device.id}
                    device={device}
                    technicalRunId={technicalRunId}
                />
            ))}
        </ul>
    );
}