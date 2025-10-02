
// @ts-ignore
export enum SqlParamType {
    Text = 'text',
    String = 'string',          // синоним Text
    Int = 'int',
    Bigint = 'bigint',
    Double = 'double',
    Numeric = 'numeric',        // синоним Double
    Bool = 'bool',
    Uuid = 'uuid',
    Date = 'date',
    Timestamp = 'timestamp',
    Timestamptz = 'timestamptz',
}

// Удобно для <select>
export const SQL_PARAM_TYPE_OPTIONS: { value: SqlParamType; label: string }[] = [
    { value: SqlParamType.Text,        label: 'text' },
    { value: SqlParamType.String,      label: 'string' },
    { value: SqlParamType.Int,         label: 'int' },
    { value: SqlParamType.Bigint,      label: 'bigint' },
    { value: SqlParamType.Double,      label: 'double' },
    { value: SqlParamType.Numeric,     label: 'numeric' },
    { value: SqlParamType.Bool,        label: 'bool' },
    { value: SqlParamType.Uuid,        label: 'uuid' },
    { value: SqlParamType.Date,        label: 'date' },
    { value: SqlParamType.Timestamp,   label: 'timestamp' },
    { value: SqlParamType.Timestamptz, label: 'timestamptz' },
];

// (опционально) Узкий литеральный тип строки из enum
export type SqlParamTypeLiteral = `${SqlParamType}`;