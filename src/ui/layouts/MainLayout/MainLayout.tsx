import {Outlet} from "react-router-dom";
import React from "react";
import style from './MainLayout.module.css';
import Header from "@/ui/components/Header/Header.tsx";
import Footer from "@/ui/components/Footer/Footrer.tsx";
import TopNav from "@ui/components/TopNav/TopNav.tsx";
const MainLayout: React.FC = () => {
    return (
        <div className={style.mainLayout}>
            <Header />

             <TopNav/>
             <main className={style.mainContainer}>
                <Outlet />
             </main>
            <Footer/>
       </div>
    );
};

export default MainLayout;