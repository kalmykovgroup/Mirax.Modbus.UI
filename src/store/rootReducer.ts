import { combineReducers } from '@reduxjs/toolkit';

// RTK Query reducers
import { authApi } from '@login/shared/api/authApi';
import { scenarioApi } from '@/features/scenarioEditor/shared/api/scenarioApi';
import { workflowApi } from '@/features/scenarioEditor/shared/api/workflowApi';
import { branchApi } from '@/features/scenarioEditor/shared/api/branchApi';
import { stepApi } from '@/features/scenarioEditor/shared/api/stepApi';
import { stepRelationApi } from '@/features/scenarioEditor/shared/api/stepRelationApi';
import { chartsApi } from '@charts/shared/api/chartsApi';
import { chartReqTemplatesApi } from '@charts/shared/api/chartReqTemplatesApi';
import { metadataApi } from '@charts/shared/api/metadataApi';

// обычные слайсы
import { authReducer } from '@login/store/authSlice';
import userReducer from '@/features/user/store/userSlice';
import { chartsTemplatesReducer } from '@charts/store/chartsTemplatesSlice';
import { scenarioReducer } from '@scenario/store/scenarioSlice';
import { workflowReducer } from '@scenario/store/workflowSlice';
import { chartsReducer } from '@charts/store/chartsSlice';
import { chartsMetaReducer } from '@charts/store/chartsMetaSlice';
import {uiReducer} from "@/store/uiSlice.ts";
import {chartsSettingsReducer} from "@charts/store/chartsSettingsSlice.ts";
// ВАЖНО: никаких самодельных _persist, только реальные редьюсеры

export const rootReducer = combineReducers({
    // Persisted slices
    auth: authReducer,
    users: userReducer,
    chartsTemplates: chartsTemplatesReducer,
    scenario: scenarioReducer,
    workflow: workflowReducer,
    chartsSettings: chartsSettingsReducer,

    // In-memory
    charts: chartsReducer,
    chartsMeta: chartsMetaReducer,

    ui: uiReducer,

    // RTK Query
    [authApi.reducerPath]: authApi.reducer,
    [scenarioApi.reducerPath]: scenarioApi.reducer,
    [workflowApi.reducerPath]: workflowApi.reducer,
    [branchApi.reducerPath]: branchApi.reducer,
    [stepApi.reducerPath]: stepApi.reducer,
    [stepRelationApi.reducerPath]: stepRelationApi.reducer,
    [chartsApi.reducerPath]: chartsApi.reducer,
    [chartReqTemplatesApi.reducerPath]: chartReqTemplatesApi.reducer,
    [metadataApi.reducerPath]: metadataApi.reducer,
});
