// src/features/scenarioEditor/ui/map/LeftPanel/LeftPanel.tsx

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
import { addRunningScenario, removeRunningScenario } from '@/features/scenarioEditor/store/workflowSlice';
import { SimpleMenu } from '@scenario/core/ui/map/LeftPanel/HoverActionMenu/SimpleMenu';
import type { ScenarioStopMode } from '@scenario/shared/contracts/server/types/ScenarioEngine/ScenarioStopMode';
import {
    selectActiveScenarioId,
    selectScenarioEntries,
    selectScenariosListError
} from "@scenario/store/scenarioSelectors.ts";
import {
    refreshScenarioById,
    refreshScenariosList,
    type ScenarioMeta,
    setActiveScenarioId
} from "@scenario/store/scenarioSlice.ts";


export function LeftPanel()  {
    const dispatch = useDispatch<AppDispatch>();

    const [query, setQuery] = useState('');
    const [isLoadingList, setIsLoadingList] = useState(false);

    // Селекторы
    const errorLoadList = useSelector(selectScenariosListError);
    const activeScenarioId = useSelector(selectActiveScenarioId);
    const entries = useSelector(selectScenarioEntries);

    // Фильтрация по поисковому запросу
    const list: readonly ScenarioMeta[] = useMemo(() => {
        if (!query.trim()) return entries;

        const q = query.trim().toLowerCase();
        return entries.filter((entry) => {
            const name = entry.name ?? '';
            const description = entry.description ?? '';
            return name.toLowerCase().includes(q) || description.toLowerCase().includes(q);
        });
    }, [entries, query]);

    // Выбор сценария
    const onSelect = useCallback(
        async (id: string) => {
            dispatch(setActiveScenarioId(id));
            await dispatch(refreshScenarioById(id, false)); // Догрузит детали, если их нет
        },
        [dispatch]
    );

    // Загрузка списка при монтировании
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setIsLoadingList(true);
                await dispatch(refreshScenariosList());
            } finally {
                if (mounted) setIsLoadingList(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [dispatch]);

    // Обновление списка
    const doRefetch = useCallback(async () => {
        if (isLoadingList) return;
        try {
            setIsLoadingList(true);
            await dispatch(refreshScenariosList(true));
        } finally {
            setIsLoadingList(false);
        }
    }, [dispatch, isLoadingList]);

    // Workflow actions
    const [runScenario, runState] = useRunScenarioMutation();
    const [pauseScenario, pauseState] = usePauseScenarioMutation();
    const [resumeScenario, resumeState] = useResumeScenarioMutation();
    const [stopScenario, stopState] = useStopScenarioMutation();

    const ScenarioPlay = useCallback(
        async (scenarioId: string) => {
            if (runState.isLoading) return;
            try {
                const response: RunScenarioResponse = await runScenario({ id: scenarioId }).unwrap();
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
                await stopScenario({ scenarioId, mode: 'Cancel' as ScenarioStopMode }).unwrap();
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
                await stopScenario({ scenarioId, mode: 'Terminate' as ScenarioStopMode }).unwrap();
                dispatch(removeRunningScenario({ scenarioId }));
            } catch (err) {
                console.error('TerminateScenario error:', err);
            }
        },
        [dispatch, stopScenario, stopState.isLoading]
    );

    const CreateScenario = useCallback(async () => {
        // TODO: Открыть модалку создания сценария
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
                    list.map((entry) => {
                        const title = entry.name || `Сценарий ${entry.id}`;
                        const isActive = activeScenarioId === entry.id;

                        return (
                            <div
                                key={entry.id}
                                className={`${styles.scenarioItem} ${isActive ? styles.itemActive : ''}`}
                                onClick={() => onSelect(entry.id)}
                                title={title}
                            >
                                <div className={styles.itemTitle}>{title}</div>

                                <SimpleMenu
                                    label="Действия"
                                    placement="bottom"
                                    onAction={(action) => {
                                        switch (action) {
                                            case 'play':
                                                ScenarioPlay(entry.id);
                                                break;
                                            case 'pause':
                                                ScenarioPause(entry.id);
                                                break;
                                            case 'resume':
                                                ScenarioResume(entry.id);
                                                break;
                                            case 'cancel':
                                                ScenarioCancel(entry.id);
                                                break;
                                            case 'terminated':
                                                ScenarioTerminated(entry.id);
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