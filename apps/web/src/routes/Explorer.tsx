import SignIn from "../components/SignIn";
import { ContentArea } from "../components/explorer/ContentArea";
import { Directory } from "../components/explorer/Directory";
import { UploadModal, type UploadModalSubmitInput } from "../components/explorer/UploadModal";
import { apiFolderToExplorerFolder, apiMediaToExplorerFile, type ExplorerFile, type ExplorerFilter, type ExplorerSort, type ExplorerView } from "../components/explorer/types";
import { apiClient } from "../shared/apiClient";
import { LoadingScreen } from "../shared/Loading";
import { useAdminSession } from "../shared/useAdminSession";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { setDocumentTitle } from "../shared/siteConfig";

function Explorer() {
    const adminSession = useAdminSession();
    const queryClient = useQueryClient();
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
    const [autoEnabled, setAutoEnabled] = useState(false);
    const [filter, setFilter] = useState<ExplorerFilter>("all");
    const [loopEnabled, setLoopEnabled] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [shuffleSeed, setShuffleSeed] = useState(0);
    const [sort, setSort] = useState<ExplorerSort>("newest");
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [view, setView] = useState<ExplorerView>("medium");
    const [mediaPageSize, setMediaPageSize] = useState(60);
    const [mediaLimit, setMediaLimit] = useState(mediaPageSize);

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
        queryKey: ["explorer-contents", adminSession.adminKey, activeFolderId, filter, searchQuery, sort, mediaLimit],
        queryFn: () =>
            apiClient.explorer.contents(adminSession.adminKey, {
                filter,
                folderId: activeFolderId,
                limit: mediaLimit,
                search: searchQuery,
                sort
            }),
        enabled: adminSession.isUnlocked,
        placeholderData: (previousData) => previousData,
        retry: false
    });

    const uploadMedia = useMutation({
        mutationFn: uploadExplorerMedia,
        onSuccess: () => {
            setUploadModalOpen(false);
            void invalidateExplorerQueries();
        }
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

    const allFolders = useMemo(() => foldersQuery.data?.map((folder) => apiFolderToExplorerFolder(folder)) ?? [], [foldersQuery.data]);

    const activeFolder = useMemo(
        () => allFolders.find((folder) => folder.id === activeFolderId) ?? null,
        [activeFolderId, allFolders]
    );

    const visibleFolders = useMemo(() => contentsQuery.data?.folders.map((folder) => apiFolderToExplorerFolder(folder)) ?? [], [contentsQuery.data]);

    const visibleFiles = useMemo(() => {
        const files = contentsQuery.data?.media.map(apiMediaToExplorerFile) ?? [];

        if (shuffleSeed === 0) {
            return files;
        }

        return shuffleFiles(files, shuffleSeed);
    }, [contentsQuery.data, shuffleSeed]);

    const favoriteIds = useMemo(() => visibleFiles.filter((file) => file.favorite).map((file) => file.id), [visibleFiles]);
    const mediaTotal = contentsQuery.data?.mediaTotal ?? visibleFiles.length;
    const canLoadMoreMedia = visibleFiles.length < mediaTotal;

    const selectedFile = useMemo(
        () => visibleFiles.find((file) => file.id === selectedFileId) ?? null,
        [selectedFileId, visibleFiles]
    );

    useEffect(() => {
        if (selectedFileId && !visibleFiles.some((file) => file.id === selectedFileId)) {
            setSelectedFileId(null);
        }
    }, [selectedFileId, visibleFiles]);

    useEffect(() => {
        setMediaLimit(mediaPageSize);
    }, [activeFolderId, filter, mediaPageSize, searchQuery, sort]);

    const updateMediaPageSize = useCallback((nextPageSize: number) => {
        setMediaPageSize((current) => (current === nextPageSize ? current : nextPageSize));
    }, []);

    const loadMoreMedia = useCallback(() => {
        setMediaLimit((current) => current + mediaPageSize);
    }, [mediaPageSize]);

    function selectFolder(folderId: string | null) {
        setActiveFolderId(folderId);
        setSelectedFileId(null);
    }

    function goUpOneFolder() {
        if (!activeFolder) {
            return;
        }

        selectFolder(activeFolder.parentId);
    }

    function shuffleVisibleFiles() {
        setShuffleSeed((current) => current + 1);
    }

    function openRandomFile() {
        if (visibleFiles.length === 0) {
            return;
        }

        const randomFile = visibleFiles[Math.floor(Math.random() * visibleFiles.length)];
        if (randomFile) {
            setSelectedFileId(randomFile.id);
        }
    }

    function toggleFavorite(fileId: string) {
        const file = visibleFiles.find((candidate) => candidate.id === fileId);
        void favoriteMutation.mutateAsync({ favorite: !file?.favorite, fileId });
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
        await Promise.all(input.files.map((file) => apiClient.explorer.uploadFile(adminSession.adminKey, file, input.folderId)));

        if (input.remoteItems.length > 0) {
            await apiClient.explorer.addRemoteMedia(adminSession.adminKey, {
                folderId: input.folderId,
                items: input.remoteItems.map((item) => ({
                    thumbnailUrl: item.thumbnailUrl,
                    title: item.title,
                    url: item.url
                }))
            });
        }
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

    function lockDashboard() {
        adminSession.lock();
        void queryClient.invalidateQueries({ queryKey: ["admin-session"] });
    }

    return (
        <section className="explorer-shell page-full">
            <Directory
                activeFolderId={activeFolderId}
                folders={allFolders}
                onFolderSelect={selectFolder}
                storageTotal={180_000_000_000}
                storageUsed={visibleFiles.reduce((total, file) => total + file.size, 0)}
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
                isLoadingFiles={contentsQuery.isLoading || foldersQuery.isLoading}
                isLoadingMoreFiles={contentsQuery.isFetching && !contentsQuery.isLoading}
                loopEnabled={loopEnabled}
                onAutoToggle={() => setAutoEnabled((current) => !current)}
                onFavoriteToggle={toggleFavorite}
                onFolderBack={goUpOneFolder}
                onFilterChange={setFilter}
                onFilesDelete={deleteFiles}
                onFilesMove={moveFiles}
                onFolderCreate={createFolder}
                onFolderOpen={selectFolder}
                onLock={lockDashboard}
                onLoopToggle={() => setLoopEnabled((current) => !current)}
                onLoadMoreFiles={loadMoreMedia}
                onMediaPageSizeChange={updateMediaPageSize}
                onModalClose={() => setSelectedFileId(null)}
                onRandomFile={openRandomFile}
                onSelectedFileChange={setSelectedFileId}
                onSearchChange={setSearchQuery}
                onShuffleFiles={shuffleVisibleFiles}
                onSortChange={setSort}
                onUploadOpen={() => setUploadModalOpen(true)}
                onViewChange={setView}
                searchQuery={searchQuery}
                selectedFile={selectedFile}
                sort={sort}
                totalFiles={mediaTotal}
                canLoadMoreFiles={canLoadMoreMedia}
                view={view}
            />
            {uploadModalOpen ? (
                <UploadModal
                    currentFolderId={activeFolderId}
                    folders={allFolders}
                    isUploading={uploadMedia.isPending}
                    onClose={() => setUploadModalOpen(false)}
                    onSubmit={(input) => uploadMedia.mutateAsync(input)}
                />
            ) : null}
        </section>
    );
}

export default Explorer;

function shuffleFiles(files: ExplorerFile[], seed: number) {
    const result = [...files];
    let value = seed || 1;

    function random() {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
    }

    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
    }

    return result;
}
