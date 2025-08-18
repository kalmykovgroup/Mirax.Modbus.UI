import {Outlet} from "react-router-dom";
import React from "react";
import style from './MainLayout.module.css';
import Header from "@/ui/components/Header/Header.tsx";
import Footer from "@/ui/components/Footer/Footrer.tsx";
const MainLayout: React.FC = () => {
    //const { isMobile, isTablet, isDesktop } = useDevice();
    return (
        <div className={style.container}>
            <Header className={style.headerContainer}/>
             <main className={style.mainContainer}>
                <Outlet /> {/* Здесь рендерятся дочерние маршруты */}
             </main>
            <Footer className={style.footerContainer}/>
       </div>
    );
};

export default MainLayout;