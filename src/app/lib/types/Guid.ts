// src/app/lib/types/Guid.ts

/**
 * Тип для UUID/GUID строк
 */
export type Guid = string;

/**
 * Утилита для работы с GUID в стиле C#
 * @example
 * const id: Guid = Guid.NewGuid();
 * if (Guid.IsGuid(value)) { ... }
 */
export const Guid = {
    /**
     * Создаёт новый GUID (v4 UUID)
     * Аналог C# Guid.NewGuid()
     */
    NewGuid: (): Guid => {
        // 1) Нативный crypto.randomUUID (Node 19+, все современные браузеры)
        if (typeof globalThis.crypto?.randomUUID === 'function') {
            return globalThis.crypto.randomUUID().toLowerCase() as Guid;
        }

        // 2) crypto.getRandomValues
        const c: Crypto | undefined = (globalThis as any).crypto ?? (globalThis as any).msCrypto;
        if (c && typeof c.getRandomValues === 'function') {
            const bytes = new Uint8Array(16);
            c.getRandomValues(bytes);

            // Устанавливаем версию (v4) и variant
            const b6 = bytes[6]!;
            const b8 = bytes[8]!;
            bytes[6] = (b6 & 0x0f) | 0x40; // version 4
            bytes[8] = (b8 & 0x3f) | 0x80; // variant 10xx

            const toHex = (n: number) => n.toString(16).padStart(2, '0');
            const hex = Array.from(bytes, toHex).join('');
            return (
                `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
            ).toLowerCase() as Guid;
        }

        // 3) Фоллбэк без crypto (НЕ криптостойкий, только для разработки)
        const guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
            const r = (Math.random() * 16) | 0;
            const v = ch === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
        return guid.toLowerCase() as Guid;
    },

    /**
     * Проверяет, является ли значение валидным GUID
     */
    IsGuid: (v: unknown): v is Guid =>
        typeof v === 'string' &&
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v),

    /**
     * Пустой GUID (00000000-0000-0000-0000-000000000000)
     * Аналог C# Guid.Empty
     */
    Empty: '00000000-0000-0000-0000-000000000000' as Guid,

    /**
     * Проверяет, является ли GUID пустым
     */
    IsEmpty: (guid: Guid): boolean => guid === '00000000-0000-0000-0000-000000000000',

    /**
     * Парсит строку в GUID с валидацией
     * @throws {Error} если строка не является валидным GUID
     */
    Parse: (value: string): Guid => {
        if (
            typeof value !== 'string' ||
            !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value)
        ) {
            throw new Error(`Invalid GUID format: ${value}`);
        }
        return value.toLowerCase() as Guid;
    },

    /**
     * Пытается распарсить строку в GUID
     * @returns GUID или undefined если невалидная строка
     */
    TryParse: (value: string): Guid | undefined => {
        if (
            typeof value !== 'string' ||
            !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value)
        ) {
            return undefined;
        }
        return value.toLowerCase() as Guid;
    },
} as const;

// ============================================================================
// ОБРАТНАЯ СОВМЕСТИМОСТЬ (для старого кода)
// ============================================================================

/**
 * @deprecated Используй Guid.IsGuid()
 */
export const isGuid = Guid.IsGuid;

/**
 * @deprecated Используй Guid.NewGuid()
 */
export const newGuid = Guid.NewGuid;

/**
 * @deprecated Используй Guid.NewGuid()
 */
export const genId = Guid.NewGuid;