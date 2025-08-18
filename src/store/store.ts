import { configureStore } from "@reduxjs/toolkit";
import { rootReducer } from "./rootReducer";
import { persistStore } from "redux-persist";
import {authApi} from "@shared/api/authApi.ts";
import {scenarioApi} from "@shared/api/scenarioApi.ts";

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
            immutableCheck: false,
        }).concat(
            authApi.middleware,
            scenarioApi.middleware
        ),
})


export const persistor = persistStore(store);
