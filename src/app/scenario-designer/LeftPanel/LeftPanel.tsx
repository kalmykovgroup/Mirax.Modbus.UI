
import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RefreshCw, Plus } from 'lucide-react';
import styles from './LeftPanel.module.css';
import {useGetAllScenariosQuery} from "@shared/api/scenarioApi.ts";
import {setActiveScenarioId} from "@/store/features/scenario/scenarioSlice.ts";

type RootState = any; // подставь свой тип корня стора

export function LeftPanel() {
    const dispatch = useDispatch();
    const activeId = useSelector((s: RootState) => s.ui?.activeScenarioId ?? null);

    const [query, setQuery] = useState('');
    const { data, isLoading, isError, refetch, isFetching } = useGetAllScenariosQuery();

    const list = useMemo(() => {
        const arr = data ?? [];
        if (!query.trim()) return arr;
        const q = query.trim().toLowerCase();
        return arr.filter(s =>
            (s.name ?? '').toLowerCase().includes(q) ||
            (s.description ?? '').toLowerCase().includes(q)
        );
    }, [data, query]);


    const onSelect = (id: string) => dispatch(setActiveScenarioId(id));



    return (
        <aside className={styles.panel}>
            <div className={styles.header}>
                <div className={styles.actions}>
                    <button
                        className={styles.iconBtn}
                        title="Обновить"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button
                        className={styles.createBtn}
                        onClick={() => alert("Метод не реализован")}

                    >
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
                {isLoading && <div className={styles.placeholder}>Загрузка…</div>}
                {isError && <div className={styles.error}>Не удалось загрузить сценарии</div>}

                {!isLoading && !isError && list.length === 0 && (
                    <div className={styles.placeholder}>
                        Нет сценариев
                    </div>
                )}

                {!isLoading && !isError && list.map((s: any) => {
                    const title = s.name ?? s.title ?? `Сценарий ${s.id}`;
                    return (
                        <button
                            key={s.id}
                            className={`${styles.item} ${activeId === s.id ? styles.itemActive : ''}`}
                            onClick={() => onSelect(s.id)}
                            title={title}
                        >
                            <div className={styles.itemTitle}>{title}</div>
                            {s.description && <div className={styles.itemDesc}>{s.description}</div>}
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}

export default LeftPanel;
