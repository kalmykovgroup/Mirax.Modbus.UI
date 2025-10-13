// src/features/chartsPage/charts/mirax/MiraxContainer/TechnicalRunsPanel/TechnicalRunsPanel.tsx
import { useMemo, useState, useCallback, type JSX, useEffect } from 'react';
import classNames from 'classnames';

import styles from './TechnicalRunsPanel.module.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    selectCurrentDatabase,
    selectIsTechnicalRunsLoading,
    selectTechnicalRunsError,
    selectTechnicalRunsLoading,
    openTechnicalRunTab,
    selectActiveContextId,
    selectTechnicalRunsData,
} from '@chartsPage/mirax/miraxSlice';
import { fetchTechnicalRuns } from '@chartsPage/mirax/miraxThunks';
import { ErrorMessage } from '@chartsPage/mirax/MiraxContainer/ErrorMessage/ErrorMessage';
import { SortDropdown } from '@chartsPage/mirax/MiraxContainer/TechnicalRunsPanel/SortDropdown/SortDropdown';
import type { TechnicalRunDto } from '@chartsPage/mirax/contracts/TechnicalRunDto';
import {
    formatTechnicalRunDate,
    sortTechnicalRuns,
    TechnicalRunSortType,
    type TechnicalRunSortType as TechnicalRunSortTypeValue,
} from '@chartsPage/mirax/MiraxContainer/utils/miraxHelpers';
import { SearchInput } from '@chartsPage/mirax/MiraxContainer/SearchInput/SearchInput';
import { LoadingProgress } from '@chartsPage/mirax/MiraxContainer/LoadingProgress/LoadingProgress';
import {CopyButton} from "@chartsPage/components/CopyButton/CopyButton.tsx";
import type {DatabaseDto} from "@chartsPage/metaData/shared/dtos/DatabaseDto.ts";

export function TechnicalRunsPanel(): JSX.Element {
    const dispatch = useAppDispatch();
    const database: DatabaseDto | undefined = useAppSelector(selectCurrentDatabase);
    const loadingState = useAppSelector(selectTechnicalRunsLoading);
    const isLoading = useAppSelector(selectIsTechnicalRunsLoading);
    const error = useAppSelector(selectTechnicalRunsError);
    const activeContextId = useAppSelector(selectActiveContextId);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortType, setSortType] = useState<TechnicalRunSortTypeValue>(
        TechnicalRunSortType.DATE_END_DESC
    );

    const technicalRuns = useAppSelector(selectTechnicalRunsData);

    //  Автозагрузка при монтировании
    useEffect(() => {
        if (database === undefined) {
            console.error('Database id is undefined');
            return;
        }

        //  Ключевая проверка: если уже загружается или есть данные - не стартуем
        if (isLoading) {
            console.warn('Данные уже загружаются');
            return;
        }

        if (technicalRuns.length > 0) {
            return;
        }

        if (error !== undefined) {
            return;
        }

        void dispatch(
            fetchTechnicalRuns({
                databaseId : database.id,
                onProgress: (progress) => {
                    console.log(`[TechnicalRuns] Progress: ${progress}%`);
                },
            })
        );
    }, [database, dispatch, isLoading, technicalRuns.length, error]);

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
        if (database?.id === undefined) return;
        void dispatch(fetchTechnicalRuns({ databaseId : database.id }));
    }, [dispatch, database]);

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

    if (error !== undefined) {
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
                                    activeContextId === run.id && styles.itemActive
                                )}
                                onClick={() => handleRunClick(run)}
                            >
                                <div className={styles.itemContent}>
                                    <h3 className={styles.itemName}>{run.name ?? 'Без названия'}</h3>
                                    <div className={styles.info}>
                                        <span>ID:{run.id}</span>
                                        <CopyButton className={styles.btnCopyFactoryNumber} text={run.id} label="Копировать ID устройства" />
                                    </div>
                                    <div className={styles.itemDates}>
                                        <span className={styles.itemDate}>
                                            {formatTechnicalRunDate(run.dateStarTime)}
                                        </span>

                                        <span className={styles.itemDate}>
                                            {formatTechnicalRunDate(run.dateEndTime)}
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