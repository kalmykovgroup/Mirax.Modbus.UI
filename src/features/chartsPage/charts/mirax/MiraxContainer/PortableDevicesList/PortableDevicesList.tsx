// src/features/chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/PortableDevicesList.tsx
import type { JSX } from 'react';

import type { PortableDeviceDto } from '@chartsPage/charts/mirax/contracts/PortableDeviceDto';
import { PortableDeviceItem } from './PortableDeviceItem/PortableDeviceItem';
import styles from './PortableDevicesList.module.css';

interface Props {
    readonly devices: readonly PortableDeviceDto[];
    readonly technicalRunId: string;
}

/**
 * Список портативных устройств (только отображение, без фильтрации).
 * Фильтрация по портам происходит выше в DevicesPanel.
 */
export function PortableDevicesList({ devices, technicalRunId }: Props): JSX.Element {
    return (
        <>
            <ul className={styles.list}>
                {devices.map((device, index) => (
                    <PortableDeviceItem
                        key={device.id}
                        isFirst={index === 0}
                        device={device}
                        technicalRunId={technicalRunId}
                    />
                ))}
            </ul>

            {/* Плейсхолдер для пустого списка */}
            {devices.length === 0 && (
                <div className={styles.emptyState}>
                    Нет устройств
                </div>
            )}
        </>
    );
}