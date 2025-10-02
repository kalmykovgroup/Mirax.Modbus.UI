import React, { useState } from 'react';
import s from './CollapsibleSection.module.css';
import Collapse from "@chartsPage/components/Collapse/Collapse.tsx";

export default function CollapsibleSection({
    children,
    defaultState = false,
    label,
    className
}: {
    children: React.ReactNode;
    defaultState?: boolean | undefined;
    label?: string | undefined | React.ReactNode;
    className? : string | undefined
}   ) {
    const [open, setOpen] = useState(defaultState);

    return (
        <section className={`${className} ${s.wrap}`}>
            <button
                type="button"
                className={s.toggle}
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                aria-controls="settings-panel"
            >
                {open ? (
                       <>
                           {label}
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                               <polyline points="6 9 12 15 18 9"></polyline>
                           </svg>
                       </>
                ) : (

                    <>
                        {label}
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </>
                )}
            </button>

            <Collapse open={open} duration={220} className={s.panel} >
                {children}
            </Collapse>
        </section>
    );
}
