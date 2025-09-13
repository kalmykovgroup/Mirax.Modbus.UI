import type {SqlParamType} from "@charts/shared/contracts/chart/Dtos/SqlParamType.ts";

export interface SqlParam {
    /** Ключ плейсхолдера в шаблоне ({{key}}) */
    key: string;
    /** Значение по умолчанию (перекрывается sqlValues[key]) */
    value?: unknown | undefined;
    /** Подсказка/описание для UI */
    description?: string | undefined;
    /** Имя поля из метаданных (чтобы вывести тип автоматически) */
    field?: string | undefined;
    /** Явный тип параметра (приоритетнее, чем field) */
    type?: SqlParamType | undefined;
    /** Требовать значение на исполнении */
    required?: boolean | undefined;
}
