// src/features/scenarioEditor/core/ui/map/LeftPanel/LeftPanel.tsx

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RefreshCw, Plus, RotateCw } from 'lucide-react';

import styles from './LeftPanel.module.css';

import type { AppDispatch, RootState } from '@/baseStore/store';

import {
    usePauseScenarioMutation,
    useResumeScenarioMutation,
    useRunScenarioMutation,
    useStopScenarioMutation,
} from '@/features/scenarioEditor/shared/api/workflowApi';
import type { RunScenarioResponse } from '@scenario/shared/contracts/server/localDtos/ScenarioEngine/RunScenarioResponse';
import {
    addRunningScenario,
    removeRunningScenario,
} from '@/features/scenarioEditor/store/workflowSlice';
import { SimpleMenu } from '@scenario/core/ui/map/LeftPanel/HoverActionMenu/SimpleMenu';
import type { ScenarioStopMode } from '@scenario/shared/contracts/server/types/ScenarioEngine/ScenarioStopMode';
import {
    selectActiveScenarioId,
    selectScenariosList,
    selectScenarioStatus,
} from '@scenario/store/scenarioSelectors';
import {
    refreshScenarioById,
    refreshScenariosList,
    setActiveScenarioId,
    ScenarioLoadStatus,
} from '@scenario/store/scenarioSlice';

