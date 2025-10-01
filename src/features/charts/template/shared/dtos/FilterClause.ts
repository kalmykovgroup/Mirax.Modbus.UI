import type {FieldDto} from "@charts/metaData/shared/dtos/FieldDto.ts";
import type {FilterOp} from "@charts/charts/data/dtos/types/FilterOp.ts";

export interface FilterClause {
    /** Имя колонки (логическое имя поля из метаданных) */
    field: FieldDto;
    /** Оператор */
    op: FilterOp;
    /** Значение (может быть массивом для in/nin/between) */
    value?: unknown | undefined;
}
