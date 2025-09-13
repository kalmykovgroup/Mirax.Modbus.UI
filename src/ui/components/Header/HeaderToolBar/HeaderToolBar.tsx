import styles from './HeaderToolBar.module.css';
import React from "react";
import {useSelector} from "react-redux";
import {selectIsAuthenticated} from "@login/store/authSlice.ts";
import LogoutButton from "@ui/components/LogoutButton/LogoutButton.tsx";
import {LoginButton} from "@ui/components/LoginButton/LoginButton.tsx";
import ThemeSwitcher from "@ui/components/ThemeSwitcher/ThemeSwitcher.tsx";

interface HeaderProps {
    className?: string | undefined;
}

const HeaderToolBar: React.FC<HeaderProps> = ({ className }) => {
    const isAuthenticated = useSelector(selectIsAuthenticated)
    return (
        <header className={`${styles.container} ${className}`}>
            {isAuthenticated && <LogoutButton/>}
            {!isAuthenticated && <LoginButton/>}
            <ThemeSwitcher/>
        </header>
    );
};

export default HeaderToolBar;