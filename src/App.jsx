import "./App.css";
import { useState, useEffect } from "react";
import { useFetchWorktrees } from "./features/worktrees/hooks/useFetchWorktrees.js";
import { AddWorktreeModal } from "./features/worktrees/AddWorktreeModal.jsx";
import { WorktreeList } from "./features/worktrees/WorktreeList.jsx";
import { RepoList } from "./features/repos/RepoList.jsx";
import { Command } from "@tauri-apps/plugin-shell";
import { invoke } from "@tauri-apps/api/core";
import { getRepos, addRepo, removeRepo } from "./lib/storage.js";
import { ToastProvider, useToast } from "./contexts/ToastContext.jsx";

function parseGitError(stderr, context) {
  const lower = stderr.toLowerCase();

  if (lower.includes("is already checked out at")) {
    const branch = context.branch || context.branchName || "";
    return `Branch '${branch}' is already checked out in another worktree.`;
  }

  if (lower.includes("already exists")) {
    if (context.isRemote && context.branch) {
      const localName = context.branch.replace(/^[^/]+\//, '');
      return `Cannot checkout '${context.branch}': a local branch named '${localName}' already exists. Delete it first or choose a different worktree name.`;
    }
    const branchName = context.branchName || context.worktreeName || "";
    return `A branch named '${branchName}' already exists. Choose a different branch name.`;
  }

  if (lower.includes("did not match any") || lower.includes("invalid reference") || lower.includes("not a valid")) {
    const branch = context.branch || context.baseBranch || "";
    return `Branch '${branch}' was not found in this repository.`;
  }

  // Fallback: strip "fatal:" / "error:" prefix from git's raw message
  return stderr.replace(/^(fatal|error):\s*/im, '').trim() || "Failed to create worktree.";
}

function App() {
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [view, setView] = useState('repo-list');
  const [isAddWorktreeOpen, setIsAddWorktreeOpen] = useState(false);
  const [addWorktreeError, setAddWorktreeError] = useState("");
  const [formError, setFormError] = useState("");

  const {worktreeResult, refresh: refreshWorktrees} = useFetchWorktrees(selectedRepo?.path);

  useEffect(() => {
    const loadedRepos = getRepos();
    setRepos(loadedRepos);
  }, []);

  const handleBrowseDirectory = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Git Repository Directory',
      });

      if (selected) {
        setFormError(""); // Clear any previous errors

        // Check if the path is a git repository
        try {
          const isGitRepo = await invoke("is_git_repository", { repoPath: selected.trim() });

          if (!isGitRepo) {
            setFormError("Only git repositories can be added.");
            return;
          }
        } catch (error) {
          setFormError("Failed to validate repository. Please check the path and try again.");
          return;
        }

        // Add the repository
        const result = addRepo(selected);

        if (result.success) {
          setRepos(getRepos());
        } else {
          setFormError(result.message);
        }
      }
    } catch (error) {
      console.error('Failed to open directory picker:', error);
      setFormError('Failed to open directory picker.');
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

  const handleAddWorktreeSubmit = async (payload) => {
    handleCloseAddWorktreeModal();
    setAddWorktreeError("");

    if (!selectedRepo) {
      setAddWorktreeError("Repository path is required to add a worktree.");
      return;
    }

    const worktreeRoot = `${selectedRepo.path}-worktrees`;
    const worktreePath = `${worktreeRoot}/${payload.worktreeName.trim()}`;

    try {
      let result;

      if (payload.mode === 'checkout') {
        const { branch, isRemote } = payload;
        if (isRemote) {
          const localBranchName = branch.replace(/^[^/]+\//, '');
          const command = Command.create("git-worktree-add-checkout-remote", [
            "worktree", "add", "--track", "-b", localBranchName, worktreePath, branch,
          ], { cwd: selectedRepo.path });
          result = await command.execute();
        } else {
          const command = Command.create("git-worktree-add-checkout-local", [
            "worktree", "add", worktreePath, branch,
          ], { cwd: selectedRepo.path });
          result = await command.execute();
        }
      } else {
        const { baseBranch, branchName } = payload;
        const command = Command.create("git-worktree-add", [
          "worktree", "add", worktreePath, "-b", branchName, baseBranch,
        ], { cwd: selectedRepo.path });
        result = await command.execute();

        if (result.code === 0) {
          // Unset upstream — best-effort, non-critical
          try {
            const unsetCmd = Command.create("git-branch-unset-upstream", [
              "branch", "--unset-upstream", branchName,
            ], { cwd: selectedRepo.path });
            await unsetCmd.execute();
          } catch {
            // ignore — not having upstream set is still fine
          }
        }
      }

      if (result.code === 0) {
        refreshWorktrees();
      } else {
        setAddWorktreeError(parseGitError(result.stderr || "", payload));
      }
    } catch (error) {
      setAddWorktreeError(error?.message || "Failed to add worktree.");
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
            <div className="input-group">
              <button type="button" onClick={handleBrowseDirectory} style={{ width: '100%' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Browse to Add Repository
              </button>
            </div>
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
              worktreeData={worktreeResult}
              refreshWorktrees={refreshWorktrees}
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


function WorkTrees({ repo, onAddWorktree, onBack, worktreeData, refreshWorktrees }) {
  const { loading, error: errorMessage, worktrees, prunableWorktrees } = worktreeData;
  const { showToast } = useToast();
  const [isFetching, setIsFetching] = useState(false);

  const handleFetchAll = async () => {
    if (isFetching) return;
    setIsFetching(true);
    try {
      const command = Command.create("git-fetch-all", ["fetch", "--all"], { cwd: repo.path });
      const result = await command.execute();
      if (result.code === 0) {
        showToast("Fetched from all remotes", "success");
      } else {
        showToast(`Fetch failed: ${result.stderr || "Unknown error"}`, "error");
      }
    } catch (error) {
      showToast(`Fetch failed: ${error.message || "Unknown error"}`, "error");
    } finally {
      setIsFetching(false);
    }
  };
  const openWithTargets = {
    antigravity: {
      label: "Antigravity",
      launchers: [
        { name: "open-antigravity-by-name", args: ["-a", "Antigravity"] },
        { name: "open-antigravity-by-bundle", args: ["-b", "com.google.antigravity"] },
        { name: "open-antigravity-by-app-path", args: ["-a", "/Applications/Antigravity.app"] }
      ]
    },
    codex: {
      label: "Codex",
      launchers: [
        { name: "open-codex-by-name", args: ["-a", "Codex"] },
        { name: "open-codex-by-bundle", args: ["-b", "com.openai.codex"] },
        { name: "open-codex-by-app-path", args: ["-a", "/Applications/Codex.app"] }
      ]
    },
    "intellij-idea": {
      label: "Intellij Idea",
      launchers: [
        { name: "open-intellij-by-name", args: ["-a", "IntelliJ IDEA"] },
        { name: "open-intellij-by-bundle", args: ["-b", "com.jetbrains.intellij"] },
        { name: "open-intellij-by-user-app-path", args: ["-a", "/Users/dhavalshah/Applications/IntelliJ IDEA.app"] },
        { name: "open-intellij-by-system-app-path", args: ["-a", "/Applications/IntelliJ IDEA.app"] }
      ]
    },
    cursor: {
      label: "Cursor",
      launchers: [
        { name: "open-cursor-by-name", args: ["-a", "Cursor"] },
        { name: "open-cursor-by-bundle", args: ["-b", "com.todesktop.230313mzl4w4u92"] },
        { name: "open-cursor-by-app-path", args: ["-a", "/Applications/Cursor.app"] }
      ]
    },
    "android-studio": {
      label: "Android Studio",
      launchers: [
        { name: "open-android-studio-by-name", args: ["-a", "Android Studio"] },
        { name: "open-android-studio-by-bundle", args: ["-b", "com.google.android.studio"] },
        { name: "open-android-studio-by-app-path", args: ["-a", "/Applications/Android Studio.app"] }
      ]
    },
    webstorm: {
      label: "WebStorm",
      launchers: [
        { name: "open-webstorm-by-name", args: ["-a", "WebStorm"] },
        { name: "open-webstorm-by-bundle", args: ["-b", "com.jetbrains.webstorm"] },
        { name: "open-webstorm-by-app-path", args: ["-a", "/Applications/WebStorm.app"] }
      ]
    },
    terminal: {
      label: "Terminal",
      launchers: [
        { name: "open-terminal-by-name", args: ["-a", "Terminal"] },
        { name: "open-terminal-by-bundle", args: ["-b", "com.apple.Terminal"] },
        { name: "open-terminal-by-app-path", args: ["-a", "/Applications/Utilities/Terminal.app"] }
      ]
    },
    ghostty: {
      label: "Ghostty",
      launchers: [
        { name: "open-ghostty-by-name", args: ["-a", "Ghostty"] },
        { name: "open-ghostty-by-bundle", args: ["-b", "com.mitchellh.ghostty"] },
        { name: "open-ghostty-by-app-path", args: ["-a", "/Applications/Ghostty.app"] }
      ]
    },
    claude: {
      label: "Claude",
      launchers: [
        { name: "open-claude-by-name", args: ["-a", "Claude"] },
        { name: "open-claude-by-bundle", args: ["-b", "com.anthropic.claudefordesktop"] },
        { name: "open-claude-by-app-path", args: ["-a", "/Applications/Claude.app"] }
      ]
    }
  };

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
        refreshWorktrees()
      } else {
        showToast(`Failed to remove worktree: ${result.stderr || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      showToast(`Failed to remove worktree: ${error.message || 'Unknown error'}`, 'error');
      console.error("Failed to remove worktree:", error);
    }
  };

  const handleOpenWith = async (worktree, target) => {
    const targetConfig = openWithTargets[target];
    if (!targetConfig) {
      showToast("Unsupported open target selected.", "error");
      return;
    }
    const { label, launchers } = targetConfig;

    if (!worktree?.path) {
      showToast("Invalid worktree path.", "error");
      return;
    }

    let lastError = "Unknown error";
    for (const launcher of launchers) {
      try {
        const command = Command.create(launcher.name, [worktree.path, ...launcher.args]);
        const result = await command.execute();
        if (result.code === 0) {
          showToast(`Opened "${worktree.branch || "worktree"}" in ${label}`, "success");
          return;
        }

        lastError = result.stderr || result.stdout || `Exit code ${result.code}`;
      } catch (error) {
        lastError = error?.message || "Unknown error";
      }
    }

    showToast(`Failed to open in ${label}: ${lastError}`, "error");
    console.error("Failed to open worktree path:", {
      target,
      worktreePath: worktree.path,
      error: lastError
    });
  };

  const handleOpenWithSafe = async (worktree, target) => {
    const label = openWithTargets[target]?.label || "selected app";
    try {
      await handleOpenWith(worktree, target);
    } catch (error) {
      const message = error?.message || "Unknown error";
      showToast(`Failed to open in ${label}: ${message}`, "error");
      console.error("Failed to run open with action:", error);
    }
  };

  const handlePruneWorktrees = async () => {
    try {
      const command = Command.create("git-worktree-prune", [
        "worktree",
        "prune",
        "--verbose"
      ], {
        cwd: repo.path,
      });

      const result = await command.execute();
      if (result.code === 0) {
        showToast('Worktrees pruned successfully', 'success');
        refreshWorktrees();
      } else {
        showToast(`Failed to prune worktrees: ${result.stderr || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      showToast(`Failed to prune worktrees: ${error.message || 'Unknown error'}`, 'error');
      console.error("Failed to prune worktrees:", error);
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
            <button
              type="button"
              className={`fetch-icon-btn${isFetching ? " fetching" : ""}`}
              title="Fetch from all remotes"
              onClick={handleFetchAll}
              disabled={isFetching}
              aria-label="Fetch from all remotes"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
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
          prunableWorktrees={prunableWorktrees}
          onDeleteWorktree={handleDeleteWorktree}
          onOpenWith={handleOpenWithSafe}
          onPrune={handlePruneWorktrees}
        />
      )}
    </div>
  );
}

export default App;
