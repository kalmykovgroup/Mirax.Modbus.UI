// src/features/chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/PortableDevicesList.tsx
import { type JSX, useEffect, useMemo, useRef } from 'react';
import classNames from 'classnames';

import type { PortableDeviceDto } from '@chartsPage/mirax/contracts/PortableDeviceDto';
import type { TechnicalRunDto } from '@chartsPage/mirax/contracts/TechnicalRunDto';
import { PortableDeviceItem } from './PortableDeviceItem/PortableDeviceItem';
import styles from './PortableDevicesList.module.css';

interface Props {
    readonly devices: readonly PortableDeviceDto[];
    readonly technicalRun: TechnicalRunDto;
    readonly activeFactoryNumber?: string | undefined;
}

export function PortableDevicesList({ devices, technicalRun, activeFactoryNumber }: Props): JSX.Element {
    const activeDeviceRef = useRef<HTMLDivElement | null>(null);

    // Находим индекс активного устройства
    const activeDeviceIndex = useMemo(() => {
        if (activeFactoryNumber === undefined) {
            return -1;
        }
        return devices.findIndex((device) => {
            if (!('factoryNumber' in device)) {
                return false;
            }
            return typeof device.factoryNumber === 'string' &&
                device.factoryNumber === activeFactoryNumber;
        });
    }, [devices, activeFactoryNumber]);

    // Автоскролл к активному устройству
    useEffect(() => {
        if (activeFactoryNumber === undefined) {
            console.log('PortableDevicesList: activeFactoryNumber is undefined');
            return;
        }

        if (activeDeviceIndex === -1) {
            console.warn('PortableDevicesList: устройство не найдено в списке', {
                activeFactoryNumber,
                devicesCount: devices.length,
            });
            return;
        }

        console.log('PortableDevicesList: попытка скролла к устройству', {
            activeFactoryNumber,
            activeDeviceIndex,
            ref: activeDeviceRef.current,
        });

        // ИСПРАВЛЕНО: используем requestAnimationFrame для гарантии рендера
        const rafId = requestAnimationFrame(() => {
            const timeoutId = setTimeout(() => {
                if (activeDeviceRef.current !== null) {
                    console.log('PortableDevicesList: выполняется scrollIntoView');

                    activeDeviceRef.current.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest',
                    });
                } else {
                    console.warn('PortableDevicesList: activeDeviceRef.current is null');
                }
            }, 150);

            // Cleanup для таймаута
            return () => clearTimeout(timeoutId);
        });

        // ИСПРАВЛЕНО: правильный cleanup
        return () => {
            cancelAnimationFrame(rafId);
        };
    }, [activeFactoryNumber, activeDeviceIndex, devices.length]);

    // Runtime-защита
    if (technicalRun === undefined) {
        console.error('PortableDevicesList: отсутствует technicalRun');
        return (
            <div className={styles.errorState}>
                Ошибка: отсутствуют данные испытания
            </div>
        );
    }

    if (devices.length === 0) {
        return (
            <div className={styles.emptyState}>
                Нет устройств
            </div>
        );
    }

    return (
        <ul className={styles.list}>
            {devices.map((device, index) => {
                const isActive = index === activeDeviceIndex;
                const isFirst = index === 0;

                return (
                    <div
                        key={device.id}
                        ref={isActive ? activeDeviceRef : null}
                        className={classNames(
                            styles.deviceWrapper,
                            isActive && styles.deviceWrapperActive
                        )}
                    >
                        <PortableDeviceItem
                            device={device}
                            technicalRun={technicalRun}
                            isFirst={isFirst}
                            isHighlighted={isActive}
                        />
                    </div>
                );
            })}
        </ul>
    );
}