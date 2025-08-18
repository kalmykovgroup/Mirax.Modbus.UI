import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const useRouteChange = (callback: (path: string, type: string) => void) => {
    const location = useLocation();
    const navigationType = useNavigationType();  // "PUSH", "POP" или "REPLACE"

    useEffect(() => {
        callback(location.pathname, navigationType);
    }, [location.pathname, navigationType, callback]);
};

export default useRouteChange;
