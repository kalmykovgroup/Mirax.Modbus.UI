
export function TemplateMetaSection({
  name,
  description,
  onName,
  onDescription,
}: {
  name?: string | undefined
  description?: string | undefined
  onName: (v: string) => void
  onDescription: (v: string) => void
}) {
  return (
    <div>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 12, opacity: .8 }}>Название*</span>
        <input type="text" value={name ?? ''} onChange={e => onName(e.target.value)} />
      </label>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 12, opacity: .8 }}>Описание</span>
        <textarea rows={3} placeholder="Кратко опишите назначение шаблона" value={description ?? ''} onChange={e => onDescription(e.target.value)} />
      </label>
    </div>
  )
}
