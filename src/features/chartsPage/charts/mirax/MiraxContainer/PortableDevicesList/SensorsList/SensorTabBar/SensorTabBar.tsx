// src/features/mirax/components/SensorTabBar/SensorTabBar.tsx
import { useCallback, type JSX } from 'react';

import styles from './SensorTabBar.module.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    selectOpenSensorTabs,
    selectActiveSensorTabKey,
    setActiveSensorTab,
    closeSensorTab,
    closeAllSensorTabs,
    getSensorTabKey,
} from '@chartsPage/charts/mirax/miraxSlice';
import { SensorTabItem } from './SensorTabItem/SensorTabItem';
import type { Guid } from '@app/lib/types/Guid';

interface Props {
    readonly technicalRunId: Guid;
}

export function SensorTabBar({ technicalRunId }: Props): JSX.Element {
    const dispatch = useAppDispatch();
    const openTabs = useAppSelector((state) => selectOpenSensorTabs(state, technicalRunId));
    const activeTabKey = useAppSelector((state) => selectActiveSensorTabKey(state, technicalRunId));

    const handleCloseAll = useCallback(() => {
        dispatch(closeAllSensorTabs(technicalRunId));
    }, [dispatch, technicalRunId]);

    if (openTabs.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.placeholder}>Выберите сенсор из списка выше</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.tabs}>
                {openTabs.map((tab) => {
                    const tabKey = getSensorTabKey(tab);

                    return (
                        <SensorTabItem
                            key={tabKey}
                            sensorTab={tab}
                            isActive={tabKey === activeTabKey}
                            onActivate={() =>
                                dispatch(setActiveSensorTab({ technicalRunId, tabKey }))
                            }
                            onClose={() =>
                                dispatch(closeSensorTab({ technicalRunId, tabKey }))
                            }
                        />
                    );
                })}
            </div>

            {openTabs.length > 1 && (
                <button className={styles.closeAllButton} onClick={handleCloseAll} title="Закрыть все">
                    Закрыть все
                </button>
            )}
        </div>
    );
}