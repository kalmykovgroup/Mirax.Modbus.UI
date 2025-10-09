// src/features/mirax/components/PortableDevicesList/PortableDeviceItem/PortableDeviceItem.tsx
import { useCallback, useRef, type JSX } from 'react';
import classNames from 'classnames';

import styles from './PortableDeviceItem.module.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { PortableDeviceDto } from '@chartsPage/charts/mirax/contracts/PortableDeviceDto';
import {
    selectDevice,
    toggleDeviceExpanded,
    selectIsDeviceExpanded,
    selectSelectedDeviceFactoryNumber,
    selectDatabaseId,
} from '@chartsPage/charts/mirax/miraxSlice';
import { fetchSensors } from '@chartsPage/charts/mirax/miraxThunks';
import { useGetSensorsQuery } from '@chartsPage/charts/mirax/miraxApi';
import {getDeviceDisplayName, shouldShowCopyId} from "@chartsPage/charts/mirax/MiraxContainer/utils/miraxHelpers.ts";
import {CopyButton} from "@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/CopyButton/CopyButton.tsx";
import {SensorsList} from "@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/SensorsList/SensorsList.tsx";

interface Props {
    readonly device: PortableDeviceDto;
    readonly technicalRunId: string;
}

export function PortableDeviceItem({ device, technicalRunId }: Props): JSX.Element {
    const dispatch = useAppDispatch();
    const databaseId = useAppSelector(selectDatabaseId);
    const factoryNumber = device.factoryNumber ?? '';
    const isExpanded = useAppSelector((state) => selectIsDeviceExpanded(state, factoryNumber));
    const isSelected = useAppSelector(selectSelectedDeviceFactoryNumber) === factoryNumber;
    const abortControllerRef = useRef<AbortController | undefined>(undefined);

    const showCopyButton = shouldShowCopyId(device);

    const { data: sensors = [], isLoading } = useGetSensorsQuery(
        {
            dbId: databaseId!,
            body: { technicalRunId, factoryNumber },
        },
        {
            skip: !isExpanded || databaseId === undefined || !factoryNumber,
        }
    );

    const handleSelect = useCallback(() => {
        if (factoryNumber) {
            dispatch(selectDevice(factoryNumber));
        }
    }, [dispatch, factoryNumber]);

    const handleToggle = useCallback(
        async (e: React.MouseEvent) => {
            e.stopPropagation();

            if (!factoryNumber) return;

            dispatch(toggleDeviceExpanded(factoryNumber));

            if (!isExpanded && databaseId !== undefined) {
                abortControllerRef.current?.abort();
                abortControllerRef.current = new AbortController();

                try {
                    await dispatch(
                        fetchSensors({
                            databaseId,
                            technicalRunId,
                            factoryNumber,
                            signal: abortControllerRef.current.signal,
                        })
                    ).unwrap();
                } catch (error) {
                    console.error('Ошибка загрузки сенсоров:', error);
                }
            }
        },
        [dispatch, factoryNumber, isExpanded, databaseId, technicalRunId]
    );

    return (
        <li className={classNames(styles.item, isSelected && styles.selected)}>
            <div className={styles.header} onClick={handleSelect}>
                <button
                    className={styles.expandButton}
                    onClick={handleToggle}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
                    disabled={!factoryNumber}
                >
                    <span className={classNames(styles.arrow, isExpanded && styles.expanded)}>▶</span>
                </button>

                <div className={styles.content}>
                    <div className={styles.nameContainer}>
                        <h4 className={styles.name}>{getDeviceDisplayName(device)}</h4>
                        {showCopyButton && (
                            <CopyButton text={device.id} label="Копировать ID устройства" />
                        )}
                    </div>
                    {device.factoryNumber && (
                        <span className={styles.factoryNumber}>№{device.factoryNumber}</span>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className={styles.children}>
                    {isLoading ? (
                        <div className={styles.loading}>Загрузка сенсоров...</div>
                    ) : sensors.length > 0 ? (
                        <SensorsList sensors={sensors} />
                    ) : (
                        <div className={styles.empty}>Нет сенсоров</div>
                    )}
                </div>
            )}
        </li>
    );
}