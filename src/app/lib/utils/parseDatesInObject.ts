/**
 * Рекурсивно преобразует строки ISO дат в Date объекты
 */
export function parseDatesInObject(obj: any): any {
    if (obj === null || obj === undefined) return obj
    if (obj instanceof Date) return obj

    if (typeof obj === 'string') {
        const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/
        if (isoDatePattern.test(obj)) {
            const parsed = new Date(obj)
            if (!isNaN(parsed.getTime())) {
                return parsed
            }
        }
        return obj
    }

    if (Array.isArray(obj)) {
        return obj.map(item => parseDatesInObject(item))
    }

    if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                result[key] = parseDatesInObject(obj[key])
            }
        }
        return result
    }

    return obj
}