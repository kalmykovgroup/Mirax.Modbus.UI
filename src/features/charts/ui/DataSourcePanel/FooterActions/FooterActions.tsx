
import {useSelector} from "react-redux";
import type {
    UpdateChartReqTemplateRequest
} from "@charts/shared/contracts/chartTemplate/Dtos/Request/UpdateChartReqTemplateRequest.ts";
import type {
    CreateChartReqTemplateRequest
} from "@charts/shared/contracts/chartTemplate/Dtos/Request/CreateChartReqTemplateRequest.ts";
import {
    clearBoundActiveTemplate,
    createChartReqTemplate,
    selectTemplate,
    updateChartReqTemplate
} from "@charts/store/chartsTemplatesSlice.ts";
import {useAppDispatch} from "@/store/hooks.ts";

export function FooterActions( ) {
    const dispatch = useAppDispatch();
    const template = useSelector(selectTemplate);

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
