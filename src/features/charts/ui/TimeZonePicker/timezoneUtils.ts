// charts/ui/TimeZonePicker/timezoneUtils.ts

import type { TimeSettings } from '@charts/store/chartsSettingsSlice';

/**
 * Универсальный парсер в Date | undefined
 */
export function toDate(v?: Date | string | number): Date | undefined {
    if (v == null) return undefined;
    if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
}

/**
 * Для <input type="datetime-local"> → "YYYY-MM-DDTHH:mm" с учетом временной зоны
 */
export function toLocalInputValue(dtLike?: Date | string | number, timeSettings?: TimeSettings): string {
    const dt = toDate(dtLike);
    if (!dt) return '';

    const pad = (n: number) => String(n).padStart(2, '0');

    // Если используется UTC - показываем UTC время
    if (timeSettings?.useTimeZone && timeSettings?.timeZone === 'UTC') {
        const y = dt.getUTCFullYear();
        const m = pad(dt.getUTCMonth() + 1);
        const day = pad(dt.getUTCDate());
        const hh = pad(dt.getUTCHours());
        const mm = pad(dt.getUTCMinutes());
        return `${y}-${m}-${day}T${hh}:${mm}`;
    }

    // Иначе показываем локальное время браузера
    const y = dt.getFullYear();
    const m = pad(dt.getMonth() + 1);
    const day = pad(dt.getDate());
    const hh = pad(dt.getHours());
    const mm = pad(dt.getMinutes());
    return `${y}-${m}-${day}T${hh}:${mm}`;
}

/**
 * Парсим значение из datetime-local с учетом временной зоны
 */
export function fromLocalInputValue(v: string, timeSettings?: TimeSettings): Date | undefined {
    if (!v) return undefined;
    const [datePart, timePart] = v.split('T');
    if (!datePart || !timePart) return undefined;
    const [y, m, d] = datePart.split('-').map(Number);
    const [hh, mm] = timePart.split(':').map(Number);

    // Если UTC - создаем дату как UTC
    if (timeSettings?.useTimeZone && timeSettings?.timeZone === 'UTC') {
        return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0));
    }

    // Иначе создаем локальную дату
    return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

/**
 * Форматирует дату с учетом временной зоны для отображения
 * ИСПРАВЛЕНО: добавлена проверка валидности даты
 */
export function formatDateWithTimezone(
    date: Date | string | number | undefined | null,
    settings: TimeSettings,
    options?: Intl.DateTimeFormatOptions
): string {
    // Преобразуем в Date если нужно
    const dt = toDate(date as any);

    // Проверка на валидность даты
    if (!dt || isNaN(dt.getTime())) {
        console.warn('[formatDateWithTimezone] Invalid date:', date);
        return '';
    }

    const formatOptions: Intl.DateTimeFormatOptions = {
        timeZone: settings.useTimeZone ? settings.timeZone : undefined,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        ...options
    };

    try {
        return new Intl.DateTimeFormat('ru-RU', formatOptions).format(dt);
    } catch (error) {
        console.error('[formatDateWithTimezone] Error formatting date:', error, { date: dt, settings });
        return '';
    }
}

/**
 * Преобразует дату для отправки на сервер в UTC
 */
export function prepareDateForRequest(
    date: Date,
    settings: TimeSettings
): Date {
    // Если преобразование выключено или зона UTC - возвращаем как есть
    if (!settings.useTimeZone || settings.timeZone === 'UTC') {
        return date;
    }

    // Получаем компоненты даты в локальной временной зоне браузера
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ms = date.getMilliseconds();

    // Интерпретируем эти компоненты как время в целевой временной зоне
    // и получаем соответствующее UTC время
    const targetDate = new Date(
        new Date(Date.UTC(year, month, day, hours, minutes, seconds, ms))
            .toLocaleString('en-US', { timeZone: settings.timeZone })
    );

    // Вычисляем разницу между оригинальной датой и целевой
    const offset = date.getTime() - targetDate.getTime();

    // Применяем смещение для получения корректного UTC
    return new Date(date.getTime() + offset);
}

/**
 * Более простой и надежный способ преобразования с использованием временных строк
 */
export function prepareDateForRequestSimple(
    date: Date,
    settings: TimeSettings
): Date {
    // Если преобразование выключено или зона UTC - возвращаем как есть
    if (!settings.useTimeZone || settings.timeZone === 'UTC') {
        return date;
    }

    // Получаем локальные компоненты даты
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    // Создаем строку даты без временной зоны
    const dateString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

    // Парсим эту строку как UTC (добавляя Z)
    // Это интерпретирует локальное время как UTC
    return new Date(dateString + 'Z');
}

