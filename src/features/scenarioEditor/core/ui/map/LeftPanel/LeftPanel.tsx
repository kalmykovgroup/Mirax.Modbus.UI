// src/features/scenarioEditor/core/ui/map/LeftPanel/LeftPanel.tsx

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RefreshCw, Plus } from 'lucide-react';

import styles from './LeftPanel.module.css';

import type { AppDispatch } from '@/baseStore/store';

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
} from '@scenario/store/scenarioSelectors';
import {
    refreshScenarioById,
    refreshScenariosList,
    setActiveScenarioId,
} from '@scenario/store/scenarioSlice';

export function LeftPanel() {
    const dispatch = useDispatch<AppDispatch>();

    const [query, setQuery] = useState('');
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [errorLoadList, setErrorLoadList] = useState<string | null>(null);
    const [loadingScenarioId, setLoadingScenarioId] = useState<string | null>(null);

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
        async (id: string) => {
            console.log('[LeftPanel] Selecting scenario:', id);
            setLoadingScenarioId(id);

            try {
                // Сначала устанавливаем активный ID
                dispatch(setActiveScenarioId(id));

                // Затем загружаем полную структуру с сервера
                console.log('[LeftPanel] Loading full scenario data...');
                await dispatch(refreshScenarioById(id, true)); // forceRefetch = true

                console.log('[LeftPanel] Scenario loaded successfully');
            } catch (error) {
                console.error('[LeftPanel] Failed to load scenario:', error);
            } finally {
                setLoadingScenarioId(null);
            }
        },
        [dispatch]
    );

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setIsLoadingList(true);
                setErrorLoadList(null);
                console.log('[LeftPanel] Loading scenarios list...');
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
    }, [dispatch]);

    const doRefetch = useCallback(async () => {
        if (isLoadingList) return;
        try {
            setIsLoadingList(true);
            setErrorLoadList(null);
            await dispatch(refreshScenariosList(true));
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
                        title="Обновить"
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

                {errorLoadList && (
                    <div className={styles.error}>
                        Не удалось загрузить сценарии: {errorLoadList}
                    </div>
                )}

                {!isLoadingList && !errorLoadList && list.length === 0 && (
                    <div className={styles.placeholder}>Нет сценариев</div>
                )}

                {!isLoadingList &&
                    !errorLoadList &&
                    list.map((scenario) => {
                        const title = scenario.name || `Сценарий ${scenario.id}`;
                        const isActive = activeScenarioId === scenario.id;
                        const isLoading = loadingScenarioId === scenario.id;

                        return (
                            <div
                                key={scenario.id}
                                className={`${styles.scenarioItem} ${
                                    isActive ? styles.itemActive : ''
                                } ${isLoading ? styles.itemLoading : ''}`}
                                onClick={() => !isLoading && onSelect(scenario.id)}
                                title={title}
                            >
                                <div className={styles.itemTitle}>
                                    {isLoading ? '⏳ ' : ''}
                                    {title}
                                </div>

                                <SimpleMenu
                                    label="Действия"
                                    placement="bottom"
                                    onAction={(action) => {
                                        switch (action) {
                                            case 'play':
                                                ScenarioPlay(scenario.id);
                                                break;
                                            case 'pause':
                                                ScenarioPause(scenario.id);
                                                break;
                                            case 'resume':
                                                ScenarioResume(scenario.id);
                                                break;
                                            case 'cancel':
                                                ScenarioCancel(scenario.id);
                                                break;
                                            case 'terminated':
                                                ScenarioTerminated(scenario.id);
                                                break;
                                        }
                                    }}
                                />
                            </div>
                        );
                    })}
            </div>
        </aside>
    );
}

export default LeftPanel;