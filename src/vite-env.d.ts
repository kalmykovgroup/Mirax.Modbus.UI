/// <reference types="vite/client" />

// ============= ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ =============

interface ImportMetaEnv {
    // Основные
    readonly VITE_APP_NAME: string;
    readonly VITE_APP_VERSION: string;

    // API
    readonly VITE_API_URL: string;
    readonly VITE_CHARTS_URL: string;

    // Настройки графиков
    readonly VITE_DEFAULT_CHART_PX: string;
    readonly VITE_MIN_CONTAINER_WIDTH: string;

    // Дебаг и мониторинг
    readonly VITE_ENABLE_DEBUG_LOGS: string;
    readonly VITE_ENABLE_PERFORMANCE_MONITORING: string;
    readonly VITE_ENABLE_MOCK_DATA: string;
    readonly VITE_ENABLE_DEVTOOLS: string;

    //Mirax - дефолтные шаблоны
    readonly VITE_MIRAX_DEFAULT_BASE_TEMPLATE_ID: string;
    readonly VITE_MIRAX_DEFAULT_SENSOR_TEMPLATE_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// ============= CSS МОДУЛИ =============

/**
 * Типизация для CSS модулей (*.module.css)
 */
declare module '*.module.css' {
    const classes: { readonly [key: string]: string };
    export default classes;
}

/**
 * Типизация для обычных CSS файлов (*.css)
 */
declare module '*.css' {
    const css: string;
    export default css;
}

/**
 * Типизация для SCSS модулей (*.module.scss)
 */
declare module '*.module.scss' {
    const classes: { readonly [key: string]: string };
    export default classes;
}

/**
 * Типизация для обычных SCSS файлов (*.scss)
 */
declare module '*.scss' {
    const scss: string;
    export default scss;
}

// ============= ИЗОБРАЖЕНИЯ =============

/**
 * Типизация для изображений
 */
declare module '*.svg' {
    const content: string;
    export default content;
}

declare module '*.png' {
    const content: string;
    export default content;
}

declare module '*.jpg' {
    const content: string;
    export default content;
}

declare module '*.jpeg' {
    const content: string;
    export default content;
}

declare module '*.gif' {
    const content: string;
    export default content;
}

declare module '*.webp' {
    const content: string;
    export default content;
}

declare module '*.ico' {
    const content: string;
    export default content;
}

// ============= ДРУГИЕ РЕСУРСЫ =============

/**
 * Типизация для JSON файлов
 */
declare module '*.json' {
    const value: any;
    export default value;
}

/**
 * Типизация для Web Workers
 */
declare module '*?worker' {
    const workerConstructor: {
        new (): Worker;
    };
    export default workerConstructor;
}

declare module '*?worker&inline' {
    const workerConstructor: {
        new (): Worker;
    };
    export default workerConstructor;
}