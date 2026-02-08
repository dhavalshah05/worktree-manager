import "./App.css";
import { useState } from "react";
import { useFetchWorktrees } from "./features/worktrees/hooks/useFetchWorktrees.js";
import { AddWorktreeModal } from "./features/worktrees/AddWorktreeModal.jsx";
import { Command } from "@tauri-apps/plugin-shell";

function App() {
  const [repoPath, setRepoPath] = useState(null);
  const [isAddWorktreeOpen, setIsAddWorktreeOpen] = useState(false);
  const [addWorktreeError, setAddWorktreeError] = useState("");
  const worktreeData = useFetchWorktrees(repoPath);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setRepoPath(formData.get("repoPath"));
  };

  const handleCloseAddWorktreeModal = () => {
    setIsAddWorktreeOpen(false)
  }

  const handleOpenAddWorktree = () => {
    setIsAddWorktreeOpen(true)
  }

  const handleDismissAddWorktreeError = () => {
    setAddWorktreeError("")
  }

  const handleAddWorktreeSubmit = async (name, baseBranch) => {
    handleCloseAddWorktreeModal()
    setAddWorktreeError("")

    if (!repoPath) {
      setAddWorktreeError("Repository path is required to add a worktree.")
      return;
    }

    const trimmedName = name.trim();
    const worktreeRoot = `${repoPath}-worktrees`;
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
        cwd: repoPath,
      });
      const result = await command.execute();
      console.log(result)
    } catch (error) {
      const message = error?.message || "Failed to add worktree.";
      setAddWorktreeError(message);
    }
  }

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
        {repoPath && (
          <WorkTrees
            repoPath={repoPath}
            onAddWorktree={handleOpenAddWorktree}
            worktreeData={worktreeData}
          />
        )}
      </section>

      {isAddWorktreeOpen && (
        <AddWorktreeModal
          onClose={handleCloseAddWorktreeModal}
          onNameSubmit={handleAddWorktreeSubmit}
          repoPath={repoPath}
        />
      )}
    </main>
  );
}



function WorkTrees({ repoPath, onAddWorktree, worktreeData }) {
  const { loading, error: errorMessage, worktrees, refresh } = worktreeData;

  return (
    <div>
      <h2>{repoPath}</h2>
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

