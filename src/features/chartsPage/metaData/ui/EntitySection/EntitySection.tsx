
import { useSelector} from "react-redux";

import {useAppDispatch} from "@/store/hooks.ts";
import {fetchEntities, selectChartsMetaLoading, selectErrors} from "@chartsPage/metaData/store/chartsMetaSlice.ts";
import {
    selectActiveEntity,
    selectEntities,
    setActiveTemplateEntity
} from "@chartsPage/template/store/chartsTemplatesSlice.ts";

export function EntitySection( ) {
    const dispatch = useAppDispatch();

    const entities = useSelector(selectEntities) ?? []

    const loading = useSelector(selectChartsMetaLoading).entities
    const error = useSelector(selectErrors).entities
    const activeEntity = useSelector(selectActiveEntity)

    const onChange = (name : string) => {

        dispatch(setActiveTemplateEntity(entities.find(entity => entity.name == name)))
    }



  return (
    <section style={{ display: 'grid', gap: 6 }}>
      <label style={{ fontSize: 12, opacity: .85 }}>Таблица (entity)</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={activeEntity?.name}
          onChange={e => onChange(e.target.value)}
          disabled={loading || entities.length === 0}
        >
          {(entities).map(n => (
            <option key={n.name} value={n.name}>{n.name}</option>
          ))}
            {entities.length === 0 && <option>{(loading ? 'загрузка…' : '—')}</option>}
        </select>
        <button onClick={() => dispatch(fetchEntities())} disabled={loading || entities.length === 0}>Обновить</button>
      </div>
      {error && <small style={{ color: 'tomato' }}>{error}</small>}
    </section>
  )
}
