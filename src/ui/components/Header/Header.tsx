import styles from './Header.module.css';
import React from "react";
import Logo from "@ui/components/Logo/Logo.tsx";
import HeaderToolBar from "@ui/components/Header/HeaderToolBar/HeaderToolBar.tsx";
import {useSelector} from "react-redux";
import {selectIsAuthenticated, selectUsername} from "@login/store/authSlice.ts";
import {useTheme} from "@app/providers/theme/useTheme.ts";

interface HeaderProps {
    className?: string | undefined;
}

const Header: React.FC<HeaderProps> = ({ className }) => {
    const { theme } = useTheme();
    const isAuthenticated = useSelector(selectIsAuthenticated)
    const username = useSelector(selectUsername)

    return (
        <header className={`${styles.container} ${className}`} data-theme={theme}>
            {isAuthenticated && (
                <div className={styles.username}>
                    <span>{username}</span>
                </div>
            )}
            <Logo/>
            <HeaderToolBar className={styles.headerToolBar}/>
        </header>
    );
};

export default Header;