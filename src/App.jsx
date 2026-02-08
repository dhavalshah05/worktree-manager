import "./App.css";
import {useState} from "react";
import {useFetchWorktrees} from "./features/worktrees/hooks/useFetchWorktrees.js";

function App() {
  const [repoPath, setRepoPath] = useState(null);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setRepoPath(formData.get("repoPath"));
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
          <button type="submit">Add</button>
        </form>
      </section>

      <section>
        {repoPath && (
          <WorkTrees
            repoPath={repoPath}
          />
        )}
      </section>
    </main>
  );
}



function WorkTrees({repoPath}) {
  const { loading, error: errorMessage, worktrees } = useFetchWorktrees(repoPath);

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
