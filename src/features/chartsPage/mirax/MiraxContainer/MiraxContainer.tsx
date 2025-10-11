// src/features/mirax/components/MiraxContainer.tsx
import { useEffect, type JSX } from 'react';

import styles from './MiraxContainer.module.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    setDatabaseId,
    selectDatabaseId,
    selectActiveTabId,
} from '@chartsPage/mirax/miraxSlice';
import { TechnicalRunsPanel } from './TechnicalRunsPanel/TechnicalRunsPanel';
import { TabBar_PortableDevices } from './TabBar_PortableDevices/TabBar_PortableDevices.tsx';
import type { Guid } from '@app/lib/types/Guid';
import {DevicesPanel} from "@chartsPage/mirax/MiraxContainer/DevicesPanel/DevicesPanel.tsx";


interface Props {
    readonly dbId: Guid;
}

export function MiraxContainer({ dbId }: Props): JSX.Element {
    const dispatch = useAppDispatch();
    const currentDbId = useAppSelector(selectDatabaseId);
    const activeTabId = useAppSelector(selectActiveTabId);

    useEffect(() => {
        if (currentDbId !== dbId) {
            dispatch(setDatabaseId(dbId));
        }
    }, [dispatch, dbId, currentDbId]);

    if (currentDbId === undefined) {
        return (
            <div className={styles.emptyContainer}>
                <div className={styles.placeholder}>База данных не выбрана</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Верхняя секция: испытания + вкладки + устройства */}
            <div className={styles.topSection}>
                <TechnicalRunsPanel />

                {/* ДОБАВИТЬ ЭТУ СЕКЦИЮ */}
                <div className={styles.rightSection}>
                    {/* Вкладки испытаний */}
                    <TabBar_PortableDevices />

                    {/* Устройства активной вкладки */}
                    <div className={styles.devicesContainer}>
                        {activeTabId ? (
                            <DevicesPanel technicalRunId={activeTabId} />
                        ) : (
                            <div className={styles.noSelectionPanel}>
                                <div className={styles.placeholder}>Нет активной вкладки</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}