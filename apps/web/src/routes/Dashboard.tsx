import { SiteDraftSchema, type Site, type SiteBranding, type SiteDraft, type SiteDraftInput, type Upload } from "@fullstack-template/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion, type Transition } from "framer-motion";
import { type CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import { type FieldPath, useFieldArray, useForm } from "react-hook-form";
import {
  FiChevronDown,
  FiExternalLink,
  FiFileText,
  FiGrid,
  FiHelpCircle,
  FiImage,
  FiLink,
  FiLock,
  FiLogOut,
  FiMenu,
  FiMonitor,
  FiMoon,
  FiPlus,
  FiSave,
  FiSliders,
  FiSettings,
  FiSun,
  FiTrash2,
  FiUsers,
  FiX
} from "react-icons/fi";
import { Link } from "react-router-dom";
import { authClient } from "../shared/authClient";
import { apiClient, type AdminUser } from "../shared/apiClient";
import { setDocumentTitle, siteConfig } from "../shared/siteConfig";
import { useDraftStore } from "../state/draftStore";
import { type ThemeMode, useThemeMode } from "../state/themeStore";

const defaultDraft: SiteDraftInput = {
  slug: "home",
  title: "A sharp new site",
  description: "Edit this content in the dashboard and publish it to the public page.",
  heroImageUrl: "",
  metadata: {
    seoTitle: "",
    seoDescription: "",
    ogImageUrl: "",
    frontendAsideMode: "static"
  },
  branding: {
    backgroundColor: "#f7f7f2",
    lightBackgroundColor: "#f7f7f2",
    darkBackgroundColor: "#111418",
    lightSurfaceColor: "#ffffff",
    darkSurfaceColor: "#191f27",
    lightSurfaceMutedColor: "#f8fafc",
    darkSurfaceMutedColor: "#202833",
    lightSurfaceAccentColor: "#eef6f7",
    darkSurfaceAccentColor: "#16333a",
    lightBorderColor: "#deded2",
    darkBorderColor: "#2c3440",
    lightBorderStrongColor: "#c9c9bd",
    darkBorderStrongColor: "#435061",
    lightBorderAccentColor: "#c7dde0",
    darkBorderAccentColor: "#2b6871",
    lightSurfaceDangerColor: "#fff1f1",
    darkSurfaceDangerColor: "#3a2020",
    lightBorderDangerColor: "#f1c5c5",
    darkBorderDangerColor: "#6f3535",
    lightTextColor: "#18212f",
    darkTextColor: "#e8edf3",
    lightHeadingColor: "#101828",
    darkHeadingColor: "#f7fafc",
    lightMutedColor: "#536173",
    darkMutedColor: "#aab6c5",
    lightNavColor: "#445064",
    darkNavColor: "#c6d0dd",
    lightAccentColor: "#006d77",
    darkAccentColor: "#55c8d6",
    lightAccentStrongColor: "#005f69",
    darkAccentStrongColor: "#9de4ec",
    lightAccentTextColor: "#193926",
    darkAccentTextColor: "#d6fbef",
    lightButtonPrimaryColor: "#635bff",
    darkButtonPrimaryColor: "#7c73ff",
    lightButtonPrimaryTextColor: "#ffffff",
    darkButtonPrimaryTextColor: "#ffffff",
    lightButtonSecondaryColor: "#eef6f7",
    darkButtonSecondaryColor: "#202833",
    lightButtonSecondaryTextColor: "#005f69",
    darkButtonSecondaryTextColor: "#9de4ec",
    lightButtonSecondaryBorderColor: "#c7dde0",
    darkButtonSecondaryBorderColor: "#435061",
    lightDangerColor: "#b42318",
    darkDangerColor: "#ff9b8f",
    lightNavActiveColor: "#e7f0e8",
    darkNavActiveColor: "#18382f",
    lightTopbarColor: "#f7f7f2",
    darkTopbarColor: "#111418",
    surfaceColor: "#ffffff",
    textColor: "#18212f",
    headingColor: "#101828",
    accentColor: "#006d77"
  },
  links: [{ label: "Contact", href: "https://example.com", kind: "primary" }],
  published: true
};

type DashboardTabId = "start" | "overview" | "layout" | "metadata" | "branding" | "links" | "users" | "records" | "uploads" | "help";
type DashboardGroupId = "site" | "library" | "support";

type DashboardTab = {
  id: DashboardTabId;
  label: string;
  icon: typeof FiFileText;
};

type DashboardGroup = {
  id: DashboardGroupId;
  label: string;
  tabs: DashboardTab[];
};

const dashboardGroups: DashboardGroup[] = [
  {
    id: "site",
    label: "Site workspace",
    tabs: [
      { id: "start", label: "Start Guide", icon: FiHelpCircle },
      { id: "overview", label: "Overview", icon: FiSettings },
      { id: "layout", label: "Layout", icon: FiGrid },
      { id: "metadata", label: "Metadata", icon: FiSliders },
      { id: "branding", label: "Branding", icon: FiImage },
      { id: "links", label: "Links", icon: FiLink },
      { id: "users", label: "Users", icon: FiUsers }
    ]
  },
  {
    id: "library",
    label: "Library",
    tabs: [
      { id: "records", label: "Records", icon: FiFileText },
      { id: "uploads", label: "Uploads", icon: FiImage }
    ]
  },
  {
    id: "support",
    label: "Support",
    tabs: [{ id: "help", label: "Help", icon: FiHelpCircle }]
  }
];

const dashboardTabs = dashboardGroups.flatMap((group) => group.tabs);
const defaultDashboardGroup = dashboardGroups[0]!;
const defaultDashboardTab = dashboardTabs[0]!;
const navEase = [0.22, 1, 0.36, 1] as const;
const themeOptions: Array<{ mode: ThemeMode; label: string; icon: typeof FiSun }> = [
  { mode: "light", label: "Light theme", icon: FiSun },
  { mode: "dark", label: "Dark theme", icon: FiMoon },
  { mode: "system", label: "Use system theme", icon: FiMonitor }
];

function normalizeDraft(draft?: SiteDraftInput | null): SiteDraftInput {
  return {
    ...defaultDraft,
    ...draft,
    metadata: {
      ...defaultDraft.metadata,
      ...draft?.metadata
    },
    branding: {
      ...defaultDraft.branding,
      ...draft?.branding
    },
    links: draft?.links ?? defaultDraft.links
  };
}

export function Dashboard() {
  const queryClient = useQueryClient();
  const adminKey = useDraftStore((state) => state.adminKey);
  const setAdminKey = useDraftStore((state) => state.setAdminKey);
  const clearAdminKey = useDraftStore((state) => state.clearAdminKey);
  const cachedDraft = useDraftStore((state) => state.draft);
  const setDraft = useDraftStore((state) => state.setDraft);
  const prefersReducedMotion = useReducedMotion();
  const [activeTabId, setActiveTabId] = useState<DashboardTabId>("start");
  const [openGroupId, setOpenGroupId] = useState<DashboardGroupId>("site");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const betterAuthSession = authClient.useSession();
  const hasBetterAuthSession = Boolean(betterAuthSession.data?.session);
  const hasAdminKey = adminKey.length > 0;
  const currentUser = betterAuthSession.data?.user;

  useEffect(() => {
    setDocumentTitle(siteConfig.dashboardPageName);
  }, []);

  const session = useQuery({
    queryKey: ["admin-session", adminKey, hasBetterAuthSession],
    queryFn: () => apiClient.admin.verifySession(adminKey),
    enabled: hasAdminKey || hasBetterAuthSession,
    retry: false
  });

  const authConfig = useQuery({
    queryKey: ["auth-config"],
    queryFn: apiClient.auth.config
  });

  const form = useForm<SiteDraftInput, unknown, SiteDraft>({
    resolver: zodResolver(SiteDraftSchema),
    defaultValues: normalizeDraft(cachedDraft)
  });

  const links = useFieldArray({
    control: form.control,
    name: "links"
  });

  const activeTab = useMemo(() => dashboardTabs.find((tab) => tab.id === activeTabId) ?? defaultDashboardTab, [activeTabId]);
  const activeGroup = useMemo(
    () => dashboardGroups.find((group) => group.tabs.some((tab) => tab.id === activeTab.id)) ?? defaultDashboardGroup,
    [activeTab.id]
  );

  const navLayoutTransition: Transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.24, ease: navEase };
  const navPanelTransition: Transition = prefersReducedMotion
    ? { duration: 0 }
    : {
        height: { duration: 0.28, ease: navEase },
        opacity: { duration: 0.18, ease: "easeOut" },
        y: { duration: 0.2, ease: navEase }
      };

  useEffect(() => {
    setOpenGroupId(activeGroup.id);
  }, [activeGroup.id]);

  useEffect(() => {
    document.body.style.overflow = isMobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileNavOpen]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      setDraft(value as SiteDraftInput);
      setSaveMessage("");
    });
    return () => subscription.unsubscribe();
  }, [form, setDraft]);

  useEffect(() => {
    if (!form.getValues("metadata.frontendAsideMode")) {
      form.setValue("metadata.frontendAsideMode", "static", { shouldDirty: false });
    }
  }, [form]);

  const sites = useQuery({
    queryKey: ["admin-sites"],
    queryFn: () => apiClient.admin.listSites(adminKey),
    enabled: session.isSuccess
  });

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiClient.admin.listUsers(adminKey),
    enabled: session.isSuccess
  });

  const uploads = useQuery({
    queryKey: ["uploads"],
    queryFn: () => apiClient.uploads.list(adminKey),
    enabled: session.isSuccess
  });

  const saveSite = useMutation({
    mutationFn: (draft: SiteDraft) => apiClient.admin.saveSite(adminKey, draft),
    onSuccess: (site) => {
      setSaveMessage(`Saved ${site.title}.`);
      void queryClient.invalidateQueries({ queryKey: ["admin-sites"] });
      void queryClient.invalidateQueries({ queryKey: ["sites"] });
    }
  });

  const uploadAsset = useMutation({
    mutationFn: (file: File) => apiClient.uploads.create(adminKey, file),
    onSuccess: (upload) => {
      setUploadMessage(`Uploaded ${upload.filename}.`);
      void queryClient.invalidateQueries({ queryKey: ["uploads"] });
      if (upload.thumbnailUrl || upload.url) {
        form.setValue("heroImageUrl", upload.thumbnailUrl || upload.url, { shouldDirty: true });
      }
    }
  });

  const replaceUpload = useMutation({
    mutationFn: (input: { uploadId: string; file: File }) => apiClient.uploads.replace(adminKey, input.uploadId, input.file),
    onSuccess: (upload) => {
      setUploadMessage(`Replaced ${upload.filename}.`);
      void queryClient.invalidateQueries({ queryKey: ["uploads"] });
    }
  });

  const deleteUpload = useMutation({
    mutationFn: (uploadId: string) => apiClient.uploads.delete(adminKey, uploadId),
    onSuccess: (upload) => {
      setUploadMessage(`Deleted ${upload.filename}.`);
      void queryClient.invalidateQueries({ queryKey: ["uploads"] });
    }
  });

  const createUser = useMutation({
    mutationFn: (input: { name: string; email: string; password: string; role: "admin" | "user" }) => apiClient.admin.createUser(adminKey, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
  });

  const updateUserRole = useMutation({
    mutationFn: (input: { userId: string; role: "admin" | "user" }) => apiClient.admin.updateUserRole(adminKey, input.userId, { role: input.role }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-users"] })
  });

  const banUser = useMutation({
    mutationFn: (input: { userId: string; banReason?: string }) => apiClient.admin.banUser(adminKey, input.userId, { banReason: input.banReason }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-users"] })
  });

  const unbanUser = useMutation({
    mutationFn: (userId: string) => apiClient.admin.unbanUser(adminKey, userId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-users"] })
  });

  const setUserPassword = useMutation({
    mutationFn: (input: { userId: string; newPassword: string }) => apiClient.admin.setUserPassword(adminKey, input.userId, { newPassword: input.newPassword }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-users"] })
  });

  const revokeUserSessions = useMutation({
    mutationFn: (userId: string) => apiClient.admin.revokeUserSessions(adminKey, userId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-users"] })
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => apiClient.admin.deleteUser(adminKey, userId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-users"] })
  });

  const selectedSite = form.watch();
  const totalLinks = selectedSite.links?.length ?? 0;
  const publishedCount = sites.data?.filter((site) => site.published).length ?? 0;

  async function lockDashboard() {
    clearAdminKey();
    if (hasBetterAuthSession) {
      await authClient.signOut();
    }
    void queryClient.invalidateQueries({ queryKey: ["admin-session"] });
  }

  if (!session.isSuccess) {
    return (
      <DashboardAccessGate
        isChecking={session.isLoading || betterAuthSession.isPending}
        isInvalid={session.isError}
        onBetterAuthChange={() => void queryClient.invalidateQueries({ queryKey: ["admin-session"] })}
        signupMode={authConfig.data?.signupMode ?? "private"}
        onUnlock={(code) => setAdminKey(code)}
      />
    );
  }

  function selectTab(tabId: DashboardTabId, shouldCloseMobileNav = false) {
    setActiveTabId(tabId);
    if (shouldCloseMobileNav) {
      setIsMobileNavOpen(false);
    }
  }

  function resetToDefaults() {
    form.reset(normalizeDraft());
    setSaveMessage("");
  }

  function loadSite(site: Site) {
    form.reset(normalizeDraft({
      slug: site.slug,
      title: site.title,
      description: site.description,
      heroImageUrl: site.heroImageUrl,
      metadata: site.metadata,
      branding: site.branding,
      links: site.links,
      published: site.published
    }));
    setActiveTabId("overview");
    setSaveMessage("");
  }

  function renderDashboardNav(shouldCloseMobileNav = false) {
    return (
      <nav className="dashboard-nav" aria-label="Dashboard sections">
        <LayoutGroup>
          {dashboardGroups.map((group) => {
            const isOpen = openGroupId === group.id;
            const isActiveGroup = group.id === activeGroup.id;

            return (
              <motion.section
                className={["dashboard-nav__group", isOpen ? "dashboard-nav__group--open" : "", isActiveGroup ? "dashboard-nav__group--active" : ""]
                  .filter(Boolean)
                  .join(" ")}
                key={group.id}
                layout="position"
                transition={navLayoutTransition}
              >
                <button
                  aria-expanded={isOpen}
                  className="dashboard-nav__group-trigger"
                  type="button"
                  onClick={() => setOpenGroupId((current) => (current === group.id ? current : group.id))}
                >
                  <span>{group.label}</span>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} aria-hidden className="dashboard-nav__group-icon" transition={navLayoutTransition}>
                    <FiChevronDown />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      animate={{ height: "auto", opacity: 1, y: 0 }}
                      className="dashboard-nav__group-content"
                      exit={{ height: 0, opacity: 0, y: -4 }}
                      initial={{ height: 0, opacity: 0, y: -4 }}
                      transition={navPanelTransition}
                    >
                      <div className="dashboard-nav__group-content-inner">
                        {group.tabs.map((tab) => {
                          const Icon = tab.icon;
                          return (
                            <button
                              className={tab.id === activeTab.id ? "dashboard-nav__link dashboard-nav__link--active" : "dashboard-nav__link"}
                              key={tab.id}
                              type="button"
                              onClick={() => selectTab(tab.id, shouldCloseMobileNav)}
                            >
                              <Icon aria-hidden />
                              <span>{tab.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.section>
            );
          })}
        </LayoutGroup>
      </nav>
    );
  }

  return (
    <section className="dashboard-shell">
      <div className="dashboard-mobile-bar">
        <div>
          <p className="dashboard-eyebrow">J Roybal Dev</p>
          <h1>Dashboard</h1>
        </div>
        <button className="dashboard-mobile-nav-button" type="button" onClick={() => setIsMobileNavOpen(true)}>
          <FiMenu aria-hidden />
          <span>Menu</span>
        </button>
      </div>

      <aside className="dashboard-sidebar dashboard-sidebar--desktop" aria-label="Dashboard sections">
        <div>
          <div className="dashboard-brand-lockup">
            <span aria-hidden>JR</span>
            <div>
              <p className="dashboard-eyebrow">J Roybal Dev</p>
              <h1>Dashboard</h1>
            </div>
          </div>
        </div>
        {renderDashboardNav()}
        {currentUser ? (
          <div className="dashboard-user-card">
            <span>{String(currentUser.role ?? "user")}</span>
            <strong>{currentUser.name || currentUser.email}</strong>
            <small>{currentUser.email}</small>
          </div>
        ) : null}
        <button className="dashboard-sidebar__clear" type="button" onClick={() => void lockDashboard()}>
          <FiLogOut aria-hidden /> Lock dashboard
        </button>
      </aside>

      <AnimatePresence>
        {isMobileNavOpen ? (
          <motion.div animate={{ opacity: 1 }} className="dashboard-mobile-nav" exit={{ opacity: 0 }} initial={{ opacity: 0 }}>
            <button aria-label="Close dashboard menu" className="dashboard-mobile-nav__backdrop" type="button" onClick={() => setIsMobileNavOpen(false)} />
            <motion.aside
              animate={{ y: 0 }}
              aria-label="Dashboard sections"
              aria-modal="true"
              className="dashboard-mobile-nav__sheet"
              exit={{ y: "100%" }}
              initial={{ y: "100%" }}
              role="dialog"
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: navEase }}
            >
              <div className="dashboard-mobile-nav__handle" aria-hidden />
              <div className="dashboard-mobile-nav__header">
                <div>
                  <p className="dashboard-eyebrow">J Roybal Dev</p>
                  <h2>Dashboard</h2>
                </div>
                <button aria-label="Close dashboard menu" className="dashboard-mobile-nav__close" type="button" onClick={() => setIsMobileNavOpen(false)}>
                  <FiX aria-hidden />
                </button>
              </div>
              {renderDashboardNav(true)}
              {currentUser ? (
                <div className="dashboard-user-card">
                  <span>{String(currentUser.role ?? "user")}</span>
                  <strong>{currentUser.name || currentUser.email}</strong>
                  <small>{currentUser.email}</small>
                </div>
              ) : null}
              <button className="dashboard-sidebar__clear" type="button" onClick={() => void lockDashboard()}>
                <FiLogOut aria-hidden /> Lock dashboard
              </button>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section className="dashboard-workspace" aria-labelledby="dashboard-section-title">
        <div className="dashboard-workspace__header">
          <div>
            <p className="dashboard-eyebrow">Editing</p>
            <h2 id="dashboard-section-title">{activeTab.label}</h2>
          </div>
          <div className="dashboard-workspace__action-stack">
            <DashboardThemeSlider />
            <div className="dashboard-workspace__actions">
              <Link className="dashboard-action dashboard-action--link" to="/" target="_blank" rel="noreferrer">
                <FiExternalLink aria-hidden /> View site
              </Link>
              <button className="dashboard-action" type="button" onClick={resetToDefaults}>
                Reset
              </button>
              <button className="dashboard-action dashboard-action--primary" type="button" disabled={saveSite.isPending} onClick={form.handleSubmit((draft) => saveSite.mutate(draft))}>
                <FiSave aria-hidden /> {saveSite.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>

        <div className="dashboard-metrics" aria-label="Dashboard summary">
          <SummaryMetric label="Current slug" value={`/${selectedSite.slug || "new"}`} />
          <SummaryMetric label="Status" value={selectedSite.published ? "Published" : "Draft"} />
          <SummaryMetric label="Links" value={String(totalLinks)} />
          <SummaryMetric label="Published records" value={String(publishedCount)} />
        </div>

        <div className="dashboard-workspace__panel">
          {activeTab.id === "overview" ? <OverviewPanel selectedSite={selectedSite} saveMessage={saveMessage} saveError={saveSite.error?.message} /> : null}
          {activeTab.id === "start" ? <StartGuidePanel /> : null}
          {activeTab.id === "layout" ? <LayoutPanel form={form} /> : null}
          {activeTab.id === "metadata" ? <MetadataPanel form={form} /> : null}
          {activeTab.id === "branding" ? <BrandingPanel form={form} /> : null}
          {activeTab.id === "links" ? <LinksPanel form={form} links={links} /> : null}
          {activeTab.id === "users" ? (
            <UsersPanel
              error={createUser.error?.message}
              isPending={createUser.isPending}
              actionError={
                updateUserRole.error?.message ||
                banUser.error?.message ||
                unbanUser.error?.message ||
                setUserPassword.error?.message ||
                revokeUserSessions.error?.message ||
                deleteUser.error?.message
              }
              users={users.data ?? []}
              onBan={(input) => banUser.mutate(input)}
              onCreate={(input) => createUser.mutate(input)}
              onDelete={(userId) => deleteUser.mutate(userId)}
              onRevokeSessions={(userId) => revokeUserSessions.mutate(userId)}
              onSetPassword={(input) => setUserPassword.mutate(input)}
              onUnban={(userId) => unbanUser.mutate(userId)}
              onUpdateRole={(input) => updateUserRole.mutate(input)}
            />
          ) : null}
          {activeTab.id === "records" ? <RecordsPanel isLoading={sites.isLoading} sites={sites.data ?? []} onSelect={loadSite} /> : null}
          {activeTab.id === "uploads" ? (
            <UploadsPanel
              isPending={uploadAsset.isPending}
              isReplacing={replaceUpload.isPending}
              isDeleting={deleteUpload.isPending}
              message={uploadMessage}
              error={uploadAsset.error?.message || replaceUpload.error?.message || deleteUpload.error?.message}
              uploads={uploads.data ?? []}
              isLoading={uploads.isLoading}
              onDelete={(uploadId) => deleteUpload.mutate(uploadId)}
              onReplace={(input) => replaceUpload.mutate(input)}
              onUpload={(file) => uploadAsset.mutate(file)}
            />
          ) : null}
          {activeTab.id === "help" ? <HelpPanel /> : null}
        </div>
      </section>
    </section>
  );
}

function DashboardThemeSlider() {
  const { mode, resolvedTheme, setMode } = useThemeMode();

  return (
    <div className="dashboard-theme-slider" aria-label={`Theme selector, currently ${resolvedTheme}`}>
      {themeOptions.map((option) => {
        const Icon = option.icon;
        return (
          <button
            aria-label={option.label}
            aria-pressed={mode === option.mode}
            className={mode === option.mode ? "active" : ""}
            key={option.mode}
            onClick={() => setMode(option.mode)}
            title={option.label}
            type="button"
          >
            <Icon aria-hidden />
            <span>{option.mode}</span>
          </button>
        );
      })}
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function OverviewPanel({ selectedSite, saveMessage, saveError }: { selectedSite: SiteDraftInput; saveMessage: string; saveError?: string }) {
  return (
    <div className="dashboard-overview">
      <div>
        <p className="dashboard-eyebrow">Current draft</p>
        <h3>{selectedSite.title || "Untitled record"}</h3>
        <p>{selectedSite.description || "Static site content lives in code. Use this dashboard for metadata, branding, links, users, records, and media."}</p>
      </div>
      <div className="dashboard-preview">
        <div className="dashboard-preview__media">{selectedSite.heroImageUrl ? <img src={selectedSite.heroImageUrl} alt="" /> : <FiImage aria-hidden />}</div>
        <div>
          <span>{selectedSite.published ? "Published" : "Draft"}</span>
          <strong>/{selectedSite.slug || "new"}</strong>
        </div>
      </div>
      {saveMessage ? <p className="dashboard-message dashboard-message--success">{saveMessage}</p> : null}
      {saveError ? <p className="dashboard-message dashboard-message--error">{saveError}</p> : null}
    </div>
  );
}

function StartGuidePanel() {
  return (
    <div className="start-guide-panel">
      <div>
        <p className="dashboard-eyebrow">Start here</p>
        <h3>Template setup checklist</h3>
        <p>Use this dashboard for the operational pieces of a project. Public page content is intentionally edited in code so each project can have static, versioned pages.</p>
      </div>
      <ol>
        <li>
          <strong>Copy and rename:</strong> Copy the template into a new folder, rename the package names, then create a fresh git repository.
        </li>
        <li>
          <strong>Configure env:</strong> Copy `.env.example` to `.env`, choose `admin-key` or `better-auth`, and set database, email, storage, and security values.
        </li>
        <li>
          <strong>Run the database:</strong> Start Postgres with `bun run db:up`, then run `cd apps/server && bunx drizzle-kit migrate`.
        </li>
        <li>
          <strong>Set project identity:</strong> Edit `apps/web/src/shared/siteConfig.ts` for the site name, dashboard title, page-title format, and favicon.
        </li>
        <li>
          <strong>Build static pages:</strong> Add the real public content in React routes/components. Use `docs/page-setup-grid-layout.md` for the shared header, aside, main, and footer template.
        </li>
        <li>
          <strong>Choose layout behavior:</strong> Use the Layout tab to switch asides between sticky viewport-height panels and page-scrolling panels.
        </li>
        <li>
          <strong>Verify the stack:</strong> Open `/docs` for API docs, run `bun run typecheck`, and run `bun run build` before handing off.
        </li>
      </ol>
    </div>
  );
}

function LayoutPanel({ form }: { form: ReturnType<typeof useForm<SiteDraftInput, unknown, SiteDraft>> }) {
  const asideMode = form.watch("metadata.frontendAsideMode") ?? "static";

  return (
    <div className="dashboard-form">
      <div>
        <p className="dashboard-eyebrow">Frontend layout</p>
        <h3>Page grid settings</h3>
      </div>
      <div className="layout-settings-grid">
        <div className="layout-mode-options" role="radiogroup" aria-label="Aside behavior">
          <label className={asideMode === "static" ? "layout-mode-card layout-mode-card--active" : "layout-mode-card"}>
            <input {...form.register("metadata.frontendAsideMode")} type="radio" value="static" />
            <span>Static asides</span>
            <small>Asides stick to the current viewport while the main page scrolls, then release before the footer.</small>
          </label>
          <label className={asideMode === "scroll" ? "layout-mode-card layout-mode-card--active" : "layout-mode-card"}>
            <input {...form.register("metadata.frontendAsideMode")} type="radio" value="scroll" />
            <span>Scrollable asides</span>
            <small>Asides stretch with the page and scroll naturally with the main content.</small>
          </label>
        </div>
        <LayoutPreview asideMode={asideMode} />
      </div>
      <p className="dashboard-note">
        This setting is saved with the site record. The shared header/navbar still comes from `App.tsx`; public page routes render the left aside, main area, right aside, and footer.
      </p>
      <FormErrors errors={form.formState.errors} />
    </div>
  );
}

function LayoutPreview({ asideMode }: { asideMode: "scroll" | "static" }) {
  return (
    <div className={`layout-preview layout-preview--${asideMode}`} aria-label="Frontend grid preview">
      <div className="layout-preview__cell layout-preview__header">Header / Navbar</div>
      <div className="layout-preview__cell layout-preview__aside">Left Aside</div>
      <div className="layout-preview__cell layout-preview__main">Main</div>
      <div className="layout-preview__cell layout-preview__aside">Right Aside</div>
      <div className="layout-preview__cell layout-preview__footer">Footer</div>
      <span>{asideMode === "static" ? "Sticky asides" : "Page-scrolling asides"}</span>
    </div>
  );
}

function MetadataPanel({ form }: { form: ReturnType<typeof useForm<SiteDraftInput, unknown, SiteDraft>> }) {
  return (
    <form className="dashboard-form" onSubmit={(event) => event.preventDefault()}>
      <div>
        <p className="dashboard-eyebrow">Search and sharing</p>
        <h3>Metadata</h3>
      </div>
      <label>
        <span>SEO title</span>
        <input {...form.register("metadata.seoTitle")} placeholder="Optional title for search results" />
      </label>
      <label>
        <span>SEO description</span>
        <textarea rows={4} {...form.register("metadata.seoDescription")} placeholder="Optional description for search results and link previews" />
      </label>
      <label>
        <span>Open Graph image URL</span>
        <input {...form.register("metadata.ogImageUrl")} placeholder="https://..." />
      </label>
      <FormErrors errors={form.formState.errors} />
    </form>
  );
}

function BrandingPanel({ form }: { form: ReturnType<typeof useForm<SiteDraftInput, unknown, SiteDraft>> }) {
  const branding = { ...defaultDraft.branding, ...form.watch("branding") } as SiteBranding;
  const contrastWarnings = [...getContrastWarnings(branding, "light"), ...getContrastWarnings(branding, "dark")];
  type BrandingField = keyof SiteBranding;
  const lightFields: Array<[BrandingField, string]> = [
    ["lightBackgroundColor", "Page background"],
    ["lightSurfaceColor", "Surface"],
    ["lightSurfaceMutedColor", "Muted surface"],
    ["lightSurfaceAccentColor", "Accent surface"],
    ["lightBorderColor", "Border"],
    ["lightBorderStrongColor", "Strong border"],
    ["lightBorderAccentColor", "Accent border"],
    ["lightSurfaceDangerColor", "Danger surface"],
    ["lightBorderDangerColor", "Danger border"],
    ["lightTextColor", "Body text"],
    ["lightHeadingColor", "Headings"],
    ["lightMutedColor", "Muted text"],
    ["lightNavColor", "Nav text"],
    ["lightNavActiveColor", "Active nav"],
    ["lightTopbarColor", "Header background"],
    ["lightAccentColor", "Accent"],
    ["lightAccentStrongColor", "Strong accent"],
    ["lightAccentTextColor", "Accent text"],
    ["lightButtonPrimaryColor", "Primary button"],
    ["lightButtonPrimaryTextColor", "Primary button text"],
    ["lightButtonSecondaryColor", "Secondary button"],
    ["lightButtonSecondaryTextColor", "Secondary button text"],
    ["lightButtonSecondaryBorderColor", "Secondary button border"],
    ["lightDangerColor", "Danger text"]
  ];
  const darkFields: Array<[BrandingField, string]> = [
    ["darkBackgroundColor", "Page background"],
    ["darkSurfaceColor", "Surface"],
    ["darkSurfaceMutedColor", "Muted surface"],
    ["darkSurfaceAccentColor", "Accent surface"],
    ["darkBorderColor", "Border"],
    ["darkBorderStrongColor", "Strong border"],
    ["darkBorderAccentColor", "Accent border"],
    ["darkSurfaceDangerColor", "Danger surface"],
    ["darkBorderDangerColor", "Danger border"],
    ["darkTextColor", "Body text"],
    ["darkHeadingColor", "Headings"],
    ["darkMutedColor", "Muted text"],
    ["darkNavColor", "Nav text"],
    ["darkNavActiveColor", "Active nav"],
    ["darkTopbarColor", "Header background"],
    ["darkAccentColor", "Accent"],
    ["darkAccentStrongColor", "Strong accent"],
    ["darkAccentTextColor", "Accent text"],
    ["darkButtonPrimaryColor", "Primary button"],
    ["darkButtonPrimaryTextColor", "Primary button text"],
    ["darkButtonSecondaryColor", "Secondary button"],
    ["darkButtonSecondaryTextColor", "Secondary button text"],
    ["darkButtonSecondaryBorderColor", "Secondary button border"],
    ["darkDangerColor", "Danger text"]
  ];

  return (
    <div className="dashboard-form">
      <div>
        <p className="dashboard-eyebrow">Public site theme</p>
        <h3>Branding</h3>
      </div>
      <BrandingPreview branding={branding} />
      {contrastWarnings.length > 0 ? (
        <div className="contrast-warning-list" role="status">
          <strong>Contrast warnings</strong>
          {contrastWarnings.map((warning) => (
            <p key={`${warning.theme}-${warning.label}`}>
              {warning.theme}: {warning.label} is {warning.ratio.toFixed(1)}:1. Aim for at least 4.5:1 for normal text.
            </p>
          ))}
        </div>
      ) : (
        <div className="contrast-warning-list contrast-warning-list--clear" role="status">
          <strong>Contrast check</strong>
          <p>Core text and UI color pairs pass the 4.5:1 contrast target.</p>
        </div>
      )}
      <div className="theme-color-sections">
        <ThemeColorSection fields={lightFields} form={form} title="Light theme" />
        <ThemeColorSection fields={darkFields} form={form} title="Dark theme" />
      </div>
      <p className="dashboard-note">
        These colors map to public page CSS variables. Browser titles and the favicon are managed in `apps/web/src/shared/siteConfig.ts`.
      </p>
      <FormErrors errors={form.formState.errors} />
    </div>
  );
}

function ThemeColorSection({
  fields,
  form,
  title
}: {
  fields: Array<[keyof SiteBranding, string]>;
  form: ReturnType<typeof useForm<SiteDraftInput, unknown, SiteDraft>>;
  title: string;
}) {
  return (
    <section className="theme-color-section">
      <h4>{title}</h4>
      <div className="color-grid">
        {fields.map(([field, label]) => (
          <ThemeColorField field={field} form={form} key={field} label={label} />
        ))}
      </div>
    </section>
  );
}

function ThemeColorField({
  field,
  form,
  label
}: {
  field: keyof SiteBranding;
  form: ReturnType<typeof useForm<SiteDraftInput, unknown, SiteDraft>>;
  label: string;
}) {
  const path = `branding.${field}` as FieldPath<SiteDraftInput>;
  const defaultBranding = defaultDraft.branding as SiteBranding;
  const fallback = defaultBranding[field] || "#000000";
  const watchedValue = form.watch(path);
  const textValue = typeof watchedValue === "string" && watchedValue.length > 0 ? watchedValue : fallback;
  const colorValue = isHexColor(textValue) ? textValue : fallback;

  function updateColor(value: string) {
    form.setValue(path, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  }

  return (
    <label className="color-field">
      <span>{label}</span>
      <div>
        <input aria-label={`${label} color picker`} type="color" value={colorValue} onChange={(event) => updateColor(event.target.value)} />
        <input aria-label={`${label} hex value`} value={textValue} onChange={(event) => updateColor(event.target.value)} />
      </div>
    </label>
  );
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

type DashboardThemeColors = {
  accent: string;
  accentStrong: string;
  accentText: string;
  background: string;
  border: string;
  borderAccent: string;
  borderDanger: string;
  borderStrong: string;
  buttonPrimary: string;
  buttonPrimaryText: string;
  buttonSecondary: string;
  buttonSecondaryBorder: string;
  buttonSecondaryText: string;
  danger: string;
  heading: string;
  muted: string;
  nav: string;
  navActive: string;
  surface: string;
  surfaceAccent: string;
  surfaceDanger: string;
  surfaceMuted: string;
  text: string;
  topbar: string;
};

function BrandingPreview({ branding }: { branding: SiteBranding }) {
  return (
    <div className="branding-preview-grid">
      <ThemePreviewCard branding={branding} theme="light" />
      <ThemePreviewCard branding={branding} theme="dark" />
    </div>
  );
}

function ThemePreviewCard({ branding, theme }: { branding: SiteBranding; theme: "light" | "dark" }) {
  const colors = getDashboardThemeColors(branding, theme);
  const style = {
    "--preview-accent": colors.accent,
    "--preview-accent-strong": colors.accentStrong,
    "--preview-accent-text": colors.accentText,
    "--preview-bg": colors.background,
    "--preview-border": colors.border,
    "--preview-border-accent": colors.borderAccent,
    "--preview-border-danger": colors.borderDanger,
    "--preview-button-primary": colors.buttonPrimary,
    "--preview-button-primary-text": colors.buttonPrimaryText,
    "--preview-button-secondary": colors.buttonSecondary,
    "--preview-button-secondary-border": colors.buttonSecondaryBorder,
    "--preview-button-secondary-text": colors.buttonSecondaryText,
    "--preview-danger": colors.danger,
    "--preview-heading": colors.heading,
    "--preview-muted": colors.muted,
    "--preview-nav": colors.nav,
    "--preview-nav-active": colors.navActive,
    "--preview-surface": colors.surface,
    "--preview-surface-accent": colors.surfaceAccent,
    "--preview-surface-danger": colors.surfaceDanger,
    "--preview-surface-muted": colors.surfaceMuted,
    "--preview-text": colors.text,
    "--preview-topbar": colors.topbar
  } as CSSProperties;

  return (
    <article className="branding-preview-card" style={style}>
      <div className="branding-preview-card__topbar">
        <strong>{theme === "light" ? "Light" : "Dark"} preview</strong>
        <span>Public</span>
      </div>
      <div className="branding-preview-card__layout">
        <aside>
          <span>Aside</span>
          <small>Muted text</small>
        </aside>
        <main>
          <span>Main</span>
          <h4>Heading</h4>
          <p>Body text and supporting copy.</p>
          <button className="branding-preview-card__primary" type="button">Primary</button>
          <button className="branding-preview-card__secondary" type="button">Secondary</button>
          <em>Danger state</em>
        </main>
      </div>
    </article>
  );
}

function getDashboardThemeColors(branding: SiteBranding, theme: "light" | "dark"): DashboardThemeColors {
  if (theme === "dark") {
    return {
      accent: branding.darkAccentColor || branding.accentColor,
      accentStrong: branding.darkAccentStrongColor || branding.accentColor,
      accentText: branding.darkAccentTextColor || "#d6fbef",
      background: branding.darkBackgroundColor || branding.backgroundColor,
      border: branding.darkBorderColor || "#2c3440",
      borderAccent: branding.darkBorderAccentColor || "#2b6871",
      borderDanger: branding.darkBorderDangerColor || "#6f3535",
      borderStrong: branding.darkBorderStrongColor || "#435061",
      buttonPrimary: branding.darkButtonPrimaryColor || branding.darkAccentColor || branding.accentColor,
      buttonPrimaryText: branding.darkButtonPrimaryTextColor || "#ffffff",
      buttonSecondary: branding.darkButtonSecondaryColor || branding.darkSurfaceMutedColor || branding.surfaceColor,
      buttonSecondaryBorder: branding.darkButtonSecondaryBorderColor || branding.darkBorderStrongColor || "#435061",
      buttonSecondaryText: branding.darkButtonSecondaryTextColor || branding.darkAccentStrongColor || branding.accentColor,
      danger: branding.darkDangerColor || "#ff9b8f",
      heading: branding.darkHeadingColor || branding.headingColor,
      muted: branding.darkMutedColor || branding.textColor,
      nav: branding.darkNavColor || branding.textColor,
      navActive: branding.darkNavActiveColor || branding.surfaceColor,
      surface: branding.darkSurfaceColor || branding.surfaceColor,
      surfaceAccent: branding.darkSurfaceAccentColor || branding.surfaceColor,
      surfaceDanger: branding.darkSurfaceDangerColor || "#3a2020",
      surfaceMuted: branding.darkSurfaceMutedColor || branding.surfaceColor,
      text: branding.darkTextColor || branding.textColor,
      topbar: branding.darkTopbarColor || branding.darkBackgroundColor || branding.backgroundColor
    };
  }

  return {
    accent: branding.lightAccentColor || branding.accentColor,
    accentStrong: branding.lightAccentStrongColor || branding.accentColor,
    accentText: branding.lightAccentTextColor || "#193926",
    background: branding.lightBackgroundColor || branding.backgroundColor,
    border: branding.lightBorderColor || "#deded2",
    borderAccent: branding.lightBorderAccentColor || "#c7dde0",
    borderDanger: branding.lightBorderDangerColor || "#f1c5c5",
    borderStrong: branding.lightBorderStrongColor || "#c9c9bd",
    buttonPrimary: branding.lightButtonPrimaryColor || branding.lightAccentColor || branding.accentColor,
    buttonPrimaryText: branding.lightButtonPrimaryTextColor || "#ffffff",
    buttonSecondary: branding.lightButtonSecondaryColor || branding.lightSurfaceAccentColor || branding.surfaceColor,
    buttonSecondaryBorder: branding.lightButtonSecondaryBorderColor || branding.lightBorderAccentColor || "#c7dde0",
    buttonSecondaryText: branding.lightButtonSecondaryTextColor || branding.lightAccentStrongColor || branding.accentColor,
    danger: branding.lightDangerColor || "#b42318",
    heading: branding.lightHeadingColor || branding.headingColor,
    muted: branding.lightMutedColor || branding.textColor,
    nav: branding.lightNavColor || branding.textColor,
    navActive: branding.lightNavActiveColor || branding.surfaceColor,
    surface: branding.lightSurfaceColor || branding.surfaceColor,
    surfaceAccent: branding.lightSurfaceAccentColor || branding.surfaceColor,
    surfaceDanger: branding.lightSurfaceDangerColor || "#fff1f1",
    surfaceMuted: branding.lightSurfaceMutedColor || branding.surfaceColor,
    text: branding.lightTextColor || branding.textColor,
    topbar: branding.lightTopbarColor || branding.lightBackgroundColor || branding.backgroundColor
  };
}

function getContrastWarnings(branding: SiteBranding, theme: "light" | "dark") {
  const colors = getDashboardThemeColors(branding, theme);
  const pairs = [
    ["Body text on page", colors.text, colors.background],
    ["Body text on surface", colors.text, colors.surface],
    ["Heading on surface", colors.heading, colors.surface],
    ["Muted text on surface", colors.muted, colors.surface],
    ["Nav text on header", colors.nav, colors.topbar],
    ["Accent text on accent", colors.accentText, colors.accent],
    ["Primary button text", colors.buttonPrimaryText, colors.buttonPrimary],
    ["Secondary button text", colors.buttonSecondaryText, colors.buttonSecondary],
    ["Accent link on accent surface", colors.accentStrong, colors.surfaceAccent],
    ["Danger text on danger surface", colors.danger, colors.surfaceDanger]
  ] as const;

  return pairs
    .map(([label, foreground, background]) => ({
      label,
      ratio: getContrastRatio(foreground, background),
      theme: theme === "light" ? "Light" : "Dark"
    }))
    .filter((warning) => warning.ratio < 4.5);
}

function getContrastRatio(foreground: string, background: string) {
  const foregroundRgb = parseHexColor(foreground);
  const backgroundRgb = parseHexColor(background);

  if (!foregroundRgb || !backgroundRgb) {
    return 0;
  }

  const lighter = Math.max(getRelativeLuminance(foregroundRgb), getRelativeLuminance(backgroundRgb));
  const darker = Math.min(getRelativeLuminance(foregroundRgb), getRelativeLuminance(backgroundRgb));

  return (lighter + 0.05) / (darker + 0.05);
}

function parseHexColor(color: string) {
  const match = color.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (!match) {
    return null;
  }

  const value = match[1]!;
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function getRelativeLuminance(color: { r: number; g: number; b: number }) {
  const channels = [color.r, color.g, color.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

function LinksPanel({
  form,
  links
}: {
  form: ReturnType<typeof useForm<SiteDraftInput, unknown, SiteDraft>>;
  links: ReturnType<typeof useFieldArray<SiteDraftInput, "links">>;
}) {
  return (
    <div className="dashboard-form">
      <div className="links-header">
        <div>
          <p className="dashboard-eyebrow">Calls to action</p>
          <h3>Links</h3>
        </div>
        <button type="button" className="icon-button" onClick={() => links.append({ label: "", href: "https://", kind: "secondary" })} title="Add link">
          <FiPlus aria-hidden />
        </button>
      </div>
      {links.fields.map((field, index) => (
        <div className="link-editor" key={field.id}>
          <input {...form.register(`links.${index}.label`)} placeholder="Label" />
          <input {...form.register(`links.${index}.href`)} placeholder="https://..." />
          <select {...form.register(`links.${index}.kind`)}>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="social">Social</option>
          </select>
          <button type="button" className="icon-button danger" onClick={() => links.remove(index)} title="Remove link">
            <FiTrash2 aria-hidden />
          </button>
        </div>
      ))}
      <FormErrors errors={form.formState.errors} />
    </div>
  );
}

function UsersPanel({
  actionError,
  error,
  isPending,
  users,
  onBan,
  onCreate,
  onDelete,
  onRevokeSessions,
  onSetPassword,
  onUnban,
  onUpdateRole
}: {
  actionError?: string;
  error?: string;
  isPending: boolean;
  users: AdminUser[];
  onBan: (input: { userId: string; banReason?: string }) => void;
  onCreate: (input: { name: string; email: string; password: string; role: "admin" | "user" }) => void;
  onDelete: (userId: string) => void;
  onRevokeSessions: (userId: string) => void;
  onSetPassword: (input: { userId: string; newPassword: string }) => void;
  onUnban: (userId: string) => void;
  onUpdateRole: (input: { userId: string; role: "admin" | "user" }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate({ name: name.trim(), email: email.trim(), password, role });
    setName("");
    setEmail("");
    setPassword("");
    setRole("user");
  }

  return (
    <div className="users-panel">
      <form className="dashboard-form user-create-form" onSubmit={submit}>
        <div>
          <p className="dashboard-eyebrow">Access control</p>
          <h3>Invite a user</h3>
        </div>
        <div className="field-row user-create-form__grid">
          <label>
            <span>Name</span>
            <input autoComplete="name" onChange={(event) => setName(event.target.value)} value={name} />
          </label>
          <label>
            <span>Email</span>
            <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
          </label>
          <label>
            <span>Password</span>
            <input autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
          </label>
          <label>
            <span>Role</span>
            <select onChange={(event) => setRole(event.target.value === "admin" ? "admin" : "user")} value={role}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>
        <button className="dashboard-action dashboard-action--primary" disabled={isPending || !name.trim() || !email.trim() || password.length < 8} type="submit">
          {isPending ? "Creating..." : "Create user"}
        </button>
        {error ? <p className="dashboard-message dashboard-message--error">{error}</p> : null}
        {actionError ? <p className="dashboard-message dashboard-message--error">{actionError}</p> : null}
      </form>

      <div className="records-grid users-list">
        {users.map((user) => (
          <UserManagementRow
            key={user.id}
            user={user}
            onBan={onBan}
            onDelete={onDelete}
            onRevokeSessions={onRevokeSessions}
            onSetPassword={onSetPassword}
            onUnban={onUnban}
            onUpdateRole={onUpdateRole}
          />
        ))}
        {users.length === 0 ? <p>No users yet. Seed the first admin from env, then create users here.</p> : null}
      </div>
    </div>
  );
}

function UserManagementRow({
  user,
  onBan,
  onDelete,
  onRevokeSessions,
  onSetPassword,
  onUnban,
  onUpdateRole
}: {
  user: AdminUser;
  onBan: (input: { userId: string; banReason?: string }) => void;
  onDelete: (userId: string) => void;
  onRevokeSessions: (userId: string) => void;
  onSetPassword: (input: { userId: string; newPassword: string }) => void;
  onUnban: (userId: string) => void;
  onUpdateRole: (input: { userId: string; role: "admin" | "user" }) => void;
}) {
  const [role, setRole] = useState<"admin" | "user">(user.role === "admin" ? "admin" : "user");
  const [newPassword, setNewPassword] = useState("");

  return (
    <div className="record-row user-row">
      <div className="user-row__identity">
        <span>{user.name}</span>
        <small>
          {user.email} - {user.role}
          {user.banned ? " - banned" : ""}
        </small>
      </div>
      <div className="user-row__actions">
        <select onChange={(event) => setRole(event.target.value === "admin" ? "admin" : "user")} value={role}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button type="button" onClick={() => onUpdateRole({ userId: user.id, role })}>
          Save role
        </button>
        {user.banned ? (
          <button type="button" onClick={() => onUnban(user.id)}>
            Unban
          </button>
        ) : (
          <button type="button" onClick={() => onBan({ userId: user.id, banReason: "Disabled by admin" })}>
            Ban
          </button>
        )}
        <button type="button" onClick={() => onRevokeSessions(user.id)}>
          Revoke sessions
        </button>
        <input placeholder="New password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        <button disabled={newPassword.length < 8} type="button" onClick={() => onSetPassword({ userId: user.id, newPassword })}>
          Set password
        </button>
        <button className="danger-text" type="button" onClick={() => onDelete(user.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}

function RecordsPanel({ isLoading, sites, onSelect }: { isLoading: boolean; sites: Site[]; onSelect: (site: Site) => void }) {
  return (
    <div className="records-grid">
      {isLoading ? <p>Loading records...</p> : null}
      {sites.map((site) => (
        <button className="record-row" key={site.id} type="button" onClick={() => onSelect(site)}>
          <span>{site.title}</span>
          <small>
            /{site.slug} - {site.published ? "Published" : "Draft"}
          </small>
        </button>
      ))}
      {!isLoading && sites.length === 0 ? <p>No records yet. Save the current draft to create one.</p> : null}
    </div>
  );
}

function UploadsPanel({
  error,
  isDeleting,
  isLoading,
  isPending,
  isReplacing,
  message,
  uploads,
  onDelete,
  onReplace,
  onUpload
}: {
  error?: string;
  isDeleting: boolean;
  isLoading: boolean;
  isPending: boolean;
  isReplacing: boolean;
  message: string;
  uploads: Upload[];
  onDelete: (uploadId: string) => void;
  onReplace: (input: { uploadId: string; file: File }) => void;
  onUpload: (file: File) => void;
}) {
  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("file");
    if (file instanceof File && file.size > 0) {
      onUpload(file);
      event.currentTarget.reset();
    }
  }

  function replace(event: FormEvent<HTMLFormElement>, uploadId: string) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("file");
    if (file instanceof File && file.size > 0) {
      onReplace({ uploadId, file });
      event.currentTarget.reset();
    }
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
  }

  const busy = isPending || isReplacing || isDeleting;

  return (
    <div className="upload-panel">
      <form className="upload-dropzone" onSubmit={upload}>
        <FiImage aria-hidden />
        <div>
          <h3>Upload media</h3>
          <p>Images generate optimized thumbnails. Cloudinary replacements clean up the old asset automatically.</p>
        </div>
        <input accept="image/*,video/*" name="file" type="file" />
        <button className="dashboard-action dashboard-action--primary" disabled={isPending} type="submit">
          {isPending ? "Uploading..." : "Upload asset"}
        </button>
      </form>
      {message ? <p className="dashboard-message dashboard-message--success">{message}</p> : null}
      {error ? <p className="dashboard-message dashboard-message--error">{error}</p> : null}
      {isLoading ? <p>Loading uploads...</p> : null}
      <div className="media-grid">
        {uploads.map((upload) => {
          const previewUrl = upload.thumbnailUrl || upload.url;
          const isImage = upload.contentType.startsWith("image/");
          const isVideo = upload.contentType.startsWith("video/");

          return (
            <article className="media-card" key={upload.id}>
              <div className="media-card__preview">
                {isImage ? <img src={previewUrl} alt="" /> : null}
                {isVideo ? <video src={upload.url} muted playsInline controls /> : null}
                {!isImage && !isVideo ? <FiFileText aria-hidden /> : null}
              </div>
              <div className="media-card__body">
                <div>
                  <strong>{upload.filename}</strong>
                  <small>
                    {formatBytes(upload.size)} - {upload.storageProvider}
                  </small>
                </div>
                <div className="media-card__urls">
                  <button type="button" onClick={() => void copyUrl(upload.url)}>
                    Copy URL
                  </button>
                  {upload.thumbnailUrl ? (
                    <button type="button" onClick={() => void copyUrl(upload.thumbnailUrl)}>
                      Copy thumbnail
                    </button>
                  ) : null}
                </div>
                <form className="media-card__replace" onSubmit={(event) => replace(event, upload.id)}>
                  <input accept="image/*,video/*" name="file" type="file" />
                  <button disabled={busy} type="submit">
                    {isReplacing ? "Replacing..." : "Replace"}
                  </button>
                </form>
                <button className="danger-text" disabled={busy} type="button" onClick={() => onDelete(upload.id)}>
                  Delete upload
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {!isLoading && uploads.length === 0 ? <p>No uploads yet.</p> : null}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function HelpPanel() {
  return (
    <div className="help-panel">
      <div>
        <p className="dashboard-eyebrow">Support</p>
        <h3>Setup and troubleshooting</h3>
        <p>These are the first places to check when bringing the template into a new client or product project.</p>
      </div>
      <ol>
        <li>
          <strong>Local stack:</strong> Run `bun install` in every Bun context, copy `.env.example` to `.env`, start Postgres with `bun run db:up`, migrate, then run
          `bun run dev`.
        </li>
        <li>
          <strong>Auth:</strong> Keep `AUTH_MODE=admin-key` for simple projects. Switch to `better-auth` when you need accounts, roles, password reset, and user
          management.
        </li>
        <li>
          <strong>Site identity:</strong> Change the site name, dashboard page title, page-title format, and favicon in `apps/web/src/shared/siteConfig.ts`.
        </li>
        <li>
          <strong>Static content:</strong> Public page copy and layout live in React code. This dashboard manages metadata, colors, links, users, records, and uploads.
        </li>
        <li>
          <strong>Page template:</strong> Use `docs/page-setup-grid-layout.md` when adding new frontend pages. It includes the grid-template structure, class names, loading component, and final checks.
        </li>
        <li>
          <strong>Layout settings:</strong> The Layout tab controls whether the public asides are static or scroll with the page for the current site record.
        </li>
        <li>
          <strong>Uploads:</strong> Use local storage for development or Cloudinary for production. Replace/delete actions clean up old stored assets when metadata is available.
        </li>
        <li>
          <strong>API reference:</strong> Open `http://localhost:3001/docs` for Swagger UI or `http://localhost:3001/openapi.json` for the OpenAPI document.
        </li>
        <li>
          <strong>Before handoff:</strong> Run `bun run typecheck`, `bun run build`, verify `/health`, and test dashboard unlock plus upload management.
        </li>
      </ol>
    </div>
  );
}

function FormErrors({ errors }: { errors: ReturnType<typeof useForm<SiteDraftInput, unknown, SiteDraft>>["formState"]["errors"] }) {
  const entries = Object.entries(errors);
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="form-errors">
      {entries.map(([key, value]) => (
        <p key={key}>{value.message?.toString()}</p>
      ))}
    </div>
  );
}

function DashboardAccessGate({
  isChecking,
  isInvalid,
  onBetterAuthChange,
  signupMode,
  onUnlock
}: {
  isChecking: boolean;
  isInvalid: boolean;
  onBetterAuthChange: () => void;
  signupMode: "private" | "public";
  onUnlock: (code: string) => void;
}) {
  const [authPreset, setAuthPreset] = useState<"admin-key" | "better-auth">("admin-key");
  const [code, setCode] = useState("");
  const [authIntent, setAuthIntent] = useState<"signin" | "signup" | "reset">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthPending, setIsAuthPending] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onUnlock(code.trim());
  }

  async function submitBetterAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");
    setIsAuthPending(true);

    try {
      if (authIntent === "reset") {
        await apiClient.auth.requestPasswordReset(email.trim(), `${window.location.origin}/reset-password`);
        setAuthMessage("If that email exists, a reset link has been sent.");
        return;
      }

      const result =
        authIntent === "signup"
          ? await authClient.signUp.email({
              name: name.trim() || email,
              email: email.trim(),
              password
            })
          : await authClient.signIn.email({
              email: email.trim(),
              password
            });

      if (result.error) {
        setAuthError(result.error.message ?? "Authentication failed.");
        return;
      }

      setAuthMessage(authIntent === "signup" ? "Account created. Unlocking dashboard..." : "Signed in. Unlocking dashboard...");
      onBetterAuthChange();
    } catch (caught) {
      setAuthError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setIsAuthPending(false);
    }
  }

  const authIsChecking = isChecking || isAuthPending;

  return (
    <section className="dashboard-gate">
      <div className="dashboard-gate__panel">
        <div className="dashboard-gate__mark">
          <FiLock aria-hidden />
        </div>
        <span className="dashboard-eyebrow">Private dashboard</span>
        <h1>Dashboard access</h1>
        <div className="auth-preset-toggle" role="tablist" aria-label="Authentication presets">
          <button aria-selected={authPreset === "admin-key"} role="tab" type="button" onClick={() => setAuthPreset("admin-key")}>
            Admin key
          </button>
          <button aria-selected={authPreset === "better-auth"} role="tab" type="button" onClick={() => setAuthPreset("better-auth")}>
            Better Auth
          </button>
        </div>

        {authPreset === "admin-key" ? (
          <form className="dashboard-gate__form" onSubmit={submit}>
            <p className="dashboard-note">Simple preset for small projects. Uses the server `ADMIN_KEY` and `X-Admin-Key` on protected requests.</p>
            <label>
              <span>Access code</span>
              <input autoComplete="current-password" autoFocus disabled={authIsChecking} onChange={(event) => setCode(event.target.value)} type="password" value={code} />
            </label>
            {isInvalid ? <p className="dashboard-message dashboard-message--error">That code does not match the server environment.</p> : null}
            <button disabled={code.trim().length === 0 || authIsChecking} type="submit">
              {authIsChecking ? "Checking..." : "Unlock dashboard"}
            </button>
          </form>
        ) : (
          <form className="dashboard-gate__form" onSubmit={(event) => void submitBetterAuth(event)}>
            <p className="dashboard-note">
              {signupMode === "public"
                ? "Large-project preset. Public signup is enabled by server env."
                : "Large-project preset. Signup is private by default, so admins create users from the dashboard."}
            </p>
            {signupMode === "public" ? (
              <div className="auth-intent-toggle" role="tablist" aria-label="Better Auth action">
                <button aria-selected={authIntent === "signin"} role="tab" type="button" onClick={() => setAuthIntent("signin")}>
                  Sign in
                </button>
                <button aria-selected={authIntent === "signup"} role="tab" type="button" onClick={() => setAuthIntent("signup")}>
                  Sign up
                </button>
              </div>
            ) : null}
            {signupMode === "public" && authIntent === "signup" ? (
              <label>
                <span>Name</span>
                <input autoComplete="name" disabled={authIsChecking} onChange={(event) => setName(event.target.value)} value={name} />
              </label>
            ) : null}
            <label>
              <span>Email</span>
              <input autoComplete="email" disabled={authIsChecking} onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
            </label>
            {authIntent !== "reset" ? (
              <label>
                <span>Password</span>
                <input autoComplete={authIntent === "signup" ? "new-password" : "current-password"} disabled={authIsChecking} onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
              </label>
            ) : null}
            {authError ? <p className="dashboard-message dashboard-message--error">{authError}</p> : null}
            {authMessage ? <p className="dashboard-message dashboard-message--success">{authMessage}</p> : null}
            {isInvalid ? <p className="dashboard-message dashboard-message--error">The server rejected the session. Check `AUTH_MODE` and Better Auth env values.</p> : null}
            <button disabled={email.trim().length === 0 || (authIntent !== "reset" && password.length < 8) || authIsChecking} type="submit">
              {authIsChecking ? "Checking..." : authIntent === "reset" ? "Send reset link" : signupMode === "public" && authIntent === "signup" ? "Create account" : "Sign in"}
            </button>
            <button className="dashboard-gate__text-button" type="button" onClick={() => setAuthIntent((current) => (current === "reset" ? "signin" : "reset"))}>
              {authIntent === "reset" ? "Back to sign in" : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
