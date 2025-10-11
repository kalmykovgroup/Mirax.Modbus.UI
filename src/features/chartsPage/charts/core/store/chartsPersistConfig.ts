import { persistReducer } from 'redux-persist';
import { contextsReducer } from '@chartsPage/charts/core/store/chartsSlice';
import localforage from "localforage";




const chartsDB = localforage.createInstance({
    name: 'ChartsDB',
    storeName: 'charts_data',
    description: 'Cached chart tiles data'
});

const chartsPersistConfig = {
    key: 'charts',
    storage: chartsDB,
    version: 2, // Увеличиваем версию чтобы сбросить старые данные'
    whitelist: [],
    throttle: 2000,
    debug: true,
};

export const persistedChartsReducer = persistReducer(
    chartsPersistConfig,
    contextsReducer
);

