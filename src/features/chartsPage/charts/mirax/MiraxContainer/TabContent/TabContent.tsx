// src/features/mirax/components/TabContent/TabContent.tsx
import { useState, useMemo, useCallback, type JSX } from 'react';

import styles from './TabContent.module.css';
import { useAppSelector } from '@/store/hooks';
import {
    selectDatabaseId,
    selectActiveSensorTab,
    selectHasSensorTabs,
} from '@chartsPage/charts/mirax/miraxSlice';
import { useGetPortableDevicesQuery } from '@chartsPage/charts/mirax/miraxApi';
import { SearchInput } from '@chartsPage/charts/mirax/MiraxContainer/TechnicalRunsList/SearchInput/SearchInput';
import { PortableDevicesList } from '@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/PortableDevicesList';
import type { Guid } from '@app/lib/types/Guid';
import {sortDevicesByFactoryNumber} from "@chartsPage/charts/mirax/MiraxContainer/utils/miraxHelpers.ts";
import {
    SensorTabBar
} from "@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/SensorsList/SensorTabBar/SensorTabBar.tsx";
import {
    SensorTabContent
} from "@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/SensorsList/SensorTabBar/SensorTabContent/SensorTabContent.tsx";

interface Props {
    readonly technicalRunId: Guid;
}

export function TabContent({ technicalRunId }: Props): JSX.Element {
    const databaseId = useAppSelector(selectDatabaseId);
    const activeSensorTab = useAppSelector((state) => selectActiveSensorTab(state, technicalRunId));
    const hasSensorTabs = useAppSelector((state) => selectHasSensorTabs(state, technicalRunId));

    const [deviceSearchQuery, setDeviceSearchQuery] = useState('');

    const { data: devices = [], isLoading } = useGetPortableDevicesQuery(
        {
            dbId: databaseId!,
            body: { technicalRunId },
        },
        {
            skip: databaseId === undefined,
        }
    );

    const filteredDevices = useMemo(() => {
        let result = devices;

        if (deviceSearchQuery.trim()) {
            const query = deviceSearchQuery.toLowerCase().trim();

            result = devices.filter((device) => {
                const nameMatch = device.name?.toLowerCase().includes(query);
                const factoryNumberMatch = device.factoryNumber?.toLowerCase().includes(query);

                return nameMatch || factoryNumberMatch;
            });
        }

        return sortDevicesByFactoryNumber(result);
    }, [devices, deviceSearchQuery]);

    const handleDeviceSearchChange = useCallback((value: string) => {
        setDeviceSearchQuery(value);
    }, []);

    const handleDeviceSearchClear = useCallback(() => {
        setDeviceSearchQuery('');
    }, []);

    const showNoResults = deviceSearchQuery.trim() && filteredDevices.length === 0;

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Загрузка устройств...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Верхняя часть: список устройств */}
            <div className={styles.devicesSection}>
                {devices.length > 0 && (
                    <div className={styles.searchContainer}>
                        <SearchInput
                            value={deviceSearchQuery}
                            onChange={handleDeviceSearchChange}
                            onClear={handleDeviceSearchClear}
                            placeholder="Поиск устройства..."
                        />
                        <span className={styles.deviceCount}>
              {deviceSearchQuery.trim()
                  ? `${filteredDevices.length} из ${devices.length}`
                  : `${devices.length}`}
            </span>
                    </div>
                )}

                <div className={styles.devicesContent}>
                    {devices.length === 0 ? (
                        <div className={styles.placeholder}>Нет устройств</div>
                    ) : showNoResults ? (
                        <div className={styles.placeholder}>
                            Ничего не найдено по запросу "{deviceSearchQuery}"
                        </div>
                    ) : (
                        <PortableDevicesList devices={filteredDevices} technicalRunId={technicalRunId} />
                    )}
                </div>
            </div>

            {/* Нижняя часть: вкладки и графики сенсоров */}
            {hasSensorTabs && (
                <div className={styles.sensorSection}>
                    <SensorTabBar technicalRunId={technicalRunId} />
                    <div className={styles.sensorContent}>
                        {activeSensorTab ? (
                            <SensorTabContent sensorTab={activeSensorTab} />
                        ) : (
                            <div className={styles.placeholder}>Нет активной вкладки сенсора</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}