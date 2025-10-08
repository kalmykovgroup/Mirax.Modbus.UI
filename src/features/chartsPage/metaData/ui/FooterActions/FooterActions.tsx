import {useSelector} from "react-redux";
import {useAppDispatch} from "@/store/hooks.ts";
import {
    clearBoundActiveTemplate,
    createChartReqTemplate,
    selectActiveTemplate,
    updateChartReqTemplate,
} from "@chartsPage/template/store/chartsTemplatesSlice.ts";
import type {
    UpdateChartReqTemplateRequest
} from "@chartsPage/template/shared/dtos/requests/UpdateChartReqTemplateRequest.ts";
import type {
    CreateChartReqTemplateRequest
} from "@chartsPage/template/shared/dtos/requests/CreateChartReqTemplateRequest.ts";
import {selectActiveDatabase} from "@chartsPage/template/store/chartsTemplatesSlice.ts";

export function FooterActions() {
    const dispatch = useAppDispatch();
    const template = useSelector(selectActiveTemplate);
    const activeDatabase = useSelector(selectActiveDatabase);

    const validate = () => {
        const missing: string[] = [];
        if (!template.database) missing.push('База данных');
        if (!template.entity) missing.push('Таблица (entity)');
        if (!template.timeField) missing.push('Поле времени (timeField)');
        if (!template.name?.trim()) missing.push('Имя');
        if (missing.length) {
            alert(`Заполните: ${missing.join(', ')}`);
            return false;
        }

        // Проверка на дубликат имени в рамках текущей БД
        const existingTemplates = activeDatabase?.chartReqTemplates ?? [];
        const isDuplicate = existingTemplates.some(t =>
            t.name.trim().toLowerCase() === template.name?.trim().toLowerCase() &&
            t.id !== template.id // исключаем сам шаблон при update
        );

        if (isDuplicate) {
            alert(`Шаблон с именем "${template.name}" уже существует для этой базы данных.\nВыберите другое имя.`);
            return false;
        }

        return true;
    };

    const updateTemplate = () => {
        if (!template.id) {
            alert('Не выбран шаблон для обновления');
            return;
        }
        if (!validate()) return;

        dispatch(updateChartReqTemplate({...template} as UpdateChartReqTemplateRequest));
    };

    const createTemplate = () => {
        if (!validate()) return;

        dispatch(createChartReqTemplate({ ...template } as CreateChartReqTemplateRequest));
    };

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
    );
}