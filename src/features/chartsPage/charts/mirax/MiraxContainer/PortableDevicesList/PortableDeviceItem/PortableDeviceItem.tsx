// src/features/chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/PortableDeviceItem/PortableDeviceItem.tsx
import React, { useCallback, useRef, useMemo, useEffect, type JSX } from 'react';
import classNames from 'classnames';

import styles from './PortableDeviceItem.module.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { PortableDeviceDto } from '@chartsPage/charts/mirax/contracts/PortableDeviceDto';
import type { TechnicalRunDto } from '@chartsPage/charts/mirax/contracts/TechnicalRunDto';
import type { SensorDto } from '@chartsPage/charts/mirax/contracts/SensorDto';
import {
    selectDevice,
    toggleDeviceExpanded,
    selectIsDeviceExpanded,
    selectSelectedDeviceFactoryNumber,
    selectDatabaseId,
    selectSensorsData,
    selectSensorsLoading,
} from '@chartsPage/charts/mirax/miraxSlice';
import { fetchSensors } from '@chartsPage/charts/mirax/miraxThunks';
import {
    getDeviceDisplayName,
    shouldShowCopyId,
} from '@chartsPage/charts/mirax/MiraxContainer/utils/miraxHelpers';
import { CopyButton } from '@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/CopyButton/CopyButton';
import { SensorsList } from '@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/PortableDeviceItem/SensorsList/SensorsList';
import type { LoadSensorsRequest } from '@chartsPage/charts/mirax/miraxThunk.types';

interface Props {
    readonly device: PortableDeviceDto;
    readonly technicalRun: TechnicalRunDto;
    readonly isFirst: boolean;
}

/**
 * Метод для вывода данных испытания, устройства и сенсоров в консоль
 */
async function logDeviceData(
    technicalRun: TechnicalRunDto,
    device: PortableDeviceDto,
    sensors: readonly SensorDto[]
): Promise<void> {
    console.log('TechnicalRunDto:', technicalRun);
    console.log('PortableDeviceDto:', device);
    console.log('SensorDto[]:', sensors);
}

export function PortableDeviceItem({ device, technicalRun, isFirst }: Props): JSX.Element {
    // ✅ Runtime-защита: проверяем обязательные данные
    if (!technicalRun || !device) {
        console.error('PortableDeviceItem: отсутствуют обязательные данные', {
            technicalRun,
            device,
        });
        return (
            <li className={styles.item}>
                <div className={styles.error}>Ошибка: отсутствуют данные устройства или испытания</div>
            </li>
        );
    }

    const dispatch = useAppDispatch();
    const databaseId = useAppSelector(selectDatabaseId);
    const factoryNumber = device.factoryNumber ?? '';
    const isExpanded = useAppSelector((state) => selectIsDeviceExpanded(state, factoryNumber));
    const isSelected = useAppSelector(selectSelectedDeviceFactoryNumber) === factoryNumber;
    const abortControllerRef = useRef<AbortController | undefined>(undefined);
    const firstLoadTriggeredRef = useRef(false);

    const showCopyButton = shouldShowCopyId(device);

    // ✅ Получаем данные сенсоров из slice
    const sensors = useAppSelector((state) =>
        selectSensorsData(state, technicalRun.id, factoryNumber)
    );

    // ✅ Получаем статус загрузки сенсоров
    const sensorsLoadingState = useAppSelector((state) =>
        selectSensorsLoading(state, technicalRun.id, factoryNumber)
    );
    const isLoading = sensorsLoadingState.isLoading;

    // Автозагрузка сенсоров ТОЛЬКО для первого устройства через thunk
    useEffect(() => {
        if (!isFirst) return;

        const shouldTriggerLoad =
            !firstLoadTriggeredRef.current &&
            databaseId !== undefined &&
            factoryNumber !== '' &&
            sensors.length === 0 &&
            !isLoading;

        if (shouldTriggerLoad) {
            firstLoadTriggeredRef.current = true;

            const controller = new AbortController();
            abortControllerRef.current = controller;

            void dispatch(
                fetchSensors({
                    databaseId,
                    technicalRunId: technicalRun.id,
                    factoryNumber,
                    signal: controller.signal,
                } satisfies LoadSensorsRequest)
            );
        }
    }, [isFirst, databaseId, technicalRun.id, factoryNumber, sensors.length, isLoading, dispatch]);

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

            // Загружаем сенсоры только если раскрываем И их ещё нет
            if (!isExpanded && sensors.length === 0 && databaseId !== undefined) {
                abortControllerRef.current?.abort();
                abortControllerRef.current = new AbortController();

                try {
                    await dispatch(
                        fetchSensors({
                            databaseId,
                            technicalRunId: technicalRun.id,
                            factoryNumber,
                            signal: abortControllerRef.current.signal,
                        } satisfies LoadSensorsRequest)
                    ).unwrap();
                } catch (error) {
                    if (
                        error !== null &&
                        typeof error === 'object' &&
                        'name' in error &&
                        error.name !== 'AbortError'
                    ) {
                        console.error('Ошибка загрузки сенсоров:', error);
                    }
                }
            }
        },
        [dispatch, factoryNumber, isExpanded, sensors.length, databaseId, technicalRun.id]
    );

    /**
     * Обработчик кнопки для вывода данных в консоль и построения графика
     */
    const handleBuildChart = useCallback(
        async (e: React.MouseEvent) => {
            e.stopPropagation();

            let actualSensors = sensors;

            // Догружаем сенсоры только если их нет в кеше
            if (sensors.length === 0 && databaseId !== undefined && factoryNumber) {
                try {
                    const result = await dispatch(
                        fetchSensors({
                            databaseId,
                            technicalRunId: technicalRun.id,
                            factoryNumber,
                            signal: new AbortController().signal,
                        } satisfies LoadSensorsRequest)
                    ).unwrap();

                    actualSensors = result.data;
                } catch (error) {
                    console.error('Ошибка загрузки сенсоров:', error);
                    return;
                }
            }

            await logDeviceData(technicalRun, device, actualSensors);
        },
        [technicalRun, device, sensors, databaseId, factoryNumber, dispatch]
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
                    type="button"
                >
                    <span className={classNames(styles.arrow, isExpanded && styles.expanded)}>▶</span>
                </button>

                <div className={styles.content}>
                    <div className={styles.nameContainer}>
                        <h4 className={styles.name}>{getDeviceDisplayName(device)}</h4>
                        {showCopyButton && <CopyButton text={device.id} label="Копировать ID устройства" />}
                    </div>

                    <div className={styles.metaRow}>
                        {device.factoryNumber && (
                            <span className={styles.factoryNumber}>№{device.factoryNumber}</span>
                        )}

                        {!isLoading && uniqueGases.length > 0 && (
                            <div className={styles.gasesContainer}>
                                {uniqueGases.map((gas) => (
                                    <span key={gas} className={styles.gasBadge}>
                                        {gas}
                                    </span>
                                ))}
                            </div>
                        )}

                        <button
                            className={styles.chartButton}
                            onClick={handleBuildChart}
                            title="Построить график"
                            type="button"
                        >
                            📈 График
                        </button>
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