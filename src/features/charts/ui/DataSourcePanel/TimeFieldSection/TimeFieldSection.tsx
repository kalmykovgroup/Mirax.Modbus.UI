import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";

export function TimeFieldSection({
  timeFields,
  activeField,
  setTimeFieldActive,
  loading,
  onRefresh,
  canRefresh,
}: {
  timeFields: FieldDto[]
  activeField?: FieldDto | undefined
    setTimeFieldActive: (v?: FieldDto) => void
  loading: boolean
  onRefresh: () => void
  canRefresh?: boolean
}) {
  return (
    <section style={{ display: 'grid', gap: 6 }}>
      <label style={{ fontSize: 12, opacity: .85 }}>Поле времени (ось X)</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={activeField?.name ?? ''}
          onChange={e => setTimeFieldActive(timeFields.find(f => f.name === e.target.value))}
          disabled={loading || timeFields.length === 0}
        >
          {(timeFields).map(tf => (
            <option key={tf.name} value={tf.name}>{tf.name}</option>
          ))}
            {timeFields.length === 0 && <option>{(loading ? 'загрузка…' : '—')}</option>}
        </select>
        <button onClick={onRefresh} disabled={loading || !canRefresh}>Обновить поля</button>
      </div>
    </section>
  )
}