/**
 * Преобразует диапазон дат для отправки на сервер
 */
export function prepareDateRangeForRequest(
    from: Date | undefined,
    to: Date | undefined,
    settings: TimeSettings
): {
    from: Date | undefined;
    to: Date | undefined;
} {
    console.log('[prepareDateRangeForRequest] Input:', {
        from: from?.toString(),
        to: to?.toString(),
        settings
    });

    // Если не используем преобразование или уже UTC - возвращаем как есть
    if (!settings.useTimeZone || settings.timeZone === 'UTC') {
        console.log('[prepareDateRangeForRequest] No conversion needed (UTC or disabled)');
        return { from, to };
    }

    // Используем простой метод преобразования
    const convertedFrom = from ? prepareDateForRequestSimple(from, settings) : undefined;
    const convertedTo = to ? prepareDateForRequestSimple(to, settings) : undefined;

    console.log('[prepareDateRangeForRequest] Output:', {
        from: convertedFrom?.toISOString(),
        to: convertedTo?.toISOString()
    });

    return {
        from: convertedFrom,
        to: convertedTo
    };
}

/**
 * Получает смещение от UTC для даты в виде строки "+3" или "-5"
 */
export function getUTCOffsetString(date: Date): string {
    const offsetMinutes = -date.getTimezoneOffset();
    const offsetHours = offsetMinutes / 60;

    if (offsetHours === 0) {
        return '+0';
    }

    if (offsetHours % 1 !== 0) {
        const hours = Math.floor(Math.abs(offsetHours));
        const minutes = Math.abs(offsetMinutes % 60);
        const sign = offsetHours > 0 ? '+' : '-';
        return `${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
    }

    return offsetHours > 0 ? `+${offsetHours}` : `${offsetHours}`;
}

/**
 * Получает полную строку UTC с смещением
 */
export function getUTCOffsetFormatted(date: Date): string {
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(offsetMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;

    const offsetString = `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    return `UTC (${offsetString})`;
}

/**
 * Получает название временной зоны с смещением
 */
export function getTimezoneWithOffset(
    timezone: string,
    date: Date = new Date()
): string {
    if (timezone === 'UTC') {
        return 'UTC (+00:00)';
    }

    try {
        // Форматируем дату в указанной зоне чтобы получить смещение
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            timeZoneName: 'longOffset'
        });

        const parts = formatter.formatToParts(date);
        const offset = parts.find(p => p.type === 'timeZoneName')?.value || '';

        if (offset && offset.includes('GMT')) {
            const match = offset.match(/GMT([+-]\d{1,2}:?\d{0,2})/);
            if (match) {
                return `${timezone} (${match[1]})`;
            }
        }

        return timezone;
    } catch (e) {
        return timezone;
    }
}

/**
 * Получает смещение временной зоны из настроек
 */
export function getTimezoneOffsetFromSettings(timeSettings: TimeSettings): string {
    if (!timeSettings.useTimeZone) return '';

    const timezone = timeSettings.timeZone;

    if (timezone === 'UTC') {
        return '+00:00';
    }

    try {
        const now = new Date();

        // Форматируем время в целевой зоне и UTC
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        });

        const utcFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'UTC',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        });

        const tzTime = formatter.format(now);
        const utcTime = utcFormatter.format(now);

        // Парсим часы и минуты
        const [tzHours, tzMinutes] = tzTime.split(':').map(Number);
        const [utcHours, utcMinutes] = utcTime.split(':').map(Number);

        if (!tzHours || !tzMinutes || !utcHours || !utcMinutes) {
            return '';
        }

        // Вычисляем разницу в минутах
        let diffMinutes = (tzHours * 60 + tzMinutes) - (utcHours * 60 + utcMinutes);

        // Корректируем если разница больше 12 часов (переход через сутки)
        if (diffMinutes > 720) diffMinutes -= 1440;
        if (diffMinutes < -720) diffMinutes += 1440;

        const sign = diffMinutes >= 0 ? '+' : '-';
        const absMinutes = Math.abs(diffMinutes);
        const hours = Math.floor(absMinutes / 60);
        const minutes = absMinutes % 60;

        return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
        console.error('Error calculating timezone offset:', error);
        return '';
    }
}