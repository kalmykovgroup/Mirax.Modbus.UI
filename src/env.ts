// src/shared/config/env.ts

/**
 * Централизованная конфигурация из переменных окружения
 *
 * Vite автоматически загружает файлы в следующем порядке (приоритет):
 * 1. .env.[mode].local (например .env.development.local)
 * 2. .env.[mode] (например .env.development)
 * 3. .env.local
 * 4. .env
 *
 * Режимы (import.meta.env.MODE):
 * - 'development' - при запуске через npm run dev
 * - 'production' - при сборке через npm run build
 */

// ============= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =============

/**
 * Получить строковую переменную с валидацией
 */
function getEnvString(key: keyof ImportMetaEnv, defaultValue: string): string {
    const value = import.meta.env[key];

    if (value === undefined || value === '') {
        console.warn(`[ENV] Missing variable "${key}", using default: "${defaultValue}"`);
        return defaultValue;
    }

    return String(value);
}

/**
 * Получить числовую переменную с валидацией
 */
function getEnvNumber(key: keyof ImportMetaEnv, defaultValue: number): number {
    const value = import.meta.env[key];

    if (value === undefined || value === '') {
        return defaultValue;
    }

    const parsed = Number(value);

    if (isNaN(parsed)) {
        console.error(
            `[ENV] Invalid number for "${key}": "${value}", using default: ${defaultValue}`
        );
        return defaultValue;
    }

    return parsed;
}

/**
 * Получить boolean переменную с валидацией
 */
function getEnvBoolean(key: keyof ImportMetaEnv, defaultValue: boolean): boolean {
    const value = import.meta.env[key];

    if (value === undefined || value === '') {
        return defaultValue;
    }

    const str = String(value).toLowerCase().trim();

    // Поддержка: 'true', '1', 'yes', 'on'
    if (str === 'true' || str === '1' || str === 'yes' || str === 'on') {
        return true;
    }

    // Поддержка: 'false', '0', 'no', 'off'
    if (str === 'false' || str === '0' || str === 'no' || str === 'off') {
        return false;
    }

    console.warn(
        `[ENV] Invalid boolean for "${key}": "${value}", using default: ${defaultValue}`
    );
    return defaultValue;
}

// ============= КОНФИГУРАЦИЯ =============

/**
 * Конфигурация приложения
 *
 * Все значения типобезопасны и имеют defaults
 */
export const ENV = {
    // ========== СИСТЕМНЫЕ ==========

    /** Текущий режим: 'development' | 'production' */
    MODE: import.meta.env.MODE as 'development' | 'production',

    /** true если development режим */
    DEV: import.meta.env.DEV,

    /** true если production режим */
    PROD: import.meta.env.PROD,

    /** Base URL приложения */
    BASE_URL: import.meta.env.BASE_URL,

    // ========== ПРИЛОЖЕНИЕ ==========

    APP_NAME: getEnvString('VITE_APP_NAME', 'MyApp'),
    APP_VERSION: getEnvString('VITE_APP_VERSION', '1.0.0'),

    // ========== API ==========

    API_URL: getEnvString('VITE_API_URL', 'https://localhost:5001'),

    // ========== ГРАФИКИ ==========

    CHART_DEFAULT_CHART_HEIGHT_PX: getEnvNumber('VITE_CHART_DEFAULT_CHART_HEIGHT_PX', 800),
    CHART_MIN_CONTAINER_WIDTH: getEnvNumber('VITE_CHART_MIN_CONTAINER_WIDTH', 640),

    // ========== ДЕБАГ И МОНИТОРИНГ ==========

    ENABLE_DEBUG_LOGS: getEnvBoolean('VITE_ENABLE_DEBUG_LOGS', false),
    ENABLE_PERFORMANCE_MONITORING: getEnvBoolean('VITE_ENABLE_PERFORMANCE_MONITORING', false),
    ENABLE_MOCK_DATA: getEnvBoolean('VITE_ENABLE_MOCK_DATA', false),
    ENABLE_DEVTOOLS: getEnvBoolean('VITE_ENABLE_DEVTOOLS', false),

    //========== MIRAX - ДЕФОЛТНЫЕ ШАБЛОНЫ ==========
    MIRAX_DEFAULT_BASE_TEMPLATE_ID: getEnvString(
        'VITE_MIRAX_DEFAULT_BASE_TEMPLATE_ID',
        '77777777-0000-0000-0000-000000000223'
    ),
    MIRAX_DEFAULT_SENSOR_TEMPLATE_ID: getEnvString(
        'VITE_MIRAX_DEFAULT_SENSOR_TEMPLATE_ID',
        '77777777-0000-0000-0000-000000000222')


} as const;

// ============= ЛОГИРОВАНИЕ =============

/**
 * Логируем конфигурацию при старте (только в dev режиме)
 */
if (ENV.DEV) {
    console.group('🔧 [ENV] Configuration');
    console.log('Mode:', ENV.MODE);
    console.log('API URL:', ENV.API_URL);
    console.log('Debug Logs:', ENV.ENABLE_DEBUG_LOGS);
    console.log('Performance Monitoring:', ENV.ENABLE_PERFORMANCE_MONITORING);
    console.log('Mirax Base Template:', ENV.MIRAX_DEFAULT_BASE_TEMPLATE_ID);
    console.log('Mirax Sensor Template:', ENV.MIRAX_DEFAULT_SENSOR_TEMPLATE_ID);
    console.groupEnd();
}

// ============= ЭКСПОРТЫ =============

/**
 * Хелпер для условной логики в зависимости от режима
 */
export const isDev = ENV.DEV;
export const isProd = ENV.PROD;

/**
 * Хелпер для условного выполнения кода только в dev
 */
export function onlyInDev(callback: () => void): void {
    if (ENV.DEV) {
        callback();
    }
}

/**
 * Хелпер для условного выполнения кода только в prod
 */
export function onlyInProd(callback: () => void): void {
    if (ENV.PROD) {
        callback();
    }
}