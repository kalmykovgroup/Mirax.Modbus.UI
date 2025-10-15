import axios from 'axios'
import axiosRetry from 'axios-retry'
import {serializeParams} from "@shared/api/base/paramsSerializer.ts";
import {API_TIMEOUT} from "@shared/api/base/config.ts";
import {retryConfig} from "./retryConfig.ts";

import { ENV } from '@/env';
const chartsClientUrl = () => ENV.CHARTS_URL

export const chartsClient = axios.create({
    baseURL: chartsClientUrl(),
    withCredentials: true,
    paramsSerializer: serializeParams,
    timeout: API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Client-Type': 'web',
    },
})

axiosRetry(chartsClient, retryConfig)



