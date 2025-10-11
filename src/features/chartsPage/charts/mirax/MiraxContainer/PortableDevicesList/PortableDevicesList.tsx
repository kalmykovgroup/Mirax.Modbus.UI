// src/features/chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/PortableDevicesList.tsx
import type { JSX } from 'react';

import type { PortableDeviceDto } from '@chartsPage/charts/mirax/contracts/PortableDeviceDto';
import type { TechnicalRunDto } from '@chartsPage/charts/mirax/contracts/TechnicalRunDto';
import { PortableDeviceItem } from './PortableDeviceItem/PortableDeviceItem';
import styles from './PortableDevicesList.module.css';

interface Props {
    readonly devices: readonly PortableDeviceDto[];
    readonly technicalRun: TechnicalRunDto;
}

/**
 * Список портативных устройств (только отображение, без фильтрации).
 * Фильтрация по портам происходит выше в DevicesPanel.
 */
export function PortableDevicesList({ devices, technicalRun }: Props): JSX.Element {
    // ✅ Runtime-защита: проверяем обязательные данные
    if (!technicalRun) {
        console.error('PortableDevicesList: отсутствует technicalRun');
        return (
            <div className={styles.errorState}>
                Ошибка: отсутствуют данные испытания
            </div>
        );
    }

    // ✅ Проверка пустого списка устройств
    if (devices.length === 0) {
        return (
            <div className={styles.emptyState}>
                Нет устройств
            </div>
        );
    }

    return (
        <ul className={styles.list}>
            {devices.map((device, index) => (
                <PortableDeviceItem
                    key={device.id}
                    isFirst={index === 0}
                    device={device}
                    technicalRun={technicalRun}
                />
            ))}
        </ul>
    );
}