import type {SqlParamType} from "@charts/template/shared/dtos/SqlParamType.ts";
import type {FieldDto} from "@charts/metaData/shared/dtos/FieldDto.ts";

export interface SqlParam {
    /** Ключ плейсхолдера в шаблоне ({{key}}) */
    key: string;
    /** Значение по умолчанию (перекрывается sqlValues[key]) */
    value?: unknown | undefined;
    /** Подсказка/описание для UI */
    description?: string | undefined;
    /** Имя поля из метаданных (чтобы вывести тип автоматически) */
    field?: FieldDto | undefined;
    /** Явный тип параметра (приоритетнее, чем field) */
    type?: SqlParamType | undefined;
    /** Требовать значение на исполнении */
    required?: boolean | undefined;

    defaultValue?: unknown | undefined;
}
