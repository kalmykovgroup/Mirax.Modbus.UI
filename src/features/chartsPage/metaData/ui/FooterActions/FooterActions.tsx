
import {useSelector} from "react-redux";


import {useAppDispatch} from "@/store/hooks.ts";
import {
    clearBoundActiveTemplate,
    createChartReqTemplate,
    selectActiveTemplate, updateChartReqTemplate,
} from "@chartsPage/template/store/chartsTemplatesSlice.ts";
import type {
    UpdateChartReqTemplateRequest
} from "@chartsPage/template/shared//dtos/requests/UpdateChartReqTemplateRequest.ts";
import type {
    CreateChartReqTemplateRequest
} from "@chartsPage/template/shared//dtos/requests/CreateChartReqTemplateRequest.ts";

export function FooterActions( ) {
    const dispatch = useAppDispatch();
    const template = useSelector(selectActiveTemplate);

    const validate = () => {
        const missing: string[] = []
        if (!template.database) missing.push('База данных')
        if (!template.entity) missing.push('Таблица (entity)')
        if (!template.timeField) missing.push('Поле времени (timeField)')
        if (!template.name?.length) missing.push('Имя')
        if (missing.length) { alert(`Заполните: ${missing.join(', ')}`); return false }
        return true
    }

    const updateTemplate = () => {
        if (!template.id) { alert('Не выбран шаблон для обновления'); return }
        if (!validate()) return

        dispatch(updateChartReqTemplate({...template} as UpdateChartReqTemplateRequest))
    }

    const createTemplate = () => {
        if (!validate()) return
        const dto: CreateChartReqTemplateRequest = {
            id: template.id!,
            name: template.name!,
            description: template.description,
            databaseId: template.databaseId!,
            entity: template.entity!,
            timeField: template.timeField!,
            selectedFields: template.selectedFields ?? [],
            where:  template.where,
            params: template.params,
            sql: template.sql,
        }
        dispatch(createChartReqTemplate(dto))
    }


  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <div>
        {template.id != undefined ? (
          <>
            <button onClick={() => updateTemplate()}>Обновить запись</button>
            <button onClick={() => dispatch(clearBoundActiveTemplate())}>Сбросить шаблон</button>
          </>
        ) : (
          <button onClick={() => createTemplate()}>Сохранить шаблон</button>
        )}
      </div>
    </div>
  )
}
