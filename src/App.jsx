import "./App.css";
import { useState, useEffect } from "react";
import { useFetchWorktrees } from "./features/worktrees/hooks/useFetchWorktrees.js";
import { AddWorktreeModal } from "./features/worktrees/AddWorktreeModal.jsx";
import { WorktreeList } from "./features/worktrees/WorktreeList.jsx";
import { RepoList } from "./features/repos/RepoList.jsx";
import { Command } from "@tauri-apps/plugin-shell";
import { getRepos, addRepo, removeRepo } from "./lib/storage.js";
import { ToastProvider, useToast } from "./contexts/ToastContext.jsx";

function App() {
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [view, setView] = useState('repo-list');
  const [isAddWorktreeOpen, setIsAddWorktreeOpen] = useState(false);
  const [addWorktreeError, setAddWorktreeError] = useState("");
  const [formError, setFormError] = useState("");

  const worktreeData = useFetchWorktrees(selectedRepo?.path);

  useEffect(() => {
    const loadedRepos = getRepos();
    setRepos(loadedRepos);
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const formData = new FormData(e.target);
    const path = formData.get("repoPath");

    if (!path || !path.trim()) {
      setFormError("Please enter a repository path.");
      return;
    }

    const result = addRepo(path);

    if (result.success) {
      setRepos(getRepos());
      e.target.reset();
    } else {
      setFormError(result.message);
    }
  };

  const handleSelectRepo = (repo) => {
    setSelectedRepo(repo);
    setView('worktrees');
  };

  const handleBackToRepoList = () => {
    setSelectedRepo(null);
    setView('repo-list');
  };

  const handleDeleteRepo = (repoId) => {
    const success = removeRepo(repoId);
    if (success) {
      setRepos(getRepos());
      if (selectedRepo && selectedRepo.id === repoId) {
        handleBackToRepoList();
      }
    }
  };

  const handleCloseAddWorktreeModal = () => {
    setIsAddWorktreeOpen(false);
  };

  const handleOpenAddWorktree = () => {
    setIsAddWorktreeOpen(true);
  };

  const handleDismissAddWorktreeError = () => {
    setAddWorktreeError("");
  };

  const handleAddWorktreeSubmit = async (name, baseBranch) => {
    handleCloseAddWorktreeModal();
    setAddWorktreeError("");

    if (!selectedRepo) {
      setAddWorktreeError("Repository path is required to add a worktree.");
      return;
    }

    const trimmedName = name.trim();
    const worktreeRoot = `${selectedRepo.path}-worktrees`;
    const worktreePath = `${worktreeRoot}/${trimmedName}`;

    try {
      const command = Command.create("git-worktree-add", [
        "worktree",
        "add",
        worktreePath,
        "-b",
        trimmedName,
        baseBranch,
      ], {
        cwd: selectedRepo.path,
      });
      const result = await command.execute();
      console.log(result);
    } catch (error) {
      const message = error?.message || "Failed to add worktree.";
      setAddWorktreeError(message);
    }
  };

  return (
    <ToastProvider>
      <div className="app">
        <header className="app-header">
          <h1>Worktree <span>Manager</span></h1>
        </header>

        <main className="container">
          {addWorktreeError && (
            <div className="banner banner-error" role="alert">
              <span>{addWorktreeError}</span>
              <button type="button" onClick={handleDismissAddWorktreeError}>
                Dismiss
              </button>
            </div>
          )}

          {formError && (
            <div className="banner banner-error" role="alert">
              <span>{formError}</span>
              <button type="button" onClick={() => setFormError("")}>
                Dismiss
              </button>
            </div>
          )}

          {view === 'repo-list' && (
            <form className="input-group" onSubmit={handleFormSubmit}>
              <input
                id="repoPath"
                name="repoPath"
                type="text"
                placeholder="Enter repository absolute path..."
              />
              <button type="submit">Add Repository</button>
            </form>
          )}

          {view === 'repo-list' ? (
            <RepoList
              repos={repos}
              onSelectRepo={handleSelectRepo}
              onDeleteRepo={handleDeleteRepo}
            />
          ) : (
            <WorkTrees
              repo={selectedRepo}
              onAddWorktree={handleOpenAddWorktree}
              onBack={handleBackToRepoList}
              worktreeData={worktreeData}
            />
          )}

          {isAddWorktreeOpen && (
            <AddWorktreeModal
              onClose={handleCloseAddWorktreeModal}
              onNameSubmit={handleAddWorktreeSubmit}
              repoPath={selectedRepo?.path}
            />
          )}
        </main>
      </div>
    </ToastProvider>
  );
}


function WorkTrees({ repo, onAddWorktree, onBack, worktreeData }) {
  const { loading, error: errorMessage, worktrees, refresh } = worktreeData;
  const { showToast } = useToast();

  const handleDeleteWorktree = async (worktree) => {
    try {
      const command = Command.create("git-worktree-remove", [
        "worktree",
        "remove",
        worktree.path,
        "--force"
      ], {
        cwd: repo.path,
      });

      const result = await command.execute();
      if (result.code === 0) {
        showToast(`Worktree "${worktree.branch}" deleted successfully`, 'success');
      } else {
        showToast(`Failed to remove worktree: ${result.stderr || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      showToast(`Failed to remove worktree: ${error.message || 'Unknown error'}`, 'error');
      console.error("Failed to remove worktree:", error);
    }
  };

  return (
    <div>
      <div className="view-header">
        <button type="button" onClick={onBack} className="btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="view-header-content">
          <h2 className="mb-0">
            {repo.name}
            <span
              className="path-icon-tooltip"
              title={`${repo.path} (click to copy)`}
              onClick={async () => {
                try {
                  const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
                  await writeText(repo.path);
                  showToast('Path copied to clipboard', 'success');
                } catch (error) {
                  console.error('Failed to copy path:', error);
                  showToast('Failed to copy path', 'error');
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </span>
          </h2>
        </div>
        <button type="submit" onClick={onAddWorktree}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Worktree
        </button>
      </div>

      {loading && (
        <div className="empty-state">
          <p>Loading worktrees...</p>
        </div>
      )}

      {errorMessage && (
        <div className="banner banner-error" role="alert">
          <span>{errorMessage}</span>
        </div>
      )}

      {!loading && !errorMessage && (
        <WorktreeList
          worktrees={worktrees}
          onDeleteWorktree={handleDeleteWorktree}
        />
      )}
    </div>
  );
}

export default App;
