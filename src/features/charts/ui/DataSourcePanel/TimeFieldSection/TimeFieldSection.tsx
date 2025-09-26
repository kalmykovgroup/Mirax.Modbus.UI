import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";
import { useSelector} from "react-redux";
import {
    selectChartsMetaLoading,
} from "@charts/store/chartsMetaSlice.ts";
import {useEffect, useMemo, useState} from "react";
import {selectActiveTimeField, selectFields, setActiveTemplateTimeField} from "@charts/store/chartsTemplatesSlice.ts";
import {useAppDispatch} from "@/store/hooks.ts";

export function TimeFieldSection() {
    const dispatch = useAppDispatch();

    const loading = useSelector(selectChartsMetaLoading).fields

    const fields = useSelector(selectFields) ?? []

    const [timeField, setTimeFieldLocal] = useState<FieldDto | undefined>(undefined)

    const timeFields: FieldDto[] = useMemo(() => (fields ?? []).filter((f: any) => f?.isTime), [fields])

    const activeField = useSelector(selectActiveTimeField);

    useEffect(() => {
        if (!timeField && timeFields.length) setTimeFieldLocal(timeFields[0])
        if (timeField && !timeFields.includes(timeField)) setTimeFieldLocal(timeFields[0])

        dispatch(setActiveTemplateTimeField(timeField))
    }, [timeFields, timeField])

  return (
    <section style={{ display: 'grid', gap: 6 }}>
      <label style={{ fontSize: 12, opacity: .85 }}>Поле времени (ось X)</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={activeField?.name ?? ''}
          onChange={e => setTimeFieldLocal(timeFields.find(f => f.name === e.target.value))}
          disabled={loading || timeFields.length === 0}
        >
          {(timeFields).map(tf => (
            <option key={tf.name} value={tf.name}>{tf.name}</option>
          ))}
            {timeFields.length === 0 && <option>{(loading ? 'загрузка…' : '—')}</option>}
        </select>
      </div>
    </section>
  )
}
