
import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";
import React from "react";


export function FieldsSection({
  fields,
  selected,
  loading,
  error,
  onToggle,
  onSelectNumeric,
  onClear,
}: {
  fields: FieldDto[]
  selected: FieldDto[]
  loading: boolean
  error?: string | undefined
  onToggle: (field: FieldDto) => void
  onSelectNumeric: () => void
  onClear: () => void
}) {

    const selectedKeys = React.useMemo(
        () => new Set((selected ?? []).map(f => f.name)),
        [selected]
    )
  return (

    <section style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: 12, opacity: .85 }}>Поля (выбранные — строим/фильтруем)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onSelectNumeric} disabled={loading || fields.length === 0}>Только numeric</button>
          <button onClick={onClear} disabled={loading || fields.length === 0}>Очистить</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, border: '1px solid #333', borderRadius: 6, minHeight: 44 }}>
        {loading && <span style={{ fontSize: 12, opacity: .7 }}>загрузка…</span>}
        {!loading && fields.length === 0 && <span style={{ fontSize: 12, opacity: .7 }}>нет полей</span>}
        {!loading && fields.map(f => {
            const checked = selectedKeys.has(f.name)
          return (
            <label key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 6px', border: '1px solid #444', borderRadius: 6, fontSize: 12 }}>
              <input type="checkbox" checked={checked} onChange={() => onToggle(f)} />
              <span>{f.name}</span>
              <span style={{ opacity: .6 }}>{f.isTime ? ' ⏱' : f.isNumeric ? ' #️⃣' : ''}</span>
            </label>
          )
        })}
      </div>
      {error && <small style={{ color: 'tomato' }}>{error}</small>}
    </section>
  )
}
