import qs from 'qs'

export const serializeParams = (params: unknown) =>
    qs.stringify(params, {
        arrayFormat: 'repeat',      // ?a=1&a=2
        skipNulls: true,            // пропускаем null
        encodeValuesOnly: true,
        serializeDate: (d: Date) => d.toISOString()
    })