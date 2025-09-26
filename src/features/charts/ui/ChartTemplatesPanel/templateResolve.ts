import type { ChartReqTemplateDto } from '@charts/shared/contracts/chartTemplate/Dtos/ChartReqTemplateDto'
import type { FilterClause } from '@charts/shared/contracts/chartTemplate/Dtos/FilterClause'
import type { SqlFilter } from '@charts/shared/contracts/chartTemplate/Dtos/SqlFilter'
import type { SqlParam } from '@charts/shared/contracts/chartTemplate/Dtos/SqlParam'

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


/** Поиск меты параметра по ключу (оставляем как есть) */
export function getParamMeta(params: SqlParam[] | undefined, key: string): SqlParam | undefined {
    return (params ?? []).find(p => (p?.key ?? '').trim() === key.trim())
}

/** Приведение значения по типу колонки из param.field.type.
 * Поддерживает скалярные типы и массивы (например, "text", "int", "timestamptz", "text[]", "int[]").
 */
export function coerceByFieldType(raw: unknown, fieldType?: string): unknown {
    if (raw == null) return raw

    const t = (fieldType ?? '').toLowerCase().trim()
    const isArray = t.endsWith('[]')
    const base = isArray ? t.slice(0, -2) : t

    const coerceScalar = (val: unknown): unknown => {
        if (val == null) return val
        const s = typeof val === 'string' ? val.trim() : String(val)

        if (['int', 'integer', 'smallint', 'bigint', 'int4', 'int8'].includes(base)) {
            const n = parseInt(s, 10); return Number.isFinite(n) ? n : val
        }
        if (['double', 'float', 'float8', 'real', 'float4', 'numeric', 'decimal'].includes(base)) {
            const n = Number(s.replace(',', '.')); return Number.isFinite(n) ? n : val
        }
        if (['bool', 'boolean'].includes(base)) {
            const v = s.toLowerCase()
            return (v === 'true' || v === '1' || v === 'yes' || v === 'y' || v === 'on')
        }
        // uuid/text/string/date/timestamp/timestamptz — оставляем строкой
        return typeof val === 'string' ? val : s
    }

    if (!isArray) {
        return coerceScalar(raw)
    }

    // массивы: принимаем либо строку "a,b;c", либо реальный массив
    const toArray = (v: unknown): string[] => {
        if (Array.isArray(v)) return v.map(x => (x == null ? '' : String(x)))
        if (typeof v === 'string') {
            return v.split(/[,;]+/).map(x => x.trim()).filter(x => x.length > 0)
        }
        return [String(v)]
    }

    return toArray(raw).map(coerceScalar)
}

/** Готовим шаблон для сервера: НЕ трогаем where/sql, только заполняем params[].value по values[key]. */
export function resolveTemplateForServer(
    tpl: ChartReqTemplateDto,
    values: Record<string, unknown>
): ChartReqTemplateDto {
    // @ts-ignore
    const params: SqlParam[] | undefined = (tpl as any).params

    const filledParams: SqlParam[] | undefined = params?.map(p => {
        const key = (p?.key ?? '').trim()
        const raw = values[key]
        return {
            ...p,
            value: coerceByFieldType(raw, p?.field?.type)   // тип берём из p.field.type
        }
    })

    // ВАЖНО: where и sql — без изменений
    return {
        ...(tpl as any),
        params: filledParams
    } as ChartReqTemplateDto
}

/** Валидация обязательных параметров (до отправки на сервер). */
export function missingRequiredParams(
    params: SqlParam[] | undefined,
    values: Record<string, unknown>
): string[] {
    const missing: string[] = []
    for (const p of (params ?? [])) {
        if (p?.required) {
            const v = values[p.key]
            if (v == null || String(v).trim() === '') missing.push(p.key)
        }
    }
    return missing
}





export function isMissingRequired(keys: string[], params: SqlParam[], values: Record<string, string>): boolean {
    return keys.some(k => {
        const meta = getParamMeta(params, k)
        return !!meta?.required && String(values[k] ?? '').trim() === ''
    })
}
