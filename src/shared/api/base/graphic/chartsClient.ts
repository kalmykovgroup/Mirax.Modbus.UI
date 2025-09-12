import axios from 'axios'
import axiosRetry from 'axios-retry'
import {serializeParams} from "@shared/api/base/paramsSerializer.ts";
import {API_TIMEOUT} from "@shared/api/base/config.ts";
import {retryConfig} from "@shared/api/base/retryConfig.ts";

const chartsClientUrl = () => import.meta.env.VITE_CHARTS_URL ?? 'https://localhost:7040'

export const chartsClient = axios.create({
    baseURL: chartsClientUrl(),
    withCredentials: true,
    paramsSerializer: serializeParams,
    timeout: API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Client-Type': 'web',
        'X-Db': 'mirax'
    },
})

axiosRetry(chartsClient, retryConfig)



