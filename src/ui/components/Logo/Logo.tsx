// --- src/widgets/header/ui/Logo/Logo.tsx ---
import styles from './Logo.module.css'
import { Link } from 'react-router-dom'
import {ROUTES} from "@app/constants/routes.ts";
import logoSvg from "@ui/assets/mira-safety-full.svg"
import React from "react";

interface LogoProps {
    width?: number;   // необязательный
    height?: number;  // необязательный
}

/**
 * Компонент логотипа
 * - отображает логотип + ссылку на главную
 */
const Logo: React.FC<LogoProps> = ({ width = 150, height = 62 }) => {
    return (
        <Link to={ROUTES.HOME} className={styles.logo}>
            <img src={logoSvg} alt="MIRA Safety" width={width} height={height} />
        </Link>
    )
}

export default Logo
