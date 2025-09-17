import type {FilterOp} from "@charts/shared/contracts/chart/Types/FilterOp.ts";

export interface FilterClause {
    /** Имя колонки (логическое имя поля из метаданных) */
    field: string;
    /** Оператор */
    op: FilterOp;
    /** Значение (может быть массивом для in/nin/between) */
    value?: unknown | undefined;
}
