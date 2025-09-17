import type { ChartReqTemplateDto } from '@charts/shared/contracts/chartTemplate/Dtos/ChartReqTemplateDto'
import type { FilterClause } from '@charts/shared/contracts/chartTemplate/Dtos/FilterClause'
import type { SqlFilter } from '@charts/shared/contracts/chartTemplate/Dtos/SqlFilter'
import type { SqlParam } from '@charts/shared/contracts/chartTemplate/Dtos/SqlParam'
import type { SqlParamType } from '@charts/shared/contracts/chartTemplate/Dtos/SqlParamType'

const KeyRx = /{{\s*([\w:.\-]+)\s*}}/g

export function extractKeysFromString(s?: string | null): string[] {
    if (!s) return []
    const keys: string[] = []
    let m: RegExpExecArray | null
    KeyRx.lastIndex = 0
    while ((m = KeyRx.exec(s)) !== null) {
        const key = (m[1] || '').trim()
        if (key && !keys.includes(key)) keys.push(key)
    }
    return keys
}
export function extractKeysFromValue(v: unknown): string[] {
    const keys: string[] = []
    const add = (t: string) => extractKeysFromString(t).forEach(k => { if (!keys.includes(k)) keys.push(k) })
    if (typeof v === 'string') add(v)
    else if (Array.isArray(v)) v.forEach(x => { if (typeof x === 'string') add(x) })
    return keys
}
export function extractAllKeys(where?: FilterClause[], sql?: SqlFilter | null): string[] {
    const keys: string[] = []
    ;(where ?? []).forEach(cl => {
        extractKeysFromValue((cl as any).value).forEach(k => { if (!keys.includes(k)) keys.push(k) })
    })
    if (sql?.whereSql) extractKeysFromString(sql.whereSql).forEach(k => { if (!keys.includes(k)) keys.push(k) })
    return keys
}
export function extractAllKeysFromTemplate(tpl: ChartReqTemplateDto): string[] {
    // @ts-ignore
    const where: FilterClause[] | undefined = (tpl as any).where
    // @ts-ignore
    const sql: SqlFilter | null | undefined = (tpl as any).sql
    return extractAllKeys(where, sql ?? null)
}

export function getParamMeta(params: SqlParam[] | undefined, key: string): SqlParam | undefined {
    return (params ?? []).find(p => (p?.key ?? '').trim() === key.trim())
}

export function coerceByType(raw: string, type?: SqlParamType | string): unknown {
    const t = (type || '').toString().toLowerCase()
    if (!t) return raw
    if (['int','integer','smallint','bigint'].includes(t)) {
        const n = parseInt(raw, 10); return Number.isFinite(n) ? n : raw
    }
    if (['double','numeric','decimal','real','float'].includes(t)) {
        const n = Number(raw.replace(',', '.')); return Number.isFinite(n) ? n : raw
    }
    if (['bool','boolean'].includes(t)) {
        const s = raw.trim().toLowerCase()
        return (s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'on')
    }
    // uuid/text/string/date/timestamp/timestamptz → оставляем строкой
    return raw
}

function replaceInString(source: string, key: string, val: unknown): string {
    const needle = new RegExp(`{{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*}}`, 'g')
    return source.replace(needle, String(val))
}

export function resolveWhere(where: FilterClause[], values: Record<string, unknown>, params?: SqlParam[]): FilterClause[] {
    const clone = JSON.parse(JSON.stringify(where)) as FilterClause[]
    for (const c of clone as any[]) {
        const v = c.value
        if (typeof v === 'string') {
            const m = v.match(/^{{\s*([\w:.\-]+)\s*}}$/)
            if (m) {
                const key: string | undefined = m[1]

                if(key == undefined) throw Error(`Expected ${m[1]} to be a string`)

                const meta = getParamMeta(params, key)
                const raw = values[key]
                c.value = meta ? coerceByType(String(raw ?? ''), (meta as any).type) : raw
            } else {
                let s = v
                const keys = extractKeysFromString(v)
                for (const k of keys) s = replaceInString(s, k, values[k] ?? '')
                c.value = s
            }
        } else if (Array.isArray(v)) {
            c.value = v.map(el => {
                if (typeof el === 'string') {
                    const m = el.match(/^{{\s*([\w:.\-]+)\s*}}$/)
                    if (m) {
                        const key: string | undefined = m[1]

                        if(key == undefined) throw Error(`Expected ${m[1]} to be a string`)

                        const meta = getParamMeta(params, key)
                        const raw = values[key]
                        return meta ? coerceByType(String(raw ?? ''), (meta as any).type) : raw
                    } else {
                        let s = el
                        const keys = extractKeysFromString(el)
                        for (const k of keys) s = replaceInString(s, k, values[k] ?? '')
                        return s
                    }
                }
                return el
            })
        }
    }
    return clone
}

export function resolveSql(sql: SqlFilter | null | undefined, values: Record<string, unknown>): SqlFilter | null {
    if (!sql?.whereSql) return null
    let s = sql.whereSql
    const keys = extractKeysFromString(s)
    for (const k of keys) s = replaceInString(s, k, values[k] ?? '')
    return { whereSql: s }
}

/**
 * Возвращает НОВЫЙ ChartReqTemplateDto, в котором:
 *  - все плейсхолдеры {{key}} в where/sql подставлены,
 *  - типы значений where c {{key}} приведены по SqlParam.type при наличии
 * Остальные поля (entity, timeField, selectedFields и т.д.) — без изменений.
 */
export function resolveTemplate(tpl: ChartReqTemplateDto, typedValuesOrStrings: Record<string, unknown>): ChartReqTemplateDto {
    // @ts-ignore
    const where: FilterClause[] | undefined = (tpl as any).where
    // @ts-ignore
    const sql: SqlFilter | null | undefined = (tpl as any).sql
    // @ts-ignore
    const params: SqlParam[] | undefined = (tpl as any).params

    // Приведём типы там, где значение в where — ровно {{key}}
    const typed: Record<string, unknown> = {}
    const keys = Object.keys(typedValuesOrStrings)
    for (const k of keys) {
        const meta = getParamMeta(params, k)
        const v = typedValuesOrStrings[k]
        typed[k] = (typeof v === 'string' && meta)
            ? coerceByType(v, (meta as any).type)
            : v
    }

    const resolvedWhere = where && where.length ? resolveWhere(where, typed, params) : undefined
    const resolvedSql = resolveSql(sql ?? null, typed) ?? undefined

    return {
        ...(tpl as any),
        where: resolvedWhere,
        sql: resolvedSql,
    } as ChartReqTemplateDto
}

export function isMissingRequired(keys: string[], params: SqlParam[], values: Record<string, string>): boolean {
    return keys.some(k => {
        const meta = getParamMeta(params, k)
        return !!meta?.required && String(values[k] ?? '').trim() === ''
    })
}
