import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RefreshCw, Plus } from 'lucide-react';
import styles from './LeftPanel.module.css';
import {
    refreshScenarioById, selectActiveScenarioId, selectScenariosEntries, selectScenariosListError,
    setActiveScenarioId,
} from '@/features/scenarioEditor/store/scenarioSlice.ts';
import { refreshScenariosList } from '@/features/scenarioEditor/store/scenarioSlice.ts';
import type { ScenarioDto } from '@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/Scenarios/ScenarioDto.ts';
import {
    usePauseScenarioMutation,
    useResumeScenarioMutation,
    useRunScenarioMutation,
    useStopScenarioMutation,
} from '@/features/scenarioEditor/shared/api/workflowApi.ts';
import type { RunScenarioResponse } from '@shared/contracts/Dtos/LocalDtos/ScenarioEngine/RunScenarioResponse.ts';
import { addRunningScenario, removeRunningScenario } from '@/features/scenarioEditor/store/workflowSlice.ts';
import {
    SimpleMenu
} from "@scenario/core/ui/map/LeftPanel/HoverActionMenu/SimpleMenu.tsx";
import type {ScenarioStopMode} from "@shared/contracts/Types/ScenarioEngine/ScenarioStopMode.ts";
import type {AppDispatch} from "@/store/store.ts";

export function LeftPanel() {
    const dispatch = useDispatch<AppDispatch>();

    const [query, setQuery] = useState('');
    const [isLoadingList, setIsLoadingList] = useState(false);

    // селекторы из memo-файла
    const errorLoadList = useSelector(selectScenariosListError);
    const activeScenarioId = useSelector(selectActiveScenarioId);
    const entries = useSelector(selectScenariosEntries);


    const list: ScenarioDto[] = useMemo(() => {
        const arr = entries.map(e => e.scenario);
        if (!query.trim()) return arr;
        const q = query.trim().toLowerCase();
        return arr.filter(s =>
            (s.name ?? '').toLowerCase().includes(q) ||
            (s.description ?? '').toLowerCase().includes(q)
        );
    }, [entries, query]);

    const onSelect = useCallback(async (id: string) => {
        dispatch(setActiveScenarioId(id as any));
        await dispatch(refreshScenarioById(id, false)); // догрузит детали, если их нет
    }, [dispatch]);

    // загрузка списка при монтировании
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
        return () => { mounted = false; };
    }, [dispatch]);

    const doRefetch = useCallback(async () => {
        if (isLoadingList) return;
        try {
            setIsLoadingList(true);
            await dispatch(refreshScenariosList(true));
        } finally {
            setIsLoadingList(false);
        }
    }, [dispatch, isLoadingList]);

    // workflow actions (без изменений)
    const [runScenario,     runState]     = useRunScenarioMutation();
    const [pauseScenario,   pauseState]   = usePauseScenarioMutation();
    const [resumeScenario,  resumeState]  = useResumeScenarioMutation();
    const [stopScenario,    stopState]    = useStopScenarioMutation();

    const ScenarioPlay = useCallback(async (scenario: ScenarioDto) => {
        if (runState.isLoading) return;
        try {
            const response: RunScenarioResponse = await runScenario({ id: scenario.id }).unwrap();
            dispatch(addRunningScenario({
                workflowId: response.workflowId,
                runId: response.runId,
                scenarioId: response.scenarioId,
                sessions: response.sessions,
            }));
            dispatch(setActiveScenarioId(scenario.id));
        } catch (err) {
            console.error('RunScenario error:', err);
        }
    }, [dispatch, runScenario, runState.isLoading]);

    const ScenarioPause = useCallback(async (scenario: ScenarioDto) => {
        if (pauseState.isLoading) return;
        try { await pauseScenario({ scenarioId: scenario.id }).unwrap(); }
        catch (err) { console.error('PauseScenario error:', err); }
    }, [pauseScenario, pauseState.isLoading]);

    const ScenarioResume = useCallback(async (scenario: ScenarioDto) => {
        if (resumeState.isLoading) return;
        try { await resumeScenario({ scenarioId: scenario.id }).unwrap(); }
        catch (err) { console.error('ResumeScenario error:', err); }
    }, [resumeScenario, resumeState.isLoading]);

    const ScenarioCancel = useCallback(async (scenario: ScenarioDto) => {
        if (stopState.isLoading) return;
        try {
            await stopScenario({ scenarioId: scenario.id, mode: 'Cancel' as ScenarioStopMode }).unwrap();
            dispatch(removeRunningScenario({ scenarioId: scenario.id }));
        } catch (err) {
            console.error('CancelScenario error:', err);
        }
    }, [dispatch, stopScenario, stopState.isLoading]);

    const ScenarioTerminated = useCallback(async (scenario: ScenarioDto) => {
        if (stopState.isLoading) return;
        try {
            await stopScenario({ scenarioId: scenario.id, mode: 'Terminate' as ScenarioStopMode }).unwrap();
            dispatch(removeRunningScenario({ scenarioId: scenario.id }));
        } catch (err) {
            console.error('TerminateScenario error:', err);
        }
    }, [dispatch, stopScenario, stopState.isLoading]);

    const CreateScenario = async () => { /* TODO */ };

    return (
        <aside className={styles.panel}>
            <div className={styles.header}>
                <div className={styles.actions}>
                    <button className={styles.iconBtn} title="Обновить" onClick={doRefetch} disabled={isLoadingList}>
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
                {!!errorLoadList && <div className={styles.error}>Не удалось загрузить сценарии: {errorLoadList}</div>}

                {!isLoadingList && !errorLoadList && list.length === 0 && (
                    <div className={styles.placeholder}>Нет сценариев</div>
                )}

                {!isLoadingList && !errorLoadList && list.map((s) => {
                    const title = s.name ?? `Сценарий ${s.id}`;
                    return (
                        <div
                            key={s.id}
                            className={`${styles.scenarioItem} ${activeScenarioId === s.id ? styles.itemActive : ''}`}
                            onClick={() => onSelect(s.id)}
                            title={title}
                        >
                            <div className={styles.itemTitle}>{title}</div>

                            <SimpleMenu
                                label="Действия"
                                placement="bottom"
                                onAction={(a) => {
                                    switch (a) {
                                        case 'play':       ScenarioPlay(s); break;
                                        case 'pause':      ScenarioPause(s); break;
                                        case 'resume':     ScenarioResume(s); break;
                                        case 'cancel':     ScenarioCancel(s); break;
                                        case 'terminated': ScenarioTerminated(s); break;
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
