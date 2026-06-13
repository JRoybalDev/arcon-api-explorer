import SignIn from "../components/SignIn";
import { ContentArea } from "../components/explorer/ContentArea";
import { Directory } from "../components/explorer/Directory";
import { UploadModal, UploadProgress, type UploadModalSubmitInput, type UploadProgressState } from "../components/explorer/UploadModal";
import { apiFolderToExplorerFolder, apiMediaToExplorerFile, type ExplorerFile, type ExplorerFilter, type ExplorerSort, type ExplorerView } from "../components/explorer/types";
import { apiClient } from "../shared/apiClient";
import { LoadingScreen } from "../shared/Loading";
import { useAdminSession } from "../shared/useAdminSession";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setDocumentTitle } from "../shared/siteConfig";

function Explorer() {
    const adminSession = useAdminSession();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [activeFolderId, setActiveFolderId] = useState<string | null>(() => {
        try {
            return localStorage.getItem("explorer.activeFolderId");
        } catch {
            return null;
        }
    });
    const [autoEnabled, setAutoEnabled] = useState(false);
    const [filter, setFilter] = useState<ExplorerFilter>("all");
    const [loopEnabled, setLoopEnabled] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedExternalFile, setSelectedExternalFile] = useState<ExplorerFile | null>(null);
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [selectedFileIndexOverride, setSelectedFileIndexOverride] = useState<number | null>(null);
    const [viewerNextIndexOverride, setViewerNextIndexOverride] = useState<number | null>(null);
    const [shuffleSeed, setShuffleSeed] = useState(0);
    const [sort, setSort] = useState<ExplorerSort>("newest");
    const [uploadInProgress, setUploadInProgress] = useState(false);
    const [uploadMinimized, setUploadMinimized] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<UploadProgressState>({ isActive: false, label: "Preparing upload...", percent: 0 });
    const [view, setView] = useState<ExplorerView>(() => {
        try {
            // If user has a saved view, respect it
            const saved = localStorage.getItem("explorer.view");
            if (saved === "small" || saved === "medium" || saved === "large" || saved === "list") {
                return saved as ExplorerView;
            }

            // Default to the square option on mobile
            if (typeof window !== "undefined" && window.innerWidth <= 768) {
                return "small";
            }
        } catch {
            // ignore
        }

        return "medium";
    });
        const [autoAdvanceSettings, setAutoAdvanceSettings] = useState(() => {
        try {
            const saved = localStorage.getItem("explorer.autoAdvanceSettings");
            if (saved) return JSON.parse(saved);
        } catch {
            /* ignore */
        }
        return { imageDuration: 10, videoThreshold: 30, videoLoops: 2 };
    });

    useEffect(() => {
        localStorage.setItem("explorer.autoAdvanceSettings", JSON.stringify(autoAdvanceSettings));
    }, [autoAdvanceSettings]);
    const [mediaPageSize, setMediaPageSize] = useState(20);
    const [mediaLimit, setMediaLimit] = useState(mediaPageSize);
    const uploadAbortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        setDocumentTitle("Private Explorer");
    }, []);

    const foldersQuery = useQuery({
        queryKey: ["explorer-folders", adminSession.adminKey],
        queryFn: () => apiClient.explorer.listFolders(adminSession.adminKey),
        enabled: adminSession.isUnlocked,
        retry: false
    });

    const contentsQuery = useQuery({
        queryKey: ["explorer-contents", adminSession.adminKey, activeFolderId, filter, searchQuery, sort, shuffleSeed, mediaLimit],
        queryFn: () =>
            apiClient.explorer.contents(adminSession.adminKey, {
                filter,
                folderId: activeFolderId,
                limit: mediaLimit,
                search: searchQuery,
                shuffleSeed,
                sort
            }),
        enabled: adminSession.isUnlocked,
        placeholderData: keepPreviousData,
        retry: false
    });

    const createFolderMutation = useMutation({
        mutationFn: (name: string) => apiClient.explorer.createFolder(adminSession.adminKey, { name, parentId: activeFolderId }),
        onSuccess: () => void invalidateExplorerQueries()
    });

    const moveFilesMutation = useMutation({
        mutationFn: ({ fileIds, folderId }: { fileIds: string[]; folderId: string | null }) => apiClient.explorer.moveMedia(adminSession.adminKey, { folderId, mediaIds: fileIds }),
        onSuccess: () => void invalidateExplorerQueries()
    });

    const deleteFilesMutation = useMutation({
        mutationFn: (fileIds: string[]) => apiClient.explorer.deleteMedia(adminSession.adminKey, fileIds),
        onSuccess: () => void invalidateExplorerQueries()
    });

    const favoriteMutation = useMutation({
        mutationFn: ({ favorite, fileId }: { favorite: boolean; fileId: string }) => apiClient.explorer.setFavorite(adminSession.adminKey, fileId, favorite),
        onSuccess: () => void invalidateExplorerQueries()
    });

    const tagsMutation = useMutation({
        mutationFn: ({ fileId, tags }: { fileId: string; tags: string[] }) => apiClient.explorer.setTags(adminSession.adminKey, fileId, tags),
        onSuccess: () => void invalidateExplorerQueries()
    });

    const allFolders = useMemo(() => foldersQuery.data?.map((folder) => apiFolderToExplorerFolder(folder)) ?? [], [foldersQuery.data]);

    const activeFolder = useMemo(
        () => allFolders.find((folder) => folder.id === activeFolderId) ?? null,
        [activeFolderId, allFolders]
    );

    const visibleFolders = useMemo(
        () => allFolders.filter((folder) => folder.parentId === activeFolderId),
        [activeFolderId, allFolders]
    );

    const visibleFiles = useMemo(() => {
        return contentsQuery.data?.media.map(apiMediaToExplorerFile) ?? [];
    }, [contentsQuery.data]);

    const favoriteIds = useMemo(() => visibleFiles.filter((file) => file.favorite).map((file) => file.id), [visibleFiles]);
    const mediaTotal = contentsQuery.data?.mediaTotal ?? visibleFiles.length;
    const canLoadMoreMedia = visibleFiles.length < mediaTotal;

    const storageUsed = useMemo(() => visibleFiles.reduce((total, file) => total + file.size, 0), [visibleFiles]);

    const selectedFile = useMemo(
        () => visibleFiles.find((file) => file.id === selectedFileId) ?? (selectedExternalFile?.id === selectedFileId ? selectedExternalFile : null),
        [selectedExternalFile, selectedFileId, visibleFiles]
    );

    const selectedFileIndex = useMemo(() => {
        const loadedIndex = visibleFiles.findIndex((file) => file.id === selectedFileId);
        return loadedIndex >= 0 ? loadedIndex : selectedFileIndexOverride ?? 0;
    }, [selectedFileId, selectedFileIndexOverride, visibleFiles]);

    useEffect(() => {
        if (selectedExternalFile && viewerNextIndexOverride === null && visibleFiles.some((file) => file.id === selectedExternalFile.id)) {
            setSelectedExternalFile(null);
            setSelectedFileIndexOverride(null);
        }
    }, [selectedExternalFile, viewerNextIndexOverride, visibleFiles]);

    useEffect(() => {
        if (selectedFileId && !visibleFiles.some((file) => file.id === selectedFileId) && selectedExternalFile?.id !== selectedFileId) {
            setSelectedFileId(null);
        }
    }, [selectedExternalFile, selectedFileId, visibleFiles]);

    useEffect(() => {
        setMediaLimit(mediaPageSize);
    }, [activeFolderId, filter, searchQuery, sort]);

    const updateMediaPageSize = useCallback((nextPageSize: number) => {
        setMediaPageSize((current) => (current === nextPageSize ? current : nextPageSize));
    }, []);

    const loadMoreMedia = useCallback(() => {
        setMediaLimit((current) => current + mediaPageSize);
    }, [mediaPageSize]);

    function selectFolder(folderId: string | null) {
        setActiveFolderId(folderId);
        try {
            if (folderId === null) {
                localStorage.removeItem("explorer.activeFolderId");
            } else {
                localStorage.setItem("explorer.activeFolderId", folderId);
            }
        } catch {
            // ignore storage errors
        }
        setSelectedFileId(null);
        setSelectedExternalFile(null);
        setSelectedFileIndexOverride(null);
        setViewerNextIndexOverride(null);
    }

    function goUpOneFolder() {
        if (!activeFolder) {
            return;
        }

        selectFolder(activeFolder.parentId);
    }

    function shuffleVisibleFiles() {
        setSelectedExternalFile(selectedFile);
        setShuffleSeed((current) => (current ? 0 : Date.now()));
        setSelectedFileIndexOverride(selectedFile ? -1 : null);
        setViewerNextIndexOverride(selectedFile ? 0 : null);
    }

    async function openRandomFile() {
        if (mediaTotal === 0) {
            return;
        }

        await openFileAtIndex(Math.floor(Math.random() * mediaTotal));
    }

    function openLoadedFile(fileId: string) {
        const fileIndex = visibleFiles.findIndex((file) => file.id === fileId);
        setSelectedExternalFile(null);
        setSelectedFileIndexOverride(fileIndex >= 0 ? fileIndex : null);
        setViewerNextIndexOverride(null);
        setSelectedFileId(fileId);
    }

    async function openFileAtIndex(index: number) {
        if (mediaTotal === 0) {
            return;
        }

        const normalizedIndex = ((index % mediaTotal) + mediaTotal) % mediaTotal;
        const loadedFile = visibleFiles[normalizedIndex];

        if (loadedFile) {
            setSelectedExternalFile(null);
            setSelectedFileIndexOverride(normalizedIndex);
            setViewerNextIndexOverride(null);
            setSelectedFileId(loadedFile.id);
            maybeLoadMoreForViewer(normalizedIndex);
            return;
        }

        const response = await apiClient.explorer.contents(adminSession.adminKey, {
            filter,
            folderId: activeFolderId,
            limit: 1,
            offset: normalizedIndex,
            search: searchQuery,
            shuffleSeed,
            sort
        });
        const [media] = response.media;

        if (!media) {
            return;
        }

        const file = apiMediaToExplorerFile(media);
        setSelectedExternalFile(file);
        setSelectedFileIndexOverride(normalizedIndex);
        setViewerNextIndexOverride(null);
        setSelectedFileId(file.id);
        maybeLoadMoreForViewer(normalizedIndex);
    }

    function navigateViewerByOffset(offset: number) {
        if (viewerNextIndexOverride !== null && offset > 0) {
            void openFileAtIndex(viewerNextIndexOverride);
            return;
        }

        void openFileAtIndex(selectedFileIndex + offset);
    }

    function maybeLoadMoreForViewer(index: number) {
        if (index >= visibleFiles.length - 2 && visibleFiles.length < mediaTotal) {
            loadMoreMedia();
        }
    }

    function toggleFavorite(fileId: string) {
        const file = visibleFiles.find((candidate) => candidate.id === fileId);
        void favoriteMutation.mutateAsync({ favorite: !file?.favorite, fileId });
    }

    function updateFileTags(fileId: string, tags: string[]) {
        void tagsMutation.mutateAsync({ fileId, tags });
    }

    function createFolder(folderName: string) {
        const name = folderName.trim();

        if (!name) {
            return;
        }

        void createFolderMutation.mutateAsync(name);
    }

    function deleteFiles(fileIds: string[]) {
        if (fileIds.length === 0) {
            return;
        }

        if (selectedFileId && fileIds.includes(selectedFileId)) {
            setSelectedFileId(null);
        }

        void deleteFilesMutation.mutateAsync(fileIds);
    }

    function moveFiles(fileIds: string[], folderId: string | null) {
        if (fileIds.length === 0) {
            return;
        }

        void moveFilesMutation.mutateAsync({ fileIds, folderId });
    }

    async function uploadExplorerMedia(input: UploadModalSubmitInput) {
        if (uploadInProgress) {
            return;
        }

        const uploadAbortController = new AbortController();
        uploadAbortControllerRef.current = uploadAbortController;
        setUploadInProgress(true);
        setUploadProgress({ isActive: true, label: "Preparing upload...", percent: 0 });

        const fileBytes = input.files.reduce((total, file) => total + Math.max(file.size, 1), 0);
        const remoteUnits = input.remoteItems.length;
        const totalUnits = Math.max(fileBytes + remoteUnits, 1);
        let completedUnits = 0;
        const loadedFileBytes = new Map<File, number>();

        function updateProgress(label: string, currentLoaded = 0) {
            setUploadProgress({
                isActive: true,
                label,
                percent: ((completedUnits + currentLoaded) / totalUnits) * 100
            });
        }

        function updateConcurrentFileProgress(label: string) {
            const loadedBytes = Array.from(loadedFileBytes.values()).reduce((total, value) => total + value, 0);
            updateProgress(label, loadedBytes);
        }

        try {
            if (input.files.length > 0) {
                input.files.forEach((file) => loadedFileBytes.set(file, 0));
                updateConcurrentFileProgress(`Uploading ${input.files.length} file${input.files.length === 1 ? "" : "s"}...`);

                await Promise.all(
                    input.files.map(async (file) => {
                        await apiClient.explorer.uploadFileWithProgress(
                            adminSession.adminKey,
                            file,
                            input.folderId,
                            (loaded) => {
                                loadedFileBytes.set(file, Math.min(loaded, Math.max(file.size, 1)));
                                updateConcurrentFileProgress(`Uploading ${input.files.length} file${input.files.length === 1 ? "" : "s"}...`);
                            },
                            uploadAbortController.signal
                        );
                        loadedFileBytes.set(file, Math.max(file.size, 1));
                    })
                );

                completedUnits += fileBytes;
                loadedFileBytes.clear();
                updateProgress(`Uploaded ${input.files.length} file${input.files.length === 1 ? "" : "s"}`);
            }

            if (input.remoteItems.length > 0) {
                updateProgress(`Adding ${input.remoteItems.length} remote item${input.remoteItems.length === 1 ? "" : "s"}...`);
                await apiClient.explorer.addRemoteMedia(adminSession.adminKey, {
                    folderId: input.folderId,
                    items: input.remoteItems.map((item) => ({
                        thumbnailUrl: item.thumbnailUrl,
                        title: item.title,
                        url: item.url
                    }))
                }, uploadAbortController.signal);
                completedUnits += input.remoteItems.length;
                updateProgress(`Added ${input.remoteItems.length} remote item${input.remoteItems.length === 1 ? "" : "s"}`);
            }

            setUploadProgress({ isActive: true, label: "Upload complete", percent: 100 });
            await invalidateExplorerQueries();
            setUploadModalOpen(false);
            setUploadMinimized(false);
        } catch (error) {
            if (uploadAbortController.signal.aborted) {
                resetUploadState();
                return;
            }

            setUploadProgress({
                isActive: true,
                label: error instanceof Error ? error.message : "Upload failed",
                percent: 0
            });
            throw error;
        } finally {
            if (uploadAbortControllerRef.current === uploadAbortController) {
                uploadAbortControllerRef.current = null;
            }
            setUploadInProgress(false);
            window.setTimeout(() => {
                setUploadProgress((current) => (current.percent >= 100 ? { isActive: false, label: "Preparing upload...", percent: 0 } : current));
            }, 650);
        }
    }

    function resetUploadState() {
        setUploadInProgress(false);
        setUploadMinimized(false);
        setUploadModalOpen(false);
        setUploadProgress({ isActive: false, label: "Preparing upload...", percent: 0 });
    }

    function closeUploadModal() {
        if (uploadAbortControllerRef.current) {
            uploadAbortControllerRef.current.abort();
            return;
        }

        resetUploadState();
    }

    function invalidateExplorerQueries() {
        return Promise.all([
            queryClient.invalidateQueries({ queryKey: ["explorer-folders", adminSession.adminKey] }),
            queryClient.invalidateQueries({ queryKey: ["explorer-contents", adminSession.adminKey] })
        ]);
    }

    if (!adminSession.isUnlocked && !adminSession.isChecking) {
        return <SignIn isChecking={adminSession.isChecking} isInvalid={adminSession.isInvalid} onUnlock={adminSession.unlock} />;
    }

    if (adminSession.isChecking) {
        return <LoadingScreen label="Checking admin key..." />;
    }

    return (
        <section className="explorer-shell page-full">
            <Directory
                activeFolderId={activeFolderId}
                folders={allFolders}
                onFolderSelect={selectFolder}
                storageTotal={180_000_000_000}
                storageUsed={storageUsed}
                totalItems={allFolders.length + visibleFiles.length}
            />
            <ContentArea
                activeFolder={activeFolder}
                allFolders={allFolders}
                autoEnabled={autoEnabled}
                favoriteIds={favoriteIds}
                files={visibleFiles}
                filter={filter}
                folders={visibleFolders}
                isLoadingFiles={
                    foldersQuery.isLoading || 
                    contentsQuery.isLoading || 
                    (contentsQuery.isPlaceholderData && contentsQuery.isFetching && mediaLimit === mediaPageSize)
                }
                isLoadingMoreFiles={contentsQuery.isPlaceholderData && contentsQuery.isFetching && mediaLimit > mediaPageSize}
                loopEnabled={loopEnabled}
                onAutoToggle={() => setAutoEnabled((current) => !current)}
                onFavoriteToggle={toggleFavorite}
                onFileTagsChange={updateFileTags}
                onFolderBack={goUpOneFolder}
                onFilterChange={setFilter}
                onFilesDelete={deleteFiles}
                onFilesMove={moveFiles}
                onFolderCreate={createFolder}
                onFolderOpen={selectFolder}
                onLoopToggle={() => setLoopEnabled((current) => !current)}
                onLoadMoreFiles={loadMoreMedia}
                onMediaPageSizeChange={updateMediaPageSize}
                autoAdvanceSettings={autoAdvanceSettings}
                onModalClose={() => {
                    setSelectedFileId(null);
                    setSelectedExternalFile(null);
                    setSelectedFileIndexOverride(null);
                    setViewerNextIndexOverride(null);
                }}
                onRandomFile={() => void openRandomFile()}
                onSelectedFileChange={openLoadedFile}
                onSearchChange={setSearchQuery}
                onSettingsOpen={() => navigate("/settings")}
                onShuffleFiles={shuffleVisibleFiles}
                onSortChange={setSort}
                onUploadOpen={() => {
                    setUploadMinimized(false);
                    setUploadModalOpen(true);
                }}
                onViewChange={(next: ExplorerView) => {
                    setView(next);
                    try {
                        localStorage.setItem("explorer.view", next);
                    } catch {
                        // ignore
                    }
                }}
                searchQuery={searchQuery}
                selectedFile={selectedFile}
                selectedFileIndex={selectedFileIndex}
                shuffleEnabled={shuffleSeed > 0}
                sort={sort}
                totalFiles={mediaTotal}
                canLoadMoreFiles={canLoadMoreMedia}
                onViewerNavigateByOffset={navigateViewerByOffset}
                view={view}
            />
            {uploadModalOpen && !uploadMinimized ? (
                <UploadModal
                    currentFolderId={activeFolderId}
                    folders={allFolders}
                    isUploading={uploadInProgress}
                    progress={uploadProgress}
                    onClose={closeUploadModal}
                    onMinimize={() => setUploadMinimized(true)}
                    onSubmit={uploadExplorerMedia}
                />
            ) : null}
            {uploadMinimized && uploadProgress.isActive ? (
                <motion.aside
                    className="explorer-upload-minimized"
                    aria-label="Upload progress"
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => setUploadMinimized(false)}
                >
                    <UploadProgress progress={uploadProgress} />
                </motion.aside>
            ) : null}
        </section>
    );
}

export default Explorer;
