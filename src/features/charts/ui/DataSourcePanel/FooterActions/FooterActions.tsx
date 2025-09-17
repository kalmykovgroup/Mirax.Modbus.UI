
export function FooterActions({
  isEdit,
  onUpdate,
  onReset,
  onCreate,
  onApply,
}: {
  isEdit: boolean
  onUpdate: () => void
  onReset: () => void
  onCreate: () => void
  onApply: () => void
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <div>
        {isEdit ? (
          <>
            <button onClick={onUpdate}>Обновить запись</button>
            <button onClick={onReset}>Сбросить шаблон</button>
          </>
        ) : (
          <button onClick={onCreate}>Сохранить шаблон</button>
        )}
      </div>
      <div>
        <button onClick={onApply}>Применить</button>
      </div>
    </div>
  )
}
