import type {FilterOp} from "@charts/shared/contracts/chart/Types/FilterOp.ts";
import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";

export interface FilterClause {
    /** Имя колонки (логическое имя поля из метаданных) */
    field: FieldDto;
    /** Оператор */
    op: FilterOp;
    /** Значение (может быть массивом для in/nin/between) */
    value?: unknown | undefined;
}