export function LeftPanel(): JSX.Element {
    const dispatch = useDispatch<AppDispatch>();

    const [query, setQuery] = useState('');
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [errorLoadList, setErrorLoadList] = useState<string | null>(null);
    const [loadingScenarioId, setLoadingScenarioId] = useState<string | null>(null);
    const [refreshingScenarioId, setRefreshingScenarioId] = useState<string | null>(null);

    const activeScenarioId = useSelector(selectActiveScenarioId);
    const scenarios = useSelector(selectScenariosList);

    const list = useMemo(() => {
        if (!query.trim()) return scenarios;

        const q = query.trim().toLowerCase();
        return scenarios.filter((s) => {
            const name = s.name ?? '';
            const description = s.description ?? '';
            return name.toLowerCase().includes(q) || description.toLowerCase().includes(q);
        });
    }, [scenarios, query]);

    const onSelect = useCallback(
        async (id: string, currentStatus: ScenarioLoadStatus) => {
            console.log('[LeftPanel] Selecting scenario:', id, 'status:', currentStatus);

            // Сначала всегда устанавливаем активный ID
            dispatch(setActiveScenarioId(id));

            // Если сценарий уже загружен или загружается, ничего не делаем
            if (currentStatus === ScenarioLoadStatus.Loaded || currentStatus === ScenarioLoadStatus.Loading) {
                console.log('[LeftPanel] Scenario already loaded or loading, skipping');
                return;
            }

            // Загружаем сценарий только если он ещё не был загружен
            setLoadingScenarioId(id);

            try {
                console.log('[LeftPanel] Loading scenario for the first time...');
                await dispatch(refreshScenarioById(id, false)); // forceRefetch = false
                console.log('[LeftPanel] Scenario loaded successfully');
            } catch (error) {
                console.error('[LeftPanel] Failed to load scenario:', error);
            } finally {
                setLoadingScenarioId(null);
            }
        },
        [dispatch]
    );

    const onRefreshScenario = useCallback(
        async (id: string, event: React.MouseEvent) => {
            event.stopPropagation();

            if (refreshingScenarioId === id) return;

            console.log('[LeftPanel] Force refreshing scenario:', id);
            setRefreshingScenarioId(id);

            try {
                await dispatch(refreshScenarioById(id, true)); // forceRefetch = true
                console.log('[LeftPanel] Scenario force refreshed successfully');
            } catch (error) {
                console.error('[LeftPanel] Failed to force refresh scenario:', error);
            } finally {
                setRefreshingScenarioId(null);
            }
        },
        [dispatch, refreshingScenarioId]
    );

    useEffect(() => {
        // Проверяем, есть ли уже сценарии в сторе (загружены из storage)
        if (scenarios.length > 0) {
            console.log('[LeftPanel] Scenarios already loaded from storage, skipping fetch');
            return;
        }

        let mounted = true;
        (async () => {
            try {
                setIsLoadingList(true);
                setErrorLoadList(null);
                console.log('[LeftPanel] Loading scenarios list from server...');
                await dispatch(refreshScenariosList());
                console.log('[LeftPanel] Scenarios list loaded');
            } catch (e) {
                if (mounted) {
                    setErrorLoadList(e instanceof Error ? e.message : 'Ошибка загрузки');
                }
            } finally {
                if (mounted) setIsLoadingList(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [dispatch, scenarios.length]);

    const doRefetch = useCallback(async () => {
        if (isLoadingList) return;
        try {
            setIsLoadingList(true);
            setErrorLoadList(null);
            console.log('[LeftPanel] Force refreshing scenarios list...');
            await dispatch(refreshScenariosList(true));
            console.log('[LeftPanel] Scenarios list refreshed');
        } catch (e) {
            setErrorLoadList(e instanceof Error ? e.message : 'Ошибка загрузки');
        } finally {
            setIsLoadingList(false);
        }
    }, [dispatch, isLoadingList]);

    const [runScenario, runState] = useRunScenarioMutation();
    const [pauseScenario, pauseState] = usePauseScenarioMutation();
    const [resumeScenario, resumeState] = useResumeScenarioMutation();
    const [stopScenario, stopState] = useStopScenarioMutation();

    const ScenarioPlay = useCallback(
        async (scenarioId: string) => {
            if (runState.isLoading) return;
            try {
                const response: RunScenarioResponse = await runScenario({
                    id: scenarioId,
                }).unwrap();
                dispatch(
                    addRunningScenario({
                        workflowId: response.workflowId,
                        runId: response.runId,
                        scenarioId: response.scenarioId,
                        sessions: response.sessions,
                    })
                );
                dispatch(setActiveScenarioId(scenarioId));
            } catch (err) {
                console.error('RunScenario error:', err);
            }
        },
        [dispatch, runScenario, runState.isLoading]
    );

    const ScenarioPause = useCallback(
        async (scenarioId: string) => {
            if (pauseState.isLoading) return;
            try {
                await pauseScenario({ scenarioId }).unwrap();
            } catch (err) {
                console.error('PauseScenario error:', err);
            }
        },
        [pauseScenario, pauseState.isLoading]
    );

    const ScenarioResume = useCallback(
        async (scenarioId: string) => {
            if (resumeState.isLoading) return;
            try {
                await resumeScenario({ scenarioId }).unwrap();
            } catch (err) {
                console.error('ResumeScenario error:', err);
            }
        },
        [resumeScenario, resumeState.isLoading]
    );

    const ScenarioCancel = useCallback(
        async (scenarioId: string) => {
            if (stopState.isLoading) return;
            try {
                await stopScenario({
                    scenarioId,
                    mode: 'Cancel' as ScenarioStopMode,
                }).unwrap();
                dispatch(removeRunningScenario({ scenarioId }));
            } catch (err) {
                console.error('CancelScenario error:', err);
            }
        },
        [dispatch, stopScenario, stopState.isLoading]
    );

    const ScenarioTerminated = useCallback(
        async (scenarioId: string) => {
            if (stopState.isLoading) return;
            try {
                await stopScenario({
                    scenarioId,
                    mode: 'Terminate' as ScenarioStopMode,
                }).unwrap();
                dispatch(removeRunningScenario({ scenarioId }));
            } catch (err) {
                console.error('TerminateScenario error:', err);
            }
        },
        [dispatch, stopScenario, stopState.isLoading]
    );

    const CreateScenario = useCallback(async () => {
        console.log('Create scenario');
    }, []);

    return (
        <aside className={styles.panel}>
            <div className={styles.header}>
                <div className={styles.actions}>
                    <button
                        className={styles.iconBtn}
                        title="Обновить список"
                        onClick={doRefetch}
                        disabled={isLoadingList}
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button className={styles.createBtn} onClick={CreateScenario}>
                        <Plus size={16} />
                    </button>
                </div>

                <div className={styles.search}>
                    <input
                        className={styles.searchInput}
                        placeholder="Поиск сценария…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.list}>
                {isLoadingList && <div className={styles.placeholder}>Загрузка…</div>}

                {errorLoadList !== null && (
                    <div className={styles.error}>Не удалось загрузить сценарии: {errorLoadList}</div>
                )}

                {!isLoadingList && errorLoadList === null && list.length === 0 && (
                    <div className={styles.placeholder}>Нет сценариев</div>
                )}

                {!isLoadingList &&
                    errorLoadList === null &&
                    list.map((scenario) => {
                        const title = scenario.name ?? `Сценарий ${scenario.id}`;
                        const isActive = activeScenarioId === scenario.id;
                        const isLoading = loadingScenarioId === scenario.id;
                        const isRefreshing = refreshingScenarioId === scenario.id;

                        return (
                            <ScenarioItem
                                key={scenario.id}
                                scenarioId={scenario.id}
                                title={title}
                                isActive={isActive}
                                isLoading={isLoading}
                                isRefreshing={isRefreshing}
                                onSelect={onSelect}
                                onRefresh={onRefreshScenario}
                                onPlay={ScenarioPlay}
                                onPause={ScenarioPause}
                                onResume={ScenarioResume}
                                onCancel={ScenarioCancel}
                                onTerminate={ScenarioTerminated}
                            />
                        );
                    })}
            </div>
        </aside>
    );
}

interface ScenarioItemProps {
    scenarioId: string;
    title: string;
    isActive: boolean;
    isLoading: boolean;
    isRefreshing: boolean;
    onSelect: (id: string, status: ScenarioLoadStatus) => void;
    onRefresh: (id: string, event: React.MouseEvent) => void;
    onPlay: (id: string) => void;
    onPause: (id: string) => void;
    onResume: (id: string) => void;
    onCancel: (id: string) => void;
    onTerminate: (id: string) => void;
}

function ScenarioItem({
                          scenarioId,
                          title,
                          isActive,
                          isLoading,
                          isRefreshing,
                          onSelect,
                          onRefresh,
                          onPlay,
                          onPause,
                          onResume,
                          onCancel,
                          onTerminate,
                      }: ScenarioItemProps): JSX.Element {
    const status = useSelector((state: RootState) => selectScenarioStatus(state, scenarioId));

    const statusIcon = useMemo(() => {
        if (isLoading || isRefreshing) return '⏳ ';
        switch (status) {
            case ScenarioLoadStatus.Loading:
                return '⏳ ';
            case ScenarioLoadStatus.Error:
                return '❌ ';
            case ScenarioLoadStatus.Loaded:
                return '✅ ';
            default:
                return '';
        }
    }, [status, isLoading, isRefreshing]);

    const handleClick = useCallback(() => {
        if (!isLoading && !isRefreshing) {
            onSelect(scenarioId, status);
        }
    }, [isLoading, isRefreshing, onSelect, scenarioId, status]);

    return (
        <div
            className={`${styles.scenarioItem} ${isActive ? styles.itemActive : ''} ${
                isLoading ? styles.itemLoading : ''
            }`}
            onClick={handleClick}
            title={title}
        >
            <div className={styles.itemTitle}>
                {statusIcon}
                {title}
            </div>

            <button
                className={`${styles.refreshBtn} ${isRefreshing ? styles.refreshBtnLoading : ''}`}
                title="Принудительно обновить"
                onClick={(e) => onRefresh(scenarioId, e)}
                disabled={isRefreshing}
            >
                <RotateCw size={14} />
            </button>

            <SimpleMenu
                label="Действия"
                placement="bottom"
                onAction={(action) => {
                    switch (action) {
                        case 'play':
                            onPlay(scenarioId);
                            break;
                        case 'pause':
                            onPause(scenarioId);
                            break;
                        case 'resume':
                            onResume(scenarioId);
                            break;
                        case 'cancel':
                            onCancel(scenarioId);
                            break;
                        case 'terminated':
                            onTerminate(scenarioId);
                            break;
                    }
                }}
            />
        </div>
    );
}

export default LeftPanel;