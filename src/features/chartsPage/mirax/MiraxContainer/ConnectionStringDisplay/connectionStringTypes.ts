// src/features/mirax/components/ConnectionStringDisplay/connectionStringTypes.ts

/**
 * Тип параметра строки подключения
 */
export type ParamType = 'host' | 'port' | 'database' | 'user' | 'password' | 'other';

/**
 * Категория для визуального отображения
 */
export type ParamCategory = 'primary' | 'secondary' | 'sensitive' | 'other';

/**
 * Распознанный параметр строки подключения
 */
export interface ConnectionParam {
    readonly key: string;
    readonly value: string;
    readonly type: ParamType;
    readonly category: ParamCategory;
    readonly displayKey: string;
}

/**
 * Результат парсинга строки подключения
 */
export interface ParsedConnectionString {
    readonly params: readonly ConnectionParam[];
    readonly dbType: 'postgresql' | 'sqlserver' | 'mysql' | 'oracle' | 'unknown';
}

/**
 * Маппинг известных ключей параметров на их типы
 * Ключи в lowercase для case-insensitive сравнения
 */
const PARAM_TYPE_MAP: Record<string, ParamType> = {
    // Host/Server
    'host': 'host',
    'server': 'host',
    'data source': 'host',
    'datasource': 'host',
    'address': 'host',
    'addr': 'host',

    // Port
    'port': 'port',

    // Database
    'database': 'database',
    'initial catalog': 'database',
    'initialcatalog': 'database',
    'db': 'database',

    // User
    'username': 'user',
    'user': 'user',
    'user id': 'user',
    'userid': 'user',
    'uid': 'user',

    // Password
    'password': 'password',
    'pwd': 'password',
    'pass': 'password',
};

/**
 * Человеко-читаемые названия для типов параметров
 */
const DISPLAY_KEY_MAP: Record<ParamType, string> = {
    'host': 'Host',
    'port': 'Port',
    'database': 'Database',
    'user': 'User',
    'password': 'Password',
    'other': 'Other',
};

/**
 * Определить тип параметра по ключу
 */
function getParamType(key: string): ParamType {
    const normalizedKey = key.toLowerCase().trim();
    return PARAM_TYPE_MAP[normalizedKey] ?? 'other';
}

/**
 * Определить категорию параметра для визуального отображения
 */
function getParamCategory(type: ParamType): ParamCategory {
    switch (type) {
        case 'host':
        case 'database':
            return 'primary';
        case 'port':
            return 'secondary';
        case 'user':
        case 'password':
            return 'sensitive';
        case 'other':
            return 'other';
    }
}

/**
 * Определить тип БД по строке подключения
 */
function detectDbType(connectionString: string): ParsedConnectionString['dbType'] {
    const lower = connectionString.toLowerCase();

    if (lower.includes('host=') && (lower.includes('username=') || lower.includes('user='))) {
        return 'postgresql';
    }

    if (lower.includes('server=') && (lower.includes('user id=') || lower.includes('uid='))) {
        return 'sqlserver';
    }

    if (lower.includes('server=') && lower.includes('port=') && lower.includes('uid=')) {
        return 'mysql';
    }

    if (lower.includes('data source=') && lower.includes('user id=')) {
        return 'oracle';
    }

    return 'unknown';
}

/**
 * Распарсить строку подключения на параметры
 */
export function parseConnectionString(connectionString: string): ParsedConnectionString {
    const params: ConnectionParam[] = [];
    const parts = connectionString.split(';').filter((part) => part.trim().length > 0);

    parts.forEach((part) => {
        const equalIndex = part.indexOf('=');
        if (equalIndex === -1) return;

        const key = part.substring(0, equalIndex).trim();
        const value = part.substring(equalIndex + 1).trim();

        if (key.length === 0) return;

        const type = getParamType(key);
        const category = getParamCategory(type);
        const displayKey = DISPLAY_KEY_MAP[type] ?? key;

        params.push({
            key,
            value,
            type,
            category,
            displayKey,
        });
    });

    const dbType = detectDbType(connectionString);

    return {
        params,
        dbType,
    };
}