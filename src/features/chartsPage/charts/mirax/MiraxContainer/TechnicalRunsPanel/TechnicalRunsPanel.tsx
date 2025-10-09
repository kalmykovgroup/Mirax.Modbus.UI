// src/features/mirax/components/TechnicalRunsPanel/TechnicalRunsPanel.tsx
import { useMemo, useState, useCallback, type JSX } from 'react';

import styles from './TechnicalRunsPanel.module.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    selectDatabaseId,
    selectIsTechnicalRunsLoading,
    selectTechnicalRunsError,
    selectTechnicalRunsLoading,
    openTechnicalRunTab,
} from '@chartsPage/charts/mirax/miraxSlice';
import { useGetTechnicalRunsQuery } from '@chartsPage/charts/mirax/miraxApi';
import { fetchTechnicalRuns } from '@chartsPage/charts/mirax/miraxThunks';
import { LoadingProgress } from '@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/LoadingProgress/LoadingProgress';
import { ErrorMessage } from '@chartsPage/charts/mirax/MiraxContainer/ErrorMessage/ErrorMessage';
import { SearchInput } from '@chartsPage/charts/mirax/MiraxContainer/TechnicalRunsList/SearchInput/SearchInput';
import type { TechnicalRunDto } from '@chartsPage/charts/mirax/contracts/TechnicalRunDto';
import {formatTechnicalRunDate} from "@chartsPage/charts/mirax/MiraxContainer/utils/miraxHelpers.ts";

export function TechnicalRunsPanel(): JSX.Element {
    const dispatch = useAppDispatch();
    const databaseId = useAppSelector(selectDatabaseId);
    const loadingState = useAppSelector(selectTechnicalRunsLoading);
    const isLoading = useAppSelector(selectIsTechnicalRunsLoading);
    const error = useAppSelector(selectTechnicalRunsError);

    const [searchQuery, setSearchQuery] = useState('');

    const { data: technicalRuns = [] } = useGetTechnicalRunsQuery(
        { dbId: databaseId!, body: undefined },
        { skip: databaseId === undefined }
    );

    const filteredRuns = useMemo(() => {
        if (!searchQuery.trim()) {
            return technicalRuns;
        }

        const query = searchQuery.toLowerCase().trim();

        return technicalRuns.filter((run) => {
            const nameMatch = run.name?.toLowerCase().includes(query);
            const startDate = new Date(run.dateStarTime).toLocaleDateString('ru-RU');
            const endDate = new Date(run.dateEndTime).toLocaleDateString('ru-RU');
            const dateMatch = startDate.includes(query) || endDate.includes(query);

            return nameMatch || dateMatch;
        });
    }, [technicalRuns, searchQuery]);

    const handleRetry = useCallback(() => {
        if (databaseId === undefined) return;
        dispatch(fetchTechnicalRuns({ databaseId }));
    }, [dispatch, databaseId]);

    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value);
    }, []);

    const handleSearchClear = useCallback(() => {
        setSearchQuery('');
    }, []);

    const handleRunClick = useCallback(
        (run: TechnicalRunDto) => {
            dispatch(
                openTechnicalRunTab({
                    id: run.id,
                    name: run.name,
                })
            );
        },
        [dispatch]
    );

    if (isLoading) {
        return (
            <div className={styles.container}>
                <LoadingProgress progress={loadingState.progress} message="Загрузка испытаний..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <ErrorMessage message={error} onRetry={handleRetry} />
            </div>
        );
    }

    const showNoResults = searchQuery.trim() && filteredRuns.length === 0;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Испытания</h2>
                <span className={styles.count}>
          {searchQuery.trim()
              ? `${filteredRuns.length} из ${technicalRuns.length}`
              : technicalRuns.length}
        </span>
            </div>

            <div className={styles.searchContainer}>
                <SearchInput
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onClear={handleSearchClear}
                    placeholder="Поиск..."
                />
            </div>

            <div className={styles.list}>
                {technicalRuns.length === 0 ? (
                    <div className={styles.placeholder}>Нет доступных испытаний</div>
                ) : showNoResults ? (
                    <div className={styles.placeholder}>Ничего не найдено по запросу "{searchQuery}"</div>
                ) : (
                    <ul className={styles.items}>
                        {filteredRuns.map((run) => (
                            <li key={run.id} className={styles.item} onClick={() => handleRunClick(run)}>
                                <div className={styles.itemContent}>
                                    <h3 className={styles.itemName}>{run.name ?? 'Без названия'}</h3>
                                    <div className={styles.itemDates}>
                    <span className={styles.itemDate}>
                      {formatTechnicalRunDate(run.dateStarTime)}
                    </span>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}