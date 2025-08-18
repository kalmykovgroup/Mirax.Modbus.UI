import { combineReducers } from '@reduxjs/toolkit';
import {authApi} from "@shared/api/authApi.ts";
import {scenarioApi} from "@shared/api/scenarioApi.ts";
import userReducer from "@/store/features/user/userSlice.ts";
import authReducer from "@/store/features/user/authSlice.ts";
export const rootReducer = combineReducers({
    // RTK Query хранит кэш ИМЕННО под своим reducerPath
    [authApi.reducerPath]: authApi.reducer,
    [scenarioApi.reducerPath]: scenarioApi.reducer,

    auth: authReducer ,
    users: userReducer,

});
