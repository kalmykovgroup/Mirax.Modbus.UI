// GET /api/user/exists?email=test@example.com&fullName=Ivan&role=Admin
// В контроллере получишь:
// request.filters["email"]     => test@example.com
// request.filters["fullName"]  => Ivan
// request.filters["role"]      => Admin
// Для этого нужен [ModelBinder(BinderType = typeof(QueryDictionaryModelBinder))]

export interface UserExistsRequest {
    filters: Record<string, string>;
}