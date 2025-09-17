

// Достаём БД из стора
import type {RootState} from "@/store/types.ts";
import {type EditChartReqTemplate, setApplyTemplate} from "@charts/store/chartsMetaSlice.ts";
import {store} from "@/store/store.ts";
import type {DatabaseDto} from "@charts/shared/contracts/metadata/Dtos/DatabaseDto.ts";
import {metadataApi} from "@charts/shared/api/metadataApi.ts";
import type {Guid} from "@app/lib/types/Guid.ts";
import type {ChartReqTemplateDto} from "@charts/shared/contracts/chartTemplate/Dtos/ChartReqTemplateDto.ts";
export const selectDbById = (state: RootState, id?: Guid) =>
    (id ? state.chartsMeta.databasesById?.[id] : undefined)

/**
 * Инициатор без thunk: гарантирует наличие Database в tpl (заполняет или бросает исключение),
 * затем диспатчит чистый редьюсер.
 */
export async function applyTemplateNoThunk(tpl: ChartReqTemplateDto) {
    const state = store.getState() as RootState

    // 1) Определяем id базы: из tpl.database?.id либо из tpl.databaseId
    const dbId = tpl?.database?.id ?? tpl?.databaseId
    if (!dbId) {
        throw new Error('Template.databaseId is required (tpl.database is null and template has no databaseId)')
    }

    // 2) Если database уже заполнено и id совпадает — используем как есть
    if (tpl.database?.id === dbId) {
        store.dispatch(setApplyTemplate(tpl))
        return
    }

    // 3) Иначе ищем БД в сторе
    let db: DatabaseDto | undefined = selectDbById(state, dbId)

    // 4) Если в сторе нет — принудительно подтягиваем список БД через RTK Query
    if (!db) {
        const sub = store.dispatch(
            metadataApi.endpoints.getDatabases.initiate(undefined, { forceRefetch: true })
        )
        try {
            await sub.unwrap()
        } finally {
            sub.unsubscribe()
        }
        db = selectDbById(store.getState() as RootState, dbId)
    }

    // 6) Если БД так и не нашли — бросаем исключение (жёстко, как ты просил)
    if (!db) {
        console.log(state.chartsMeta.databasesById)
        throw new Error(`Database not found for id=${dbId}`)
    }

    // 7) Заполняем tpl.database и синхронно кладём в стор
    const enrichedTpl: EditChartReqTemplate = {
        ...tpl,
        databaseId: db.id,
        database: db,
    }
    store.dispatch(setApplyTemplate(enrichedTpl))
}