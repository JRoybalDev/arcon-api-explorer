import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FiArrowLeft, FiDatabase, FiImage, FiLogOut, FiRefreshCw, FiSettings, FiTrash2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import SignIn from "../components/SignIn";
import { apiClient } from "../shared/apiClient";
import { LoadingScreen } from "../shared/Loading";
import { setDocumentTitle } from "../shared/siteConfig";
import { useAdminSession } from "../shared/useAdminSession";

type SettingsAction = "populate" | "unpopulate" | "missing-thumbnails" | "regenerate-thumbnails";

const actionLabels: Record<SettingsAction, string> = {
  populate: "Populate database",
  unpopulate: "Unpopulate database",
  "missing-thumbnails": "Generate missing thumbnails",
  "regenerate-thumbnails": "Delete all thumbnails and regenerate"
};

export function ExplorerSettings() {
  const adminSession = useAdminSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");

  useEffect(() => {
    setDocumentTitle("Explorer Settings");
  }, []);

  const actionMutation = useMutation({
    mutationFn: async (action: SettingsAction) => {
      if (action === "unpopulate" && !window.confirm("Unpopulate the indexed explorer database?")) {
        return null;
      }

      if (action === "regenerate-thumbnails" && !window.confirm("Delete all generated thumbnails and regenerate them?")) {
        return null;
      }

      if (action === "populate") {
        return apiClient.explorer.populate(adminSession.adminKey);
      }

      if (action === "unpopulate") {
        return apiClient.explorer.unpopulate(adminSession.adminKey);
      }

      if (action === "missing-thumbnails") {
        return apiClient.explorer.generateMissingThumbnails(adminSession.adminKey);
      }

      return apiClient.explorer.regenerateThumbnails(adminSession.adminKey);
    },
    onMutate: (action) => {
      setStatus(`${actionLabels[action]} started...`);
    },
    onSuccess: (result, action) => {
      if (result === null) {
        setStatus("");
        return;
      }

      if (action === "unpopulate" && result && typeof result === "object" && "folders" in result && "media" in result) {
        setStatus(`Unpopulated ${String(result.media)} media item${result.media === 1 ? "" : "s"} and ${String(result.folders)} folder${result.folders === 1 ? "" : "s"}.`);
      } else {
        setStatus(`${actionLabels[action]} started.`);
      }
      void invalidateExplorerQueries();
    },
    onError: (error) => {
      setStatus(error instanceof Error ? error.message : "Settings action failed.");
    }
  });

  function invalidateExplorerQueries() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ["explorer-folders", adminSession.adminKey] }),
      queryClient.invalidateQueries({ queryKey: ["explorer-contents", adminSession.adminKey] })
    ]);
  }

  function signOut() {
    adminSession.lock();
    void queryClient.invalidateQueries({ queryKey: ["admin-session"] });
    navigate("/");
  }

  if (!adminSession.isUnlocked && !adminSession.isChecking) {
    return <SignIn isChecking={adminSession.isChecking} isInvalid={adminSession.isInvalid} onUnlock={adminSession.unlock} />;
  }

  if (adminSession.isChecking) {
    return <LoadingScreen label="Checking admin key..." />;
  }

  const isBusy = actionMutation.isPending;

  return (
    <section className="explorer-shell explorer-shell--settings page-full">
      <main className="explorer-settings" aria-label="Explorer settings">
        <header className="explorer-settings__header">
          <button className="explorer-icon-button" type="button" onClick={() => navigate("/")} title="Back to explorer" aria-label="Back to explorer">
            <FiArrowLeft aria-hidden />
          </button>
          <div>
            <span>
              <FiSettings aria-hidden /> Settings
            </span>
            <h1>Explorer Settings</h1>
          </div>
        </header>

        <div className="explorer-settings__actions">
          <button type="button" disabled={isBusy} onClick={() => actionMutation.mutate("populate")}>
            <FiDatabase aria-hidden />
            <span>Populate database</span>
          </button>
          <button type="button" disabled={isBusy} onClick={() => actionMutation.mutate("unpopulate")}>
            <FiTrash2 aria-hidden />
            <span>Unpopulate database</span>
          </button>
          <button type="button" disabled={isBusy} onClick={() => actionMutation.mutate("missing-thumbnails")}>
            <FiImage aria-hidden />
            <span>Generate missing thumbnails</span>
          </button>
          <button type="button" disabled={isBusy} onClick={() => actionMutation.mutate("regenerate-thumbnails")}>
            <FiRefreshCw aria-hidden />
            <span>Delete all thumbnails and regenerate</span>
          </button>
        </div>

        {status ? <p className="explorer-settings__status" role="status">{status}</p> : null}

        <footer className="explorer-settings__footer">
          <button type="button" onClick={signOut}>
            <FiLogOut aria-hidden />
            <span>Sign out</span>
          </button>
        </footer>
      </main>
    </section>
  );
}
