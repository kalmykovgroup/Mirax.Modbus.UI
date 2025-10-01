// orchestration/context/RequestManagerContext.tsx

import { createContext } from 'react';
import {RequestManager} from "@charts/charts/orchestration/requests/RequestManager.ts";

export const RequestManagerContext = createContext<RequestManager | null>(null);



