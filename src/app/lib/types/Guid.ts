// src/app/lib/types/Guid.ts
export type Guid = string;

export const isGuid = (v: unknown): v is Guid =>
    typeof v === 'string' &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);

export const newGuid = (): Guid => {
    // 1) Нативно
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID().toLowerCase() as Guid;
    }

    // 2) getRandomValues
    const c: Crypto | undefined = (globalThis as any).crypto ?? (globalThis as any).msCrypto;
    if (c && typeof c.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        c.getRandomValues(bytes);

        // версионируем (v4) и variant — индексы гарантированно существуют
        const b6 = bytes[6]!;
        const b8 = bytes[8]!;
        bytes[6] = (b6 & 0x0f) | 0x40;
        bytes[8] = (b8 & 0x3f) | 0x80;

        const toHex = (n: number) => n.toString(16).padStart(2, '0');
        const hex = Array.from(bytes, toHex).join('');
        return (
            `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
        ).toLowerCase() as Guid;
    }

    // 3) Фоллбэк без crypto (не криптостойкий)
    const guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
        const r = (Math.random() * 16) | 0;
        const v = ch === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
    return guid.toLowerCase() as Guid;
};

// совместимость со старым именем
export const genId = newGuid;
