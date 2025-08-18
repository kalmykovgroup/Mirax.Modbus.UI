import React from "react";

interface ErrorScreenProps {
    error?: Error;
}

const ErrorPage : React.FC<ErrorScreenProps> = ({error}) => {
    return (<>
        <div className="error-screen">
            <h1>Something went wrong</h1>
            {error && (
                <div className="error-details">
                    <p>{error.message}</p>
                    <pre>{error.stack}</pre>
                </div>
            )}
            <button onClick={() => window.location.reload()}>
                Reload Application
            </button>
        </div>
    </>)
};

export default ErrorPage;