// src/features/mirax/components/MiraxContainer.tsx
import { useEffect, type JSX } from 'react';

import styles from './MiraxContainer.module.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDatabaseId, selectDatabaseId, selectActiveTabId } from '@chartsPage/charts/mirax/miraxSlice';
import type { Guid } from '@app/lib/types/Guid';
import {TechnicalRunsPanel} from "@chartsPage/charts/mirax/MiraxContainer/TechnicalRunsPanel/TechnicalRunsPanel.tsx";
import {TabContent} from "@chartsPage/charts/mirax/MiraxContainer/TabContent/TabContent.tsx";
import {TabBar} from "@chartsPage/charts/mirax/MiraxContainer/TabBar/TabBar.tsx";

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
            <div className={styles.container}>
                <div className={styles.placeholder}>База данных не выбрана</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.leftPanel}>
                <TechnicalRunsPanel />
            </div>

            <div className={styles.rightPanel}>
                <TabBar />
                <div className={styles.tabContentWrapper}>
                    {activeTabId ? (
                        <TabContent technicalRunId={activeTabId} />
                    ) : (
                        <div className={styles.placeholder}>Нет активной вкладки</div>
                    )}
                </div>
            </div>
        </div>
    );
}