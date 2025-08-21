import styles from './Header.module.css';
import React from "react";
import Logo from "@ui/components/Logo/Logo.tsx";
import LogoutButton from "@ui/components/LogoutButton/LogoutButton.tsx";
import {ThemeSwitcher} from "@ui/components/ThemeSwitcher/ThemeSwitcher.tsx";

interface HeaderProps {
    className?: string;
}

const Header: React.FC<HeaderProps> = ({ className }) => {

    return (
        <header className={`${styles.container} ${className}`}>
            <Logo/>
            <div></div>
            <ThemeSwitcher/>
            <LogoutButton/>
        </header>
    );
};

export default Header;