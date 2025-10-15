// @ts-ignore
export enum RegisterType {
    /** Катушка (Coil) — битовое значение (0 или 1), доступное для чтения и записи */
    Coil = 'Coil',

    /** Дискретный вход (Discrete Input) — битовое значение (0 или 1), доступное только для чтения */
    DiscreteInput = 'DiscreteInput',

    /** Холдинг-регистр (Holding Register) — 16-битный регистр, доступный для чтения и записи */
    HoldingRegister = 'HoldingRegister',

    /** Входной регистр (Input Register) — 16-битный регистр, доступный только для чтения */
    InputRegister = 'InputRegister',
}
