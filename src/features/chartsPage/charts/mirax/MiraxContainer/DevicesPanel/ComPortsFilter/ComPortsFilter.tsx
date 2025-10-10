// src/features/chartsPage/charts/mirax/MiraxContainer/DevicesPanel/ComPortsFilter/ComPortsFilter.tsx
import { useMemo, useCallback, type JSX } from 'react';
import classNames from 'classnames';

import type { PortableDeviceDto } from '@chartsPage/charts/mirax/contracts/PortableDeviceDto';
import styles from './ComPortsFilter.module.css';

interface Props {
    readonly devices: readonly PortableDeviceDto[];
    readonly selectedPort: string | null;
    readonly onPortChange: (port: string | null) => void;
}

/**
 * Фильтр по COM-портам.
 * Вкладки портов, зафиксированные в header панели устройств.
 */
export function ComPortsFilter({ devices, selectedPort, onPortChange }: Props): JSX.Element | null {
    /**
     * Извлечь уникальные COM-порты и отсортировать их
     */
    const uniquePorts = useMemo((): readonly string[] => {
        const portsSet = new Set<string>();

        for (const device of devices) {
            const portName = device.comPortName;
            if (portName != null && portName.trim() !== '') {
                portsSet.add(portName);
            }
        }

        // Сортировка: COM1, COM2, ..., COM10, COM11
        return Array.from(portsSet).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
            return numA - numB;
        });
    }, [devices]);

    /**
     * Обработчик клика на вкладку порта.
     * Повторный клик на активный порт сбрасывает фильтр.
     */
    const handlePortClick = useCallback(
        (port: string): void => {
            onPortChange(selectedPort === port ? null : port);
        },
        [selectedPort, onPortChange]
    );

    /**
     * Подсчёт устройств для конкретного порта
     */
    const getPortDeviceCount = useCallback(
        (port: string): number => {
            return devices.filter((d) => {
                const portName = d.comPortName;
                return portName != null && portName === port;
            }).length;
        },
        [devices]
    );

    // Не показываем фильтр, если портов меньше 2
    if (uniquePorts.length < 2) {
        return null;
    }

    return (
        <div className={styles.container}>
            <div className={styles.tabs}>
                {uniquePorts.map((port) => (
                    <button
                        key={port}
                        type="button"
                        className={classNames(styles.tab, {
                            [styles.tabActive]: selectedPort === port,
                        })}
                        onClick={() => handlePortClick(port)}
                        title={
                            selectedPort === port
                                ? `Сбросить фильтр ${port}`
                                : `Фильтр по ${port}`
                        }
                    >
                        <span className={styles.tabTitle}>{port}</span>
                        <span className={styles.tabCount}>
                            ({getPortDeviceCount(port)})
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}