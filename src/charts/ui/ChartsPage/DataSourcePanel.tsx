// src/components/DataSourcePanel.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '@/store/types'

import {
    fetchDatabases, fetchEntities, fetchEntityFields,
    setActiveDb, setActiveEntity,
    toggleFilterField, setFilterFields,
    selectDatabases,
    selectEntities,
    selectFields,
    selectLoading, selectErrors, selectEditEntity, clearBoundTemplate, setEditEntityName, setEditEntityDesc,
} from '@/charts/store/chartsMetaSlice.ts'
import type {ChartReqTemplateDto} from "@/charts/shared/contracts/chartTemplate/Dtos/ChartReqTemplateDto.ts";
import {createChartReqTemplate, updateChartReqTemplate} from "@/charts/store/chartsTemplatesSlice.ts";
import type {DatabaseDto} from "@/charts/shared/contracts/metadata/Dtos/DatabaseDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";



type Op =
    | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
    | 'between' | 'in' | 'nin'
    | 'like' | 'ilike'
    | 'isnull' | 'notnull'

type FilterEntry = { id: string; field: string; op: Op; value?: any }

const OP_LABELS: Record<Op, string> = {
    eq: '==', ne: '!=', gt: '>', gte: '≥', lt: '<', lte: '≤',
    between: 'между', in: 'в списке', nin: 'не в списке',
    like: 'LIKE', ilike: 'ILIKE', isnull: 'IS NULL', notnull: 'IS NOT NULL',
}

type DataSourcePanelProps = {
    onApply: (args: ChartReqTemplateDto) => void
}

export const DataSourcePanel: React.FC<DataSourcePanelProps> = ({ onApply }) => {

    const dispatch = useDispatch<AppDispatch>()

    // store
    const databases = useSelector(selectDatabases)
    const editEntity = useSelector(selectEditEntity)
    const entities = useSelector(selectEntities)
    const fields = useSelector(selectFields)
    const loading = useSelector(selectLoading)
    const errors = useSelector(selectErrors)



    // memo lists
    const timeFields = useMemo(
        () => (fields ?? []).filter(f => (f as any)?.isTime).map(f => f.name),
        [fields]
    )
    const numericFieldNames = useMemo(
        () => (fields ?? []).filter(f => (f as any)?.isNumeric).map(f => f.name),
        [fields]
    )

    // local state
    const [timeField, setTimeFieldLocal] = useState<string | undefined>(undefined)

    const [filtersText, setFiltersText] = useState<string>("")
    const [filtersError, setFiltersError] = useState<string | null>(null)
    const [entries, setEntries] = useState<FilterEntry[]>([])

    const handleApply = () => {
        onApply({
            id : editEntity.id,
            name: editEntity.name,
            description: editEntity.description,
            databaseId: editEntity.databaseId,
            entity: editEntity.entity,
            timeField: timeField,
            fields: editEntity.fields,
            filters: parsedFilters
        } as ChartReqTemplateDto)
    }

    // defaults
    useEffect(() => {
        if (!timeField && timeFields.length) setTimeFieldLocal(timeFields[0])
        if (timeField && !timeFields.includes(timeField)) setTimeFieldLocal(timeFields[0])
    }, [timeFields, timeField])

    // initial loads
    useEffect(() => { dispatch(fetchDatabases()) }, [dispatch])
    useEffect(() => { if (editEntity.database || databases.length) dispatch(fetchEntities()) }, [dispatch, editEntity.database, databases.length])
    useEffect(() => { if (editEntity.entity) dispatch(fetchEntityFields()) }, [dispatch, editEntity.entity])

    // ---------- helpers to sync filters ----------
    const isTime = (name: string) => !!fields.find(f => f.name === name && (f as any).isTime)
    const isNumeric = (name: string) => !!fields.find(f => f.name === name && (f as any).isNumeric)

    const buildFiltersObject = (list: FilterEntry[]): Record<string, unknown> => {
        const out: Record<string, unknown> = {}
        for (const e of list) {
            const key = `${e.field}${e.op ? `__${e.op}` : ''}`
            switch (e.op) {
                case 'between':
                    if (Array.isArray(e.value) && e.value.length === 2 && e.value[0] != null && e.value[1] != null) out[key] = e.value
                    break
                case 'in':
                case 'nin':
                    if (Array.isArray(e.value) && e.value.length > 0) out[key] = e.value
                    break
                case 'isnull':
                case 'notnull':
                    out[key] = true
                    break
                default:
                    if (e.value !== undefined) out[key] = e.value
            }
        }
        return out
    }


    // entries -> JSON (автогенерация строки; не трогает entries)
    useEffect(() => {
        const obj = buildFiltersObject(entries)
        const text = JSON.stringify(obj)
        setFiltersText(text)
        setFiltersError(null)
    }, [entries])


    // parsed filters to send
    const parsedFilters: Record<string, unknown> | undefined = useMemo(() => {
        if (filtersError) return undefined
        try { return filtersText.trim() ? (JSON.parse(filtersText) as Record<string, unknown>) : undefined }
        catch { return undefined }
    }, [filtersText, filtersError])


    const validate = () => {

        const missing: string[] = []
        if (!editEntity.database) missing.push('База данных')
        if (!editEntity.entity)   missing.push('Таблица (entity)')
        if (!timeField)           missing.push('Поле времени (timeField)')
        if (!editEntity.name?.length) missing.push('Имя')

        if (filtersError) { alert('Исправьте JSON фильтров'); return false; }
        if (missing.length) { alert(`Заполните: ${missing.join(', ')}`); return false; }

        return true;
    }

    const updateChartReqTemplateHandler = () => {
        if (!editEntity.id) { alert('Не выбран шаблон для обновления'); return; }
        // Обновление существующего шаблона
        if(!validate()) return;

        const dto: ChartReqTemplateDto = {
            id: editEntity.id!,
            name: editEntity.name!,
            description: editEntity.description,
            databaseId: editEntity.databaseId!,
            entity: editEntity.entity!,
            timeField: timeField!,
            fields: editEntity.fields ?? [],
            filters: parsedFilters ?? {},
        }

        dispatch(updateChartReqTemplate({ body: dto }))
    }

    const createChartReqTemplateHandler = () => {
         // Создание нового шаблона
        if(!validate()) return;

        const dto: ChartReqTemplateDto = {
            // id не задаём — сервер создаст
            name: editEntity.name,
            description: editEntity.description,
            databaseId: editEntity.databaseId!,
            entity: editEntity.entity!,
            timeField: timeField!,
            fields: editEntity.fields ?? [],
            filters: parsedFilters ?? {},
        } as ChartReqTemplateDto

        dispatch(createChartReqTemplate(dto))
    }

    const byId = useMemo(() => new Map(databases.map(d => [d.id, d])), [databases]);

    const handleDbChange = (databaseId: Guid) => {
        const db: DatabaseDto | undefined = byId.get(databaseId);

        if(db == undefined) throw Error("databaseId is undefined");

        dispatch(setActiveDb(db));
        if (db) dispatch(fetchEntities());
    };


    return (
        <div style={{ display: 'grid', gap: 12, padding: 12, border: '1px solid #333', borderRadius: 8 }}>
            <div style={{ fontWeight: 600 }}>Источник данных</div>

            {/* Databases */}
            <section style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 12, opacity: .85 }}>База данных</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                        value={editEntity?.databaseId ?? ''}           // select ждёт string, не undefined
                        onChange={(e) => handleDbChange(e.currentTarget.value)}
                        disabled={loading.databases}
                    >
                        <option value="" disabled>
                            {loading.databases ? 'Загрузка…' : 'Выберите базу'}
                        </option>

                        {databases.map(db => (
                            <option key={db.id} value={db.id}>
                                {db.name}
                            </option>
                        ))}
                    </select>
                    <button onClick={() => dispatch(fetchDatabases({ force: true }))} disabled={loading.databases}>Обновить</button>
                </div>
                {errors.databases && <small style={{ color: 'tomato' }}>{errors.databases}</small>}
            </section>

            {/* Entities */}
            <section style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 12, opacity: .85 }}>Таблица (entity)</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

                    <select
                        value={editEntity.entity ?? ''}
                        onChange={e => { const entity = e.target.value || undefined; dispatch(setActiveEntity(entity)); if (entity) dispatch(fetchEntityFields({ entity })) }}
                        disabled={loading.entities || entities.length === 0}
                    >
                        {(entities.length ? entities : ['']).map(n => <option key={n} value={n}>{n || (loading.entities ? 'загрузка…' : '—')}</option>)}
                    </select>
                    <button onClick={() => dispatch(fetchEntities({ force: true }))} disabled={loading.entities || !databases.length}>Обновить</button>
                </div>
                {errors.entities && <small style={{ color: 'tomato' }}>{errors.entities}</small>}
            </section>

            {/* Time field */}
            <section style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 12, opacity: .85 }}>Поле времени (ось X)</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                        value={timeField ?? ''}
                        onChange={e => setTimeFieldLocal(e.target.value || undefined)}
                        disabled={loading.fields || timeFields.length === 0}
                    >
                        {(timeFields.length ? timeFields : ['']).map(n => <option key={n} value={n}>{n || (loading.fields ? 'загрузка…' : '—')}</option>)}
                    </select>
                    <button onClick={() => editEntity.entity && dispatch(fetchEntityFields({ entity: editEntity.entity, force: true }))} disabled={loading.fields || !editEntity.entity}>
                        Обновить поля
                    </button>
                </div>
            </section>

            {/* Fields */}
            <section style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: 12, opacity: .85 }}>Поля (выбранные — строим/фильтруем)</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => dispatch(setFilterFields(numericFieldNames))} disabled={loading.fields || fields.length === 0}>Только numeric</button>
                        <button onClick={() => dispatch(setFilterFields([]))} disabled={loading.fields || fields.length === 0}>Очистить</button>
                    </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, border: '1px solid #333', borderRadius: 6, minHeight: 44 }}>
                    {loading.fields && <span style={{ fontSize: 12, opacity: .7 }}>загрузка…</span>}
                    {!loading.fields && fields.length === 0 && <span style={{ fontSize: 12, opacity: .7 }}>нет полей</span>}
                    {!loading.fields && fields.map(f => {
                        const checked = editEntity.fields.includes(f.name)
                        return (
                            <label key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 6px', border: '1px solid #444', borderRadius: 6, fontSize: 12 }}>
                                <input type="checkbox" checked={checked} onChange={() => dispatch(toggleFilterField(f.name))} />
                                <span>{f.name}</span>
                                <span style={{ opacity: .6 }}>{(f as any).isTime ? ' ⏱' : (f as any).isNumeric ? ' #️⃣' : ''}</span>
                            </label>
                        )
                    })}
                </div>
                {errors.fields && <small style={{ color: 'tomato' }}>{errors.fields}</small>}
            </section>

            {/* Filters builder */}
            <FiltersBuilder
                fields={fields}
                entries={entries}
                setEntries={setEntries}
                filtersText={filtersText}
                setFiltersText={setFiltersText}
                filtersError={filtersError}
                setFiltersError={setFiltersError}
                isTime={isTime}
                isNumeric={isNumeric}
            />

                    <div >
                        <label style={{ display: 'grid', gap: 6 }}>
                            <span style={{ fontSize: 12, opacity: .8 }}>Название*</span>
                            <input
                                type="text"
                                placeholder=""
                                value={editEntity.name ?? ""}
                                onChange={e => dispatch(setEditEntityName(e.target.value))}
                            />
                        </label>

                        <label style={{ display: 'grid', gap: 6 }}>
                            <span style={{ fontSize: 12, opacity: .8 }}>Описание</span>
                            <textarea
                                rows={3}
                                placeholder="Кратко опишите назначение шаблона"
                                value={editEntity.description ?? ""}
                                onChange={e => dispatch(setEditEntityDesc(e.target.value))}
                            />
                        </label>
                    </div>



            <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                <div>
                    {editEntity.id ? (
                        <>
                            <button onClick={updateChartReqTemplateHandler}>Обновить запись</button>
                            <button onClick={() => dispatch(clearBoundTemplate())}>Сбросить шаблон</button>
                        </>
                    ) : (
                        <button onClick={createChartReqTemplateHandler}>Сохранить шаблон</button>
                    )}
                </div>
                <div>
                    <button onClick={handleApply}>Применить</button>
                </div>
            </div>



        </div>
    )
}

// ----- FiltersBuilder subcomponent (с живой валидацией JSON) -----
function FiltersBuilder({
                            fields,
                            entries, setEntries,
                            filtersText, setFiltersText,
                            filtersError, setFiltersError,
                            isTime, isNumeric,
                        }: {
    fields: any[]
    entries: FilterEntry[]
    setEntries: (x: FilterEntry[]) => void
    filtersText: string
    setFiltersText: (v: string) => void
    filtersError: string | null
    setFiltersError: (v: string | null) => void
    isTime: (name: string) => boolean
    isNumeric: (name: string) => boolean
}) {
    const [newField, setNewField] = useState<string>('')
    const [newOp, setNewOp] = useState<Op>('eq')
    const [newValue1, setNewValue1] = useState<string>('')
    const [newValue2, setNewValue2] = useState<string>('')
    const [arrayEditor, setArrayEditor] = useState<string>('')

    useEffect(() => { setNewOp('eq'); setNewValue1(''); setNewValue2(''); setArrayEditor('') }, [newField])

    const toISOFromLocal = (v: string) =>
        v ? new Date(new Date(v).getTime() - new Date(v).getTimezoneOffset() * 60000).toISOString() : ''

    const opsForField = (name: string): Op[] => {
        if (isTime(name) || isNumeric(name)) return ['eq','ne','gt','gte','lt','lte','between','in','nin','isnull','notnull']
        return ['eq','ne','like','ilike','in','nin','isnull','notnull']
    }

    const buildFiltersObject = (list: FilterEntry[]): Record<string, unknown> => {
        const out: Record<string, unknown> = {}
        for (const e of list) {
            const key = `${e.field}${e.op ? `__${e.op}` : ''}`
            switch (e.op) {
                case 'between':
                    if (Array.isArray(e.value) && e.value.length === 2 && e.value[0] != null && e.value[1] != null) out[key] = e.value
                    break
                case 'in':
                case 'nin':
                    if (Array.isArray(e.value) && e.value.length > 0) out[key] = e.value
                    break
                case 'isnull':
                case 'notnull':
                    out[key] = true
                    break
                default:
                    if (e.value !== undefined) out[key] = e.value
            }
        }
        return out
    }

    const parseFiltersToEntries = (obj: unknown): FilterEntry[] => {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return []
        const res: FilterEntry[] = []
        for (const [rawKey, v] of Object.entries(obj as Record<string, any>)) {
            const m = rawKey.match(/^(.*?)(?:__(.+))?$/)
            const field = m?.[1] ?? rawKey
            const op = (m?.[2] as Op) ?? 'eq'
            res.push({ id: `${field}__${op}__${Math.random().toString(36).slice(2,8)}`, field, op, value: v })
        }
        return res
    }

    // entries -> JSON (локально)
    useEffect(() => {
        const obj = buildFiltersObject(entries)
        setFiltersText(JSON.stringify(obj))
        setFiltersError(null)
    }, [entries])

    // ЖИВАЯ валидация JSON и синхронизация JSON -> entries
    const onJsonChange = (v: string) => {
        setFiltersText(v)
        if (!v.trim()) {
            setFiltersError(null)
            setEntries([])
            return
        }
        try {
            const obj = JSON.parse(v)
            setEntries(parseFiltersToEntries(obj))
            setFiltersError(null)
        } catch (e: any) {
            setFiltersError(e?.message || 'Invalid JSON')
            // entries не трогаем до валидности
        }
    }

    const parseArray = (raw: string, forField: string) => {
        const items = raw.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean)
        if (isTime(forField)) return items.map(toISOFromLocal)
        if (isNumeric(forField)) return items.map(x => Number(x)).filter(x => !Number.isNaN(x))
        return items
    }
    const parseSingle = (raw: string, forField: string) => {
        if (isTime(forField)) return toISOFromLocal(raw)
        if (isNumeric(forField)) {
            const n = Number(raw); return Number.isNaN(n) ? undefined : n
        }
        return raw
    }

    const onAdd = () => {
        if (!newField) return
        const id = `${newField}__${newOp}__${Math.random().toString(36).slice(2,8)}`
        let value: any = undefined
        switch (newOp) {
            case 'between': {
                const a = parseSingle(newValue1, newField)
                const b = parseSingle(newValue2, newField)
                if (a == null || b == null) return
                value = [a, b]
                break
            }
            case 'in':
            case 'nin': {
                const arr = parseArray(arrayEditor, newField)
                if (!arr.length) return
                value = arr
                break
            }
            case 'isnull':
            case 'notnull':
                value = true; break
            default: {
                const v = parseSingle(newValue1, newField)
                if (v == null) return
                value = v
            }
        }
        setEntries((prev: any) => [...prev, { id, field: newField, op: newOp, value }])
        setNewValue1(''); setNewValue2(''); setArrayEditor('')
    }

    return (
        <section style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 600 }}>Фильтры</div>

            {/* editor row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                <select value={newField} onChange={e => setNewField(e.target.value)}>
                    <option value="">— поле —</option>
                    {fields.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                </select>

                <select value={newOp} onChange={e => setNewOp(e.target.value as Op)} disabled={!newField}>
                    {(!newField ? [] : opsForField(newField)).map(o => <option key={o} value={o}>{OP_LABELS[o]}</option>)}
                </select>

                {newOp === 'between' ? (
                    <>
                        <ValueEditor field={newField} value={newValue1} setValue={setNewValue1} placeholder="от" />
                        <ValueEditor field={newField} value={newValue2} setValue={setNewValue2} placeholder="до" />
                    </>
                ) : newOp === 'in' || newOp === 'nin' ? (
                    <>
            <textarea value={arrayEditor} onChange={e => setArrayEditor(e.target.value)}
                      placeholder="значения через запятую / пробел / перенос" rows={1} style={{ resize: 'vertical' }} />
                        <div />
                    </>
                ) : newOp === 'isnull' || newOp === 'notnull' ? (
                    <>
                        <input disabled placeholder="значение не требуется" />
                        <div />
                    </>
                ) : (
                    <>
                        <ValueEditor field={newField} value={newValue1} setValue={setNewValue1} placeholder="значение" />
                        <div />
                    </>
                )}

                <button onClick={onAdd} disabled={!newField}>Добавить</button>
            </div>

            {/* list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {entries.length === 0 && <span style={{ fontSize: 12, opacity: .7 }}>фильтры не заданы</span>}
                {entries.map(e => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', border: '1px solid #333', borderRadius: 6 }}>
                        <code style={{ opacity: .9 }}>{e.field}__{e.op}</code>
                        <span style={{ opacity: .7 }}>
              {Array.isArray(e.value) ? `[${e.value.map(String).join(', ')}]` : (e.value === true ? '' : String(e.value ?? ''))}
            </span>
                        <div style={{ flex: 1 }} />
                        <button onClick={() => setEntries(prev => prev.filter(x => x.id !== e.id))} title="Удалить">✕</button>
                    </div>
                ))}
            </div>

            {/* JSON (живой парсер) */}
            <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 12, opacity: .85 }}>Filters (JSON)</label>
                <textarea
                    value={filtersText}
                    onChange={e => onJsonChange(e.target.value)}
                    rows={3}
                    style={{ border: `1px solid ${filtersError ? 'tomato' : '#333'}`, borderRadius: 6, padding: 8, fontFamily: 'monospace', fontSize: 12 }}
                />
                {filtersError && <small style={{ color: 'tomato' }}>{filtersError}</small>}
            </div>


        </section>


    )
}

function ValueEditor({
                         field, value, setValue, placeholder,
                     }: { field?: string; value: string; setValue: (v: string) => void; placeholder?: string }) {
    const fields = useSelector(selectFields)
    const meta = fields.find(f => f.name === field)
    const isTime = !!(meta as any)?.isTime
    const isNumeric = !!(meta as any)?.isNumeric
    if (isTime) return <input type="datetime-local" value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} />
    if (isNumeric) return <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} />
    return <input type="text" value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} />
}
