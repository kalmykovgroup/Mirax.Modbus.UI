import type {EntityDto} from "@charts/shared/contracts/metadata/Dtos/EntityDto.ts";

export function EntitySection({
  entities,
                                  activeEntityName,
  loading,
  error,
  onChange,
  onRefresh,
  disabled,
}: {
  entities: EntityDto[]
  activeEntityName?: string | undefined
  loading?: boolean | undefined
  error?: string | undefined
  onChange: (entity?: EntityDto) => void
  onRefresh: () => void
  disabled?: boolean
}) {
  return (
    <section style={{ display: 'grid', gap: 6 }}>
      <label style={{ fontSize: 12, opacity: .85 }}>Таблица (entity)</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={activeEntityName}
          onChange={e => onChange(entities.find(entity => entity.name == e.target.value))}
          disabled={loading || disabled || entities.length === 0}
        >
          {(entities).map(n => (
            <option key={n.name} value={n.name}>{n.name}</option>
          ))}
            {entities.length === 0 && <option>{(loading ? 'загрузка…' : '—')}</option>}
        </select>
        <button onClick={onRefresh} disabled={loading || entities.length === 0}>Обновить</button>
      </div>
      {error && <small style={{ color: 'tomato' }}>{error}</small>}
    </section>
  )
}
