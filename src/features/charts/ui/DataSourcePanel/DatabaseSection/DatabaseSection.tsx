import type {Guid} from "@app/lib/types/Guid.ts";

type Database = { id: string; name: string }

export function DatabaseSection({
  databases,
  activeDbId,
  loading,
  error,
  onChange,
  onRefresh,
}: {
  databases: Database[]
  activeDbId?: Guid | undefined
  loading?: boolean | undefined
  error?: string | undefined
  onChange: (dbId: string) => void
  onRefresh: () => void
}) {
  return (
    <section style={{ display: 'grid', gap: 6 }}>
      <label style={{ fontSize: 12, opacity: .85 }}>База данных</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={activeDbId ?? ''}
          onChange={(e) => onChange(e.currentTarget.value)}
          disabled={loading}
        >
          <option value="" disabled>
            {loading ? 'Загрузка…' : 'Выберите базу'}
          </option>
          {databases.map(db => (
            <option key={db.id} value={db.id}>{db.name}</option>
          ))}
        </select>
        <button onClick={onRefresh} disabled={loading}>Обновить</button>
      </div>
      {error && <small style={{ color: 'tomато' }}>{error}</small>}
    </section>
  )
}
