import "./App.css";
import {useState} from "react";
import {Command} from "@tauri-apps/plugin-shell";

function App() {
  const [repoPath, setRepoPath] = useState(null);
  const [worktrees, setWorktrees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setWorktrees([]);

    const formData = new FormData(e.target);
    const nextRepoPath = formData.get("repoPath");
    setRepoPath(nextRepoPath);

    if (!nextRepoPath) {
      setErrorMessage("Repository path is required.");
      return;
    }

    setLoading(true);

    try {
      const command = Command.create("git-worktree-list", [], {
        cwd: nextRepoPath,
      });
      const output = await command.execute();
      const stdout = output.stdout?.trim() ?? "";
      const rows = parseWorktreeList(stdout);
      setWorktrees(rows);
    } catch (error) {
      const message = error?.message || "Failed to run git worktree list.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <section>
        <h1>Worktree Manager</h1>

        <form
          className="row"
          onSubmit={handleFormSubmit}
        >
          <input
            id="repoPath"
            name={"repoPath"}
            placeholder="Enter repository absolute path"
          />
          <button type="submit" disabled={loading}>Add</button>
        </form>
      </section>

      <section>
        {repoPath && (
          <WorkTrees
            repoPath={repoPath}
            worktrees={worktrees}
            loading={loading}
            errorMessage={errorMessage}
          />
        )}
      </section>
    </main>
  );
}

function parseWorktreeList(output) {
  if (!output) {
    return [];
  }

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\S+)\s+(\S+)(?:\s+\[(.+)\])?$/);
      const path = match?.[1] ?? "";
      const head = match?.[2] ?? "";
      const branch = match?.[3] ?? "";
      return {
        path,
        head,
        branch,
        raw: line,
      };
    });
}

function WorkTrees({repoPath, worktrees, loading, errorMessage}) {
  return (
    <div>
      <h2>{repoPath}</h2>
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
