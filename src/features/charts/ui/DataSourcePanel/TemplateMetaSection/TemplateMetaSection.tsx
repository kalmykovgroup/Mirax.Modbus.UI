
import {useSelector} from "react-redux";
import {selectTemplate, setActiveTemplateDesc, setActiveTemplateName} from "@charts/store/chartsTemplatesSlice.ts";
import {useAppDispatch} from "@/store/hooks.ts";

export function TemplateMetaSection( ) {

    const dispatch = useAppDispatch();

    const template = useSelector(selectTemplate);
  return (
    <div>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 12, opacity: .8 }}>Название*</span>
        <input type="text" value={template.name ?? ''} onChange={e => dispatch(setActiveTemplateName(e.target.value))} />
      </label>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 12, opacity: .8 }}>Описание</span>
        <textarea rows={3} placeholder="Кратко опишите назначение шаблона" value={template.description ?? ''} onChange={e => dispatch(setActiveTemplateDesc((e.target.value)))} />
      </label>
    </div>
  )
}
