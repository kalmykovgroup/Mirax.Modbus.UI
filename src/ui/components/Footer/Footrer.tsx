import styles from './Footer.module.css';
import React from "react";
import Logo from "@/ui/components/Logo/Logo.tsx";

interface FooterProps {
    className?: string;
}

const Footer: React.FC<FooterProps> = ({ className }) => {

    return (
        <div className={`${styles.container} ${className}`}>
            <Logo/>
            <div className={styles.infoBlock}>
                <span>MIRAX <span className={styles.safetyText}>safety</span></span>
                <span>+7 (342) 259 88 55</span>
                <span>info@mirax-safety.com</span>
            </div>
        </div>
    );
};

export default Footer;