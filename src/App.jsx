import "./App.css";
import { useState, useEffect } from "react";
import { useFetchWorktrees } from "./features/worktrees/hooks/useFetchWorktrees.js";
import { AddWorktreeModal } from "./features/worktrees/AddWorktreeModal.jsx";
import { RepoList } from "./features/repos/RepoList.jsx";
import { Command } from "@tauri-apps/plugin-shell";
import { getRepos, addRepo, removeRepo } from "./lib/storage.js";

function App() {
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [view, setView] = useState('repo-list'); // 'repo-list' | 'worktrees'
  const [isAddWorktreeOpen, setIsAddWorktreeOpen] = useState(false);
  const [addWorktreeError, setAddWorktreeError] = useState("");
  const [formError, setFormError] = useState("");

  const worktreeData = useFetchWorktrees(selectedRepo?.path);

  // Load repositories on mount
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
      e.target.reset(); // Clear the form
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
      // If the deleted repo was selected, go back to repo list
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
    <main className="container">
      <section>
        <h1>Worktree Manager</h1>

        {addWorktreeError && (
          <div className="banner" role="alert">
            <span>{addWorktreeError}</span>
            <button type="button" onClick={handleDismissAddWorktreeError}>
              Dismiss
            </button>
          </div>
        )}

        {formError && (
          <div className="banner" role="alert">
            <span>{formError}</span>
            <button type="button" onClick={() => setFormError("")}>
              Dismiss
            </button>
          </div>
        )}

        <form
          className="row"
          onSubmit={handleFormSubmit}
        >
          <input
            id="repoPath"
            name={"repoPath"}
            placeholder="Enter repository absolute path"
          />
          <button type="submit">Add</button>
        </form>
      </section>

      <section>
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
      </section>

      {isAddWorktreeOpen && (
        <AddWorktreeModal
          onClose={handleCloseAddWorktreeModal}
          onNameSubmit={handleAddWorktreeSubmit}
          repoPath={selectedRepo?.path}
        />
      )}
    </main>
  );
}



function WorkTrees({ repo, onAddWorktree, onBack, worktreeData }) {
  const { loading, error: errorMessage, worktrees, refresh } = worktreeData;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: '6px 12px',
            fontSize: '0.9em',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          ← Back to Repositories
        </button>
        <h2 style={{ margin: 0 }}>{repo.name}</h2>
      </div>
      <p style={{ fontSize: '0.9em', color: '#666', marginTop: '0' }}>{repo.path}</p>
      <button type="button" onClick={onAddWorktree}>
        Add Worktree
      </button>
      {loading && <p>Loading worktrees...</p>}
      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!loading && !errorMessage && worktrees.length === 0 && (
        <p>No worktrees found.</p>
      )}
      {!loading && !errorMessage && worktrees.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Path</th>
              <th>Head</th>
              <th>Branch</th>
            </tr>
          </thead>
          <tbody>
            {worktrees.map((worktree) => (
              <tr key={`${worktree.path}-${worktree.raw}`}>
                <td>{worktree.path}</td>
                <td>{worktree.head}</td>
                <td>{worktree.branch}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;

