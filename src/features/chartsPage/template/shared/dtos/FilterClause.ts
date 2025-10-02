import type {FieldDto} from "@chartsPage/metaData/shared/dtos/FieldDto.ts";
import type {FilterOp} from "@chartsPage/metaData/shared/dtos/types/FilterOp.ts";

export interface FilterClause {
    /** Имя колонки (логическое имя поля из метаданных) */
    field: FieldDto;
    /** Оператор */
    op: FilterOp;
    /** Значение (может быть массивом для in/nin/between) */
    value?: unknown | undefined;
}
