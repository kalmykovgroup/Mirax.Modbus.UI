import type {Guid} from "@app/lib/types/Guid.ts";

export interface UpdateScriptUsingFeatureRequest {
    id: Guid;
    /** Полное имя типа, по которому определяем сборку (Reference). Например: "System.Net.Http.HttpClient". */
    typeName: string;
    /** Namespace (пространство имён), который будет добавлен как using. Например: "System.Net.Http". */
    namespace: string;
    /** Описание для UI (подсказка пользователю). */
    description?: string | null;
    /** Порядок отображения в UI. */
    order: number;
}
