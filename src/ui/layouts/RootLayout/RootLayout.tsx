import React from "react";
import style from "@ui/layouts/RootLayout/RootLayout.module.css";
import {ThemeSwitcher} from "@ui/components/ThemeSwitcher/ThemeSwitcher.tsx";
import {useDevice} from "@app/lib/hooks/device/useDevice.ts";
import {useSelector} from "react-redux";
import {selectFormattedLastActive} from "@app/lib/hooks/ui/selectFormattedLastActive.ts";


export const RootLayout = ({ children }: { children: React.ReactNode }) => {

    const { isMobile, isTablet, isDesktop } = useDevice();

    const lastActive = useSelector(selectFormattedLastActive);

    return (
        <div className={style.rootContainer}>
            <div className={style.systemHeader}>
                <ThemeSwitcher/>

                <div>
                    <span>device:</span>
                    {isMobile && <span>mobile</span>}
                    {isTablet && <span>tablet</span>}
                    {isDesktop && <span>desktop</span>}
                </div>
                <div>
                    <span>lastActive:</span><span>{lastActive}</span>
                </div>


            </div>
                {children}
        </div>
    );
}


export default RootLayout;