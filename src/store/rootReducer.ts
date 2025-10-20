import { combineReducers } from '@reduxjs/toolkit';

// RTK Query reducers
import { authApi } from '@login/shared/api/authApi';
import { scenarioApi } from '@/features/scenarioEditor/shared/api/scenarioApi';
import { workflowApi } from '@/features/scenarioEditor/shared/api/workflowApi';
import { branchApi } from '@/features/scenarioEditor/shared/api/branchApi';
import { stepApi } from '@/features/scenarioEditor/shared/api/stepApi';
import { stepRelationApi } from '@/features/scenarioEditor/shared/api/stepRelationApi';

// обычные слайсы
import { authReducer } from '@login/store/authSlice';
import userReducer from '@/features/user/store/userSlice';
import { scenarioReducer } from '@scenario/store/scenarioSlice';
import { workflowReducer } from '@scenario/store/workflowSlice';
import {uiReducer} from "@/store/uiSlice.ts";
import {chartsSettingsReducer} from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import {chartsMetaReducer} from "@chartsPage/metaData/store/chartsMetaSlice.ts";
import {metadataApi} from "@chartsPage/metaData/shared/api/metadataApi.ts";
import {chartsTemplatesReducer} from "@chartsPage/template/store/chartsTemplatesSlice.ts";
import {chartReqTemplatesApi} from "@chartsPage/template/shared//api/chartReqTemplatesApi.ts";
import {chartsApi} from "@chartsPage/charts/core/api/chartsApi.ts";
import {miraxApi} from "@chartsPage/mirax/miraxApi.ts";
import {miraxReducer} from "@chartsPage/mirax/miraxSlice.ts";

import {tabsReducer} from "@chartsPage/charts/core/store/tabsSlice.ts";
import {persistedChartsReducer} from "@chartsPage/charts/core/store/chartsSlice.ts";
export const rootReducer = combineReducers({
    // Persisted slices
    auth: authReducer,
    users: userReducer,
    chartsTemplates: chartsTemplatesReducer,
    scenario: scenarioReducer,
    workflow: workflowReducer,
    chartsSettings: chartsSettingsReducer,

    contexts: persistedChartsReducer,
    // In-memory
    chartsMeta: chartsMetaReducer,

    ui: uiReducer,
    //Mirax
    mirax: miraxReducer,
    tabs: tabsReducer,

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

    //Mirax
    [miraxApi.reducerPath]: miraxApi.reducer,
});
