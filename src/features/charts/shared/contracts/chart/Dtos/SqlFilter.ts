import type {SqlParam} from "@charts/shared/contracts/chart/Dtos/SqlParam.ts";

export interface SqlFilter {
    /** WHERE-фрагмент с плейсхолдерами {{key}} (без слова WHERE) */
    whereSql: string;
    /** Описание параметров шаблона */
    params?: SqlParam[] | undefined;
    /** Разрешить «как есть» (без грубой валидации опасных токенов) */
    trusted?: boolean | undefined;
}