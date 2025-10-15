// src/features/mirax/components/MiraxContainer.tsx
import {type ChangeEvent, type JSX, useEffect} from 'react';

import styles from './MiraxContainer.module.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    selectCurrentDatabase,
    selectActiveContextId, setCurrentDatabase,
} from '@chartsPage/mirax/miraxSlice';
import { TechnicalRunsPanel } from './TechnicalRunsPanel/TechnicalRunsPanel';
import { TabBar_PortableDevices } from './TabBar_PortableDevices/TabBar_PortableDevices.tsx';
import {DevicesPanel} from "@chartsPage/mirax/MiraxContainer/DevicesPanel/DevicesPanel.tsx";
import {
    fetchDatabases,
    selectChartsMetaLoading, selectDatabases,
    selectDatabasesLoaded, selectGetDatabasesById
} from "@chartsPage/metaData/store/chartsMetaSlice.ts";
import {useSelector} from "react-redux";
import type {Guid} from "@app/lib/types/Guid.ts";
import type {DatabaseDto} from "@chartsPage/metaData/shared/dtos/DatabaseDto.ts";


export function MiraxContainer(): JSX.Element {
    const dispatch = useAppDispatch();
    const activeContextId = useAppSelector(selectActiveContextId);

    const currentDatabase: DatabaseDto | undefined = useAppSelector(selectCurrentDatabase);

    const databasesLoaded = useSelector(selectDatabasesLoaded);
    const databasesLoading = useSelector(selectChartsMetaLoading).databases;
    const getDatabasesById = useSelector(selectGetDatabasesById)
    const databases = useSelector(selectDatabases)

    // Загружаем список баз данных при монтировании
    useEffect(() => {
        if (!databasesLoading && !databasesLoaded) {
            dispatch(fetchDatabases());
        }
    }, [dispatch, databasesLoaded, databasesLoading]);

    useEffect(() => {
        if (!databasesLoading && databasesLoaded && databases?.length > 0 && currentDatabase == undefined) {
            const d = databases.find(d => d.name == 'default')
            if(d)  dispatch(setCurrentDatabase(d));
        }
    }, [dispatch, databasesLoading, databasesLoaded, databases]);

    // Обработчик изменения выбранной базы данных
    const handleDatabaseChange = (event: ChangeEvent<HTMLSelectElement>): void => {

        // Обработчик изменения выбранной базы данных
        const selectedId : Guid = event.target.value as Guid;
        const selectedDb = getDatabasesById[selectedId];

        if (selectedDb !== undefined) {
            dispatch(setCurrentDatabase(selectedDb));
        }
    };

    // Если базы данных еще не загружены
    if (!databasesLoaded) {
        return (
            <div className={styles.emptyContainer}>
                <div className={styles.placeholder}>Загрузка баз данных...</div>
            </div>
        );
    }

    // Если нет доступных баз данных
    if (databases.length === 0) {
        return (
            <div className={styles.emptyContainer}>
                <div className={styles.placeholder}>Нет доступных баз данных</div>
            </div>
        );
    }


    return (
        <div className={styles.container}>
            {/* Панель выбора базы данных */}
            <div className={styles.databaseSelector}>
                <label htmlFor="database-select" className={styles.label}>
                    {currentDatabase == undefined ? ( <span className={styles.title}>База данных не выбрана"</span> ) : (
                        <>
                        <div className={styles.databaseInfoBlock}>

                           {/* <ConnectionStringDisplay
                                connectionString={currentDatabase.connectionString}
                                showDbTypeIcon={true}
                            />*/}

                        </div>
                        </>
                )}
                </label>
                <select
                    id="database-select"
                    className={styles.select}
                    value={currentDatabase?.id ?? ''}
                    onChange={handleDatabaseChange}
                >
                    <option value="" disabled>
                        Выберите базу данных
                    </option>
                    {databases.map((db) => (
                        <option key={db.id} value={db.id}>
                            {db.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Если база данных не выбрана */}
            {currentDatabase === undefined ? (
                <div className={styles.emptyContainer}>
                    <div className={styles.placeholder}>База данных не выбрана</div>
                </div>
            ) : (
                <div className={styles.topSection}>
                    {/* Панель технических испытаний */}
                    <TechnicalRunsPanel />

                    {/* Правая секция: вкладки + устройства */}
                    <div className={styles.rightSection}>
                        {/* Вкладки испытаний */}
                        <TabBar_PortableDevices />

                        {/* Устройства активной вкладки */}
                        <div className={styles.devicesContainer}>
                            {activeContextId !== undefined ? (
                                <DevicesPanel technicalRunId={activeContextId} />
                            ) : (
                                <div className={styles.noSelectionPanel}>
                                    <div className={styles.placeholder}>
                                        Нет активной вкладки
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}