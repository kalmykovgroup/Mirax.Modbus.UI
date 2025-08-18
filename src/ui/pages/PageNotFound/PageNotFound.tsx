import styles from './PageNotFound.module.css';
import React from "react";

const PageNotFound: React.FC = () => {
    //const { isMobile, isTablet, isDesktop } = useDevice();
    return (
        <div className={styles.container}>
            <p>Page not found</p>
        </div>
    );
};

export default PageNotFound;