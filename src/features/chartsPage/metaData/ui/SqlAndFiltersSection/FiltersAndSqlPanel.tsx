import * as React from 'react';

import { SqlEditor } from './SqlEditor';
import {WhereEditor} from "@chartsPage/metaData/ui/SqlAndFiltersSection/WhereEditor/WhereEditor.tsx";
import ParamsEditor from "@chartsPage/metaData/ui/SqlAndFiltersSection/ParamsEditor/ParamsEditor.tsx";


export function FiltersAndSqlPanel(): React.JSX.Element {


    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <WhereEditor/>

            <ParamsEditor/>

            <SqlEditor />
        </div>
    );
}