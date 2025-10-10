// src/features/chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/PortableDeviceItem/PortableDeviceItem.tsx
// ОТЛАДОЧНАЯ ВЕРСИЯ - после проверки удалить console.log
import { useCallback, useRef, useMemo, useEffect, type JSX } from 'react';
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
import type { Guid } from '@app/lib/types/Guid';
import { getDeviceDisplayName, shouldShowCopyId } from '@chartsPage/charts/mirax/MiraxContainer/utils/miraxHelpers';
import { CopyButton } from '@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/CopyButton/CopyButton';
import { SensorsList } from '@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/PortableDeviceItem/SensorsList/SensorsList';

interface Props {
    readonly device: PortableDeviceDto;
    readonly technicalRunId: Guid;
    readonly isFirst: boolean;
}

export function PortableDeviceItem({ device, technicalRunId, isFirst }: Props): JSX.Element {
    const dispatch = useAppDispatch();
    const databaseId = useAppSelector(selectDatabaseId);
    const factoryNumber = device.factoryNumber ?? '';
    const isExpanded = useAppSelector((state) => selectIsDeviceExpanded(state, factoryNumber));
    const isSelected = useAppSelector(selectSelectedDeviceFactoryNumber) === factoryNumber;
    const abortControllerRef = useRef<AbortController | undefined>(undefined);
    const firstLoadTriggeredRef = useRef(false);

    const showCopyButton = shouldShowCopyId(device);

    // Для первого устройства загружаем сенсоры всегда, для остальных — только при раскрытии
    const shouldLoadSensors = isFirst || isExpanded;

    const { data: sensors = [], isLoading } = useGetSensorsQuery(
        {
            dbId: databaseId!,
            body: { technicalRunId, factoryNumber },
        },
        {
            skip: !shouldLoadSensors || databaseId === undefined || !factoryNumber,
        }
    );

    // Явная загрузка сенсоров для первого устройства при монтировании
    useEffect(() => {
        // Проверяем все условия для загрузки
        const shouldTriggerLoad =
            isFirst &&
            !firstLoadTriggeredRef.current &&
            databaseId !== undefined &&
            factoryNumber !== '' &&
            sensors.length === 0 &&
            !isLoading;

        if (shouldTriggerLoad) {
            console.log('[PortableDeviceItem] Запускаем автозагрузку для первого устройства:', factoryNumber);
            firstLoadTriggeredRef.current = true;

            const controller = new AbortController();

            dispatch(
                fetchSensors({
                    databaseId,
                    technicalRunId,
                    factoryNumber,
                    signal: controller.signal,
                })
            )
                .then(() => {
                    console.log('[PortableDeviceItem] Автозагрузка успешна:', factoryNumber);
                })
                .catch((error) => {
                    if (error.name !== 'AbortError') {
                        console.error('[PortableDeviceItem] Ошибка автозагрузки:', error);
                    }
                });

            controller.abort();

        }
    }, [isFirst, databaseId, technicalRunId, factoryNumber, sensors.length, isLoading, dispatch]);

    // Собираем уникальные газы из сенсоров
    const uniqueGases = useMemo(() => {
        const gasSet = new Set<string>();
        for (const sensor of sensors) {
            if (sensor.gas) {
                gasSet.add(sensor.gas);
            }
        }
        return Array.from(gasSet).sort();
    }, [sensors]);

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

                    <div className={styles.metaRow}>
                        {device.factoryNumber && (
                            <span className={styles.factoryNumber}>№{device.factoryNumber}</span>
                        )}

                        {/* Показываем газы ВСЕГДА когда они загружены */}
                        {!isLoading && uniqueGases.length > 0 && (
                            <div className={styles.gasesContainer}>
                                {uniqueGases.map((gas) => (
                                    <span key={gas} className={styles.gasBadge}>
                                        {gas}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
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