import type { Guid } from '@app/lib/types/Guid.ts'
import { useSelector } from 'react-redux'

import { useEffect } from 'react'

import { useAppDispatch } from '@/store/hooks.ts'
import {
    fetchDatabases,
    selectChartsMetaLoading,
    selectDatabases,
    selectDatabasesLoaded,
    selectErrors,
    selectGetDatabasesById,
} from '@chartsPage/metaData/store/chartsMetaSlice.ts'
import {
    selectActiveDatabase,
    setActiveTemplateDb,
} from '@chartsPage/template/store/chartsTemplatesSlice.ts'

export function DatabaseSection() {
    const dispatch = useAppDispatch()

    const databases = useSelector(selectDatabases)
    const activeDatabase = useSelector(selectActiveDatabase)
    const getDatabasesById = useSelector(selectGetDatabasesById)

    const loading = useSelector(selectChartsMetaLoading).databases
    const error = useSelector(selectErrors).databases

    const databasesLoaded = useSelector(selectDatabasesLoaded)

    // Инициация загрузки баз данных (если еще не загружены и не грузятся)
    useEffect(() => {
        if (!databasesLoaded && !loading) {
            dispatch(fetchDatabases({ force: false }))
        }
    }, [dispatch, databasesLoaded, loading])

    const handleDbChange = (databaseId: Guid) => {
        const db = getDatabasesById[databaseId]
        if (!db) return
        dispatch(setActiveTemplateDb(db))
    }

    return (
        <section style={{ display: 'grid', gap: 6 }}>
            <label style={{ fontSize: 12, opacity: 0.85 }}>База данных</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                    value={activeDatabase?.id ?? ''}
                    onChange={(e) => handleDbChange(e.currentTarget.value)}
                    disabled={loading}
                >
                    <option value="" disabled>
                        {loading ? 'Загрузка…' : 'Выберите базу'}
                    </option>
                    {databases.map((db) => (
                        <option key={db.id} value={db.id}>
                            {db.name}
                        </option>
                    ))}
                </select>
                <button onClick={() => dispatch(fetchDatabases({ force: true }))} disabled={loading}>
                    Обновить
                </button>
            </div>
            {error && <small style={{ color: 'tomato' }}>{error}</small>}
        </section>
    )
}