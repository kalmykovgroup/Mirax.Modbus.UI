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
} from '@chartsPage/charts/mirax/miraxSlice';
import { fetchSensors } from '@chartsPage/charts/mirax/miraxThunks';
import { useGetSensorsQuery, useGetTechnicalRunsQuery } from '@chartsPage/charts/mirax/miraxApi';
import type { Guid } from '@app/lib/types/Guid';
import { getDeviceDisplayName, shouldShowCopyId } from '@chartsPage/charts/mirax/MiraxContainer/utils/miraxHelpers';
import { CopyButton } from '@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/CopyButton/CopyButton';
import { SensorsList } from '@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/PortableDeviceItem/SensorsList/SensorsList';

interface Props {
    readonly device: PortableDeviceDto;
    readonly technicalRunId: Guid;
    readonly isFirst: boolean;
}

/**
 * Метод для вывода данных испытания, устройства и сенсоров в консоль
 */
async function logDeviceData(
    technicalRun: TechnicalRunDto | undefined,
    device: PortableDeviceDto,
    sensors: readonly SensorDto[]
): Promise<void> {
    console.log('TechnicalRunDto:', technicalRun);
    console.log('PortableDeviceDto:', device);
    console.log('SensorDto[]:', sensors);
}

export function PortableDeviceItem({ device, technicalRunId, isFirst }: Props): JSX.Element {
    const dispatch = useAppDispatch();
    const databaseId = useAppSelector(selectDatabaseId);
    const factoryNumber = device.factoryNumber ?? '';
    const isExpanded = useAppSelector((state) => selectIsDeviceExpanded(state, factoryNumber));
    const isSelected = useAppSelector(selectSelectedDeviceFactoryNumber) === factoryNumber;
    const abortControllerRef = useRef<AbortController | undefined>(undefined);
    const firstLoadTriggeredRef = useRef(false);
    const sensorsLoadedRef = useRef(false);

    const showCopyButton = shouldShowCopyId(device);

    // Получаем данные испытания из кеша
    const { data: technicalRuns = [] } = useGetTechnicalRunsQuery(
        { dbId: databaseId!, body: undefined },
        { skip: databaseId === undefined }
    );

    const currentTechnicalRun = useMemo((): TechnicalRunDto | undefined => {
        return technicalRuns.find((run) => run.id === technicalRunId);
    }, [technicalRuns, technicalRunId]);

    // Читаем сенсоры из RTK Query кеша
    // skip: false если (первое ИЛИ раскрыто ИЛИ уже загружали)
    const { data: sensors = [], isLoading } = useGetSensorsQuery(
        {
            dbId: databaseId!,
            body: { technicalRunId, factoryNumber },
        },
        {
            skip: databaseId === undefined || !factoryNumber || (!isFirst && !isExpanded && !sensorsLoadedRef.current),
        }
    );

    // Автозагрузка сенсоров ТОЛЬКО для первого устройства через thunk
    useEffect(() => {
        // ВАЖНО: проверяем isFirst в зависимостях, чтобы не срабатывало для остальных
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

            dispatch(
                fetchSensors({
                    databaseId,
                    technicalRunId,
                    factoryNumber,
                    signal: controller.signal,
                })
            ).then(() => {
                sensorsLoadedRef.current = true;
            });
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

            // Загружаем сенсоры только если раскрываем И их ещё нет
            if (!isExpanded && sensors.length === 0 && databaseId !== undefined) {
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

                    sensorsLoadedRef.current = true;
                } catch (error) {
                    if (error && typeof error === 'object' && 'name' in error && error.name !== 'AbortError') {
                        console.error('Ошибка загрузки сенсоров:', error);
                    }
                }
            }
        },
        [dispatch, factoryNumber, isExpanded, sensors.length, databaseId, technicalRunId]
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
                            technicalRunId,
                            factoryNumber,
                            signal: new AbortController().signal,
                        })
                    ).unwrap();

                    actualSensors = result.data;
                    sensorsLoadedRef.current = true; // Устанавливаем флаг, чтобы useGetSensorsQuery подхватил данные
                } catch (error) {
                    console.error('Ошибка загрузки сенсоров:', error);
                }
            }

            await logDeviceData(currentTechnicalRun, device, actualSensors);
        },
        [currentTechnicalRun, device, sensors, databaseId, factoryNumber, technicalRunId, dispatch]
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

                        {!isLoading && uniqueGases.length > 0 && (
                            <div className={styles.gasesContainer}>
                                {uniqueGases.map((gas) => (
                                    <span key={gas} className={styles.gasBadge}>
                                        {gas}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Кнопка построения графика */}
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