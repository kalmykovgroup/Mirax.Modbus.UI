// src/features/mirax/components/SensorsList/SensorItem/SensorItem.tsx
import { useCallback, useMemo, type JSX } from 'react';

import styles from './SensorItem.module.css';
import type { SensorDto } from '@chartsPage/charts/mirax/contracts/SensorDto.ts';
import { useAppDispatch, useAppSelector } from '@/store/hooks.ts';
import { openSensorTab, selectDatabaseId } from '@chartsPage/charts/mirax/miraxSlice.ts';
import { useGetTechnicalRunsQuery, useGetPortableDevicesQuery } from '@chartsPage/charts/mirax/miraxApi.ts';
import type { Guid } from '@app/lib/types/Guid.ts';

interface Props {
    readonly sensor: SensorDto;
    readonly technicalRunId: Guid;
    readonly factoryNumber: string;
}

export function SensorItem({ sensor, technicalRunId, factoryNumber }: Props): JSX.Element {
    const dispatch = useAppDispatch();
    const databaseId = useAppSelector(selectDatabaseId);

    // Получаем все испытания
    const { data: technicalRuns = [] } = useGetTechnicalRunsQuery(
        { dbId: databaseId!, body: undefined },
        { skip: databaseId === undefined }
    );

    // Получаем все устройства для испытания
    const { data: devices = [] } = useGetPortableDevicesQuery(
        {
            dbId: databaseId!,
            body: { technicalRunId },
        },
        {
            skip: databaseId === undefined,
        }
    );

    // Находим нужное испытание
    const technicalRun = useMemo(() => {
        return technicalRuns.find((run) => run.id === technicalRunId);
    }, [technicalRuns, technicalRunId]);

    // Находим нужное устройство
    const device = useMemo(() => {
        return devices.find((d) => d.factoryNumber === factoryNumber);
    }, [devices, factoryNumber]);

    const handleClick = useCallback(() => {
        if (!technicalRun || !device) {
            console.error('TechnicalRun или Device не найдены');
            return;
        }

        // Передаём полные объекты
        dispatch(
            openSensorTab({
                technicalRun,
                device,
                sensor,
            })
        );
    }, [dispatch, technicalRun, device, sensor]);

    return (
        <li className={styles.item} onClick={handleClick}>
            <div className={styles.content}>
                <span className={styles.gas}>{sensor.gas}</span>
                <span className={styles.channel}>Канал {sensor.channelNumber}</span>
                {sensor.modification && (
                    <span className={styles.modification}>{sensor.modification}</span>
                )}
            </div>
        </li>
    );
}