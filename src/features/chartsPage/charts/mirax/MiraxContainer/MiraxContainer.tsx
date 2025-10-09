// src/features/mirax/components/MiraxContainer.tsx
import { useEffect, type JSX } from 'react';

import styles from './MiraxContainer.module.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    setDatabaseId,
    selectDatabaseId,
    selectActiveTabId,
    selectHasSensorTabs,
} from '@chartsPage/charts/mirax/miraxSlice';
import { TechnicalRunsPanel } from './TechnicalRunsPanel/TechnicalRunsPanel';
import type { Guid } from '@app/lib/types/Guid';
import {DevicesPanel} from "@chartsPage/charts/mirax/MiraxContainer/TechnicalRunsList/DevicesPanel/DevicesPanel.tsx";
import {
    SensorTabsSection
} from "@chartsPage/charts/mirax/MiraxContainer/TechnicalRunsList/DevicesPanel/SensorTabsSection/SensorTabsSection.tsx";

interface Props {
    readonly dbId: Guid;
}

export function MiraxContainer({ dbId }: Props): JSX.Element {
    const dispatch = useAppDispatch();
    const currentDbId = useAppSelector(selectDatabaseId);
    const activeTabId = useAppSelector(selectActiveTabId);
    const hasSensorTabs = useAppSelector((state) =>
        activeTabId ? selectHasSensorTabs(state, activeTabId) : false
    );

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
            {/* Верхняя секция: испытания + устройства */}
            <div className={styles.topSection}>
                <TechnicalRunsPanel />
                {activeTabId ? (
                    <DevicesPanel technicalRunId={activeTabId} />
                ) : (
                    <div className={styles.noSelectionPanel}>
                        <div className={styles.placeholder}>Выберите испытание из списка слева</div>
                    </div>
                )}
            </div>

            {/* Нижняя секция: вкладки сенсоров и графики */}
            {hasSensorTabs && activeTabId && <SensorTabsSection technicalRunId={activeTabId} />}
        </div>
    );
}