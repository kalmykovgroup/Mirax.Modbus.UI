// orchestration/context/RequestManagerContext.tsx

import { createContext } from 'react';
import {RequestManager} from "@chartsPage/charts/orchestration/requests/RequestManager.ts";

export const RequestManagerContext = createContext<RequestManager | null>(null);



