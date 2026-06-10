import SignIn from "../components/SignIn";
import { LoadingScreen } from "../shared/Loading";
import { useAdminSession } from "../shared/useAdminSession";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { setDocumentTitle } from "../shared/siteConfig";

function Explorer() {
    const adminSession = useAdminSession();
    const queryClient = useQueryClient();

    useEffect(() => {
        setDocumentTitle("Private Explorer");
    }, []);

    if (!adminSession.isUnlocked && !adminSession.isChecking) {
        return <SignIn isChecking={adminSession.isChecking} isInvalid={adminSession.isInvalid} onUnlock={adminSession.unlock} />;
    }

    if (adminSession.isChecking) {
        return <LoadingScreen label="Checking admin key..." />;
    }

    function lockDashboard() {
        adminSession.lock();
        void queryClient.invalidateQueries({ queryKey: ["admin-session"] });
    }

    return (
        <section className="public-page page-full">
            <div className="template-section">
                <div className="template-section__label">Explorer</div>
                <h1>ARCON API Explorer</h1>
                <p>Admin key verified. The private explorer can render protected media and collection tools here.</p>
                <button onClick={lockDashboard}>Lock dashboard</button>
            </div>
        </section>
    );
}

export default Explorer;
