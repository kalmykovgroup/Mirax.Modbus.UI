// src/features/chartsPage/charts/mirax/MiraxContainer/TechnicalRunsPanel/TechnicalRunsPanel.tsx
import { useMemo, useState, useCallback, type JSX } from 'react';
import classNames from 'classnames';

import styles from './TechnicalRunsPanel.module.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    selectDatabaseId,
    selectIsTechnicalRunsLoading,
    selectTechnicalRunsError,
    selectTechnicalRunsLoading,
    openTechnicalRunTab,
    selectActiveTabId,
} from '@chartsPage/charts/mirax/miraxSlice';
import { useGetTechnicalRunsQuery } from '@chartsPage/charts/mirax/miraxApi';
import { fetchTechnicalRuns } from '@chartsPage/charts/mirax/miraxThunks';
import { ErrorMessage } from '@chartsPage/charts/mirax/MiraxContainer/ErrorMessage/ErrorMessage';
import { SortDropdown } from '@chartsPage/charts/mirax/MiraxContainer/TechnicalRunsPanel/SortDropdown/SortDropdown';
import type { TechnicalRunDto } from '@chartsPage/charts/mirax/contracts/TechnicalRunDto';
import {
    formatTechnicalRunDate,
    sortTechnicalRuns,
    TechnicalRunSortType,
    type TechnicalRunSortType as TechnicalRunSortTypeValue,
} from '@chartsPage/charts/mirax/MiraxContainer/utils/miraxHelpers';
import {SearchInput} from "@chartsPage/charts/mirax/MiraxContainer/SearchInput/SearchInput.tsx";
import {LoadingProgress} from "@chartsPage/charts/mirax/MiraxContainer/LoadingProgress/LoadingProgress.tsx";

export function TechnicalRunsPanel(): JSX.Element {
    const dispatch = useAppDispatch();
    const databaseId = useAppSelector(selectDatabaseId);
    const loadingState = useAppSelector(selectTechnicalRunsLoading);
    const isLoading = useAppSelector(selectIsTechnicalRunsLoading);
    const error = useAppSelector(selectTechnicalRunsError);
    const activeTabId = useAppSelector(selectActiveTabId);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortType, setSortType] = useState<TechnicalRunSortTypeValue>(
        TechnicalRunSortType.DATE_END_DESC // ← Изменено на DATE_END_DESC
    );

    const { data: technicalRuns = [] } = useGetTechnicalRunsQuery(
        { dbId: databaseId!, body: undefined },
        { skip: databaseId === undefined }
    );

    const filteredAndSortedRuns = useMemo(() => {
        let result = technicalRuns;

        // Фильтрация по поисковому запросу
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();

            result = technicalRuns.filter((run) => {
                const nameMatch = run.name?.toLowerCase().includes(query);
                const startDate = new Date(run.dateStarTime).toLocaleDateString('ru-RU');
                const endDate = new Date(run.dateEndTime).toLocaleDateString('ru-RU');
                const dateMatch = startDate.includes(query) || endDate.includes(query);

                return nameMatch || dateMatch;
            });
        }

        // Сортировка
        return sortTechnicalRuns(result, sortType);
    }, [technicalRuns, searchQuery, sortType]);

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

    const handleSortChange = useCallback((newSortType: TechnicalRunSortTypeValue) => {
        setSortType(newSortType);
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

    const showNoResults = searchQuery.trim() && filteredAndSortedRuns.length === 0;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Испытания</h2>
                <span className={styles.count}>
                    {searchQuery.trim()
                        ? `${filteredAndSortedRuns.length} из ${technicalRuns.length}`
                        : technicalRuns.length}
                </span>
            </div>

            <div className={styles.controls}>
                <SearchInput
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onClear={handleSearchClear}
                    placeholder="Поиск по имени или дате..."
                />
                <SortDropdown value={sortType} onChange={handleSortChange} />
            </div>

            <div className={styles.list}>
                {technicalRuns.length === 0 ? (
                    <div className={styles.placeholder}>Нет доступных испытаний</div>
                ) : showNoResults ? (
                    <div className={styles.placeholder}>
                        Ничего не найдено по запросу "{searchQuery}"
                    </div>
                ) : (
                    <ul className={styles.items}>
                        {filteredAndSortedRuns.map((run) => (
                            <li
                                key={run.id}
                                className={classNames(
                                    styles.item,
                                    activeTabId === run.id && styles.itemActive
                                )}
                                onClick={() => handleRunClick(run)}
                            >
                                <div className={styles.itemContent}>
                                    <h3 className={styles.itemName}>
                                        {run.name ?? 'Без названия'}
                                    </h3>
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