import SignIn from "../components/SignIn";
import { ContentArea } from "../components/explorer/ContentArea";
import { Directory } from "../components/explorer/Directory";
import { inferContentType, UploadModal, type UploadModalSubmitInput } from "../components/explorer/UploadModal";
import { explorerFolders, sampleExplorerFiles } from "../components/explorer/mockExplorerData";
import { type ExplorerFile, type ExplorerFilter, type ExplorerSort, type ExplorerView, uploadToExplorerFile } from "../components/explorer/types";
import { apiClient } from "../shared/apiClient";
import { LoadingScreen } from "../shared/Loading";
import { useAdminSession } from "../shared/useAdminSession";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { setDocumentTitle } from "../shared/siteConfig";

function Explorer() {
    const adminSession = useAdminSession();
    const queryClient = useQueryClient();
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
    const [autoEnabled, setAutoEnabled] = useState(false);
    const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
    const [filter, setFilter] = useState<ExplorerFilter>("all");
    const [loopEnabled, setLoopEnabled] = useState(false);
    const [localFiles, setLocalFiles] = useState<ExplorerFile[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [shuffleSeed, setShuffleSeed] = useState(0);
    const [sort, setSort] = useState<ExplorerSort>("newest");
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [view, setView] = useState<ExplorerView>("medium");

    useEffect(() => {
        setDocumentTitle("Private Explorer");
    }, []);

    const uploads = useQuery({
        queryKey: ["uploads", adminSession.adminKey],
        queryFn: () => apiClient.uploads.list(adminSession.adminKey),
        enabled: adminSession.isUnlocked,
        retry: false
    });

    const uploadMedia = useMutation({
        mutationFn: uploadExplorerMedia
    });

    const activeFolder = useMemo(
        () => explorerFolders.find((folder) => folder.id === activeFolderId) ?? null,
        [activeFolderId]
    );

    const folderPath = useMemo(() => {
        const path = [];
        let currentFolder = activeFolder;

        while (currentFolder) {
            path.unshift(currentFolder);
            currentFolder = explorerFolders.find((folder) => folder.id === currentFolder?.parentId) ?? null;
        }

        return path;
    }, [activeFolder]);

    const visibleFolders = useMemo(
        () => explorerFolders.filter((folder) => folder.parentId === activeFolderId),
        [activeFolderId]
    );

    const allFiles = useMemo<ExplorerFile[]>(() => {
        const uploadedFiles = uploads.data?.map(uploadToExplorerFile) ?? [];
        return [...sampleExplorerFiles, ...uploadedFiles, ...localFiles];
    }, [localFiles, uploads.data]);

    const visibleFiles = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        const files = allFiles
            .filter((file) => (activeFolderId ? file.folderId === activeFolderId : file.folderId === null))
            .filter((file) => {
                if (filter === "all") {
                    return true;
                }

                return file.contentType.startsWith(`${filter}/`);
            })
            .filter((file) => (query.length === 0 ? true : file.name.toLowerCase().includes(query)))
            .sort((a, b) => {
                if (sort === "name") {
                    return a.name.localeCompare(b.name);
                }

                const aTime = new Date(a.createdAt).getTime();
                const bTime = new Date(b.createdAt).getTime();
                return sort === "oldest" ? aTime - bTime : bTime - aTime;
            });

        if (shuffleSeed === 0) {
            return files;
        }

        return shuffleFiles(files, shuffleSeed);
    }, [activeFolderId, allFiles, filter, searchQuery, shuffleSeed, sort]);

    const selectedFile = useMemo(
        () => visibleFiles.find((file) => file.id === selectedFileId) ?? null,
        [selectedFileId, visibleFiles]
    );

    useEffect(() => {
        if (selectedFileId && !visibleFiles.some((file) => file.id === selectedFileId)) {
            setSelectedFileId(null);
        }
    }, [selectedFileId, visibleFiles]);

    function selectFolder(folderId: string | null) {
        setActiveFolderId(folderId);
        setSelectedFileId(null);
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
        setFavoriteIds((current) => (current.includes(fileId) ? current.filter((id) => id !== fileId) : [...current, fileId]));
    }

    async function uploadExplorerMedia(input: UploadModalSubmitInput) {
        const uploadedFiles = await Promise.all(
            input.files.map(async (file) => {
                const upload = await apiClient.uploads.create(adminSession.adminKey, file);
                return {
                    ...uploadToExplorerFile(upload),
                    folderId: input.folderId
                };
            })
        );

        const remoteFiles = input.remoteItems.map<ExplorerFile>((item) => ({
            id: item.id,
            name: item.title || item.url,
            contentType: inferContentType(item.url),
            createdAt: new Date().toISOString(),
            folderId: input.folderId,
            previewUrl: item.thumbnailUrl || item.url,
            size: 0,
            tags: [],
            url: item.url
        }));

        setLocalFiles((current) => [...remoteFiles, ...uploadedFiles, ...current]);
        setUploadModalOpen(false);
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
                folders={explorerFolders}
                onFolderSelect={selectFolder}
                storageTotal={180_000_000_000}
                storageUsed={allFiles.reduce((total, file) => total + file.size, 0)}
                totalItems={explorerFolders.length + allFiles.length}
            />
            <ContentArea
                activeFolder={activeFolder}
                autoEnabled={autoEnabled}
                favoriteIds={favoriteIds}
                files={visibleFiles}
                filter={filter}
                folderPath={folderPath}
                folders={visibleFolders}
                isLoadingFiles={uploads.isLoading}
                loopEnabled={loopEnabled}
                onAutoToggle={() => setAutoEnabled((current) => !current)}
                onFavoriteToggle={toggleFavorite}
                onFilterChange={setFilter}
                onFolderOpen={selectFolder}
                onHomeOpen={() => selectFolder(null)}
                onLock={lockDashboard}
                onLoopToggle={() => setLoopEnabled((current) => !current)}
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
                view={view}
            />
            {uploadModalOpen ? (
                <UploadModal
                    currentFolderId={activeFolderId}
                    folders={explorerFolders}
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
