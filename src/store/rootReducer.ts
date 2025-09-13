import { combineReducers } from '@reduxjs/toolkit';
import {authApi} from "@shared/api/authApi.ts";
import {scenarioApi} from "@shared/api/scenarioApi.ts";
import userReducer from "@/store/features/user/userSlice.ts";
import authReducer from "@/store/features/user/authSlice.ts";
import {workflowApi} from "@shared/api/workflowApi.ts";

import {branchApi} from "@shared/api/branchApi.ts";
import {stepApi} from "@shared/api/stepApi.ts";
import {stepRelationApi} from "@shared/api/stepRelationApi.ts";
import scenarioSlice from "@/store/features/scenarioSlice.ts";
import workflowSlice from "@/store/features/workflowSlice.ts";
import {chartsApi} from "@/charts/shared/api/chartsApi.ts";
import chartsSlice from "@/charts/store/chartsSlice.ts";
import chartsTemplatesSlice from "@/charts/store/chartsTemplatesSlice.ts";
import {chartReqTemplatesApi} from "@/charts/shared/api/chartReqTemplatesApi.ts";
import chartsMetaSlice from "@/charts/store/chartsMetaSlice.ts";
import {metadataApi} from "@/charts/shared/api/metadataApi.ts";

export const rootReducer = combineReducers({
    // RTK Query хранит кэш ИМЕННО под своим reducerPath
    [authApi.reducerPath]: authApi.reducer,
    [scenarioApi.reducerPath]: scenarioApi.reducer,
    [workflowApi.reducerPath]: workflowApi.reducer,
    [branchApi.reducerPath]: branchApi.reducer,
    [stepApi.reducerPath]: stepApi.reducer,
    [stepRelationApi.reducerPath]: stepRelationApi.reducer,
    [chartsApi.reducerPath]: chartsApi.reducer,
    [chartReqTemplatesApi.reducerPath]: chartReqTemplatesApi.reducer,
    [metadataApi.reducerPath]: metadataApi.reducer,

    charts: chartsSlice,
    chartsMeta: chartsMetaSlice,
    chartsTemplates: chartsTemplatesSlice,
    auth: authReducer ,
    users: userReducer,
    scenario: scenarioSlice,
    workflow: workflowSlice,


});
