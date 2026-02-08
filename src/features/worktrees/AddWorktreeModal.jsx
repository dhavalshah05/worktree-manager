import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function AddWorktreeModal({ onClose, onNameSubmit, repoPath }) {
  const [worktreeNameError, setWorktreeNameError] = useState("");
  const [worktreeName, setWorktreeName] = useState("");
  const [baseBranch, setBaseBranch] = useState("master");
  const [baseBranchError, setBaseBranchError] = useState("");
  const [branches, setBranches] = useState({ local: [], remote: [] });
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      if (!repoPath) return;

      setIsLoadingBranches(true);
      try {
        const result = await invoke("get_branches", { repoPath });
        setBranches(result);
      } catch (error) {
        console.error("Failed to fetch branches:", error);
        setBaseBranchError("Failed to load branches. Please try again.");
      } finally {
        setIsLoadingBranches(false);
      }
    };

    fetchBranches();
  }, [repoPath]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.combobox-container')) {
        setIsDropdownOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const handleWorktreeNameSubmit = (e) => {
    e.preventDefault();

    // Validate worktree name
    if (worktreeNameError || worktreeName.length === 0) {
      if (!worktreeNameError && worktreeName.length === 0) {
        setWorktreeNameError("Worktree name is required.");
      }
      return;
    }

    // Validate base branch
    if (!baseBranch || baseBranch.trim().length === 0) {
      setBaseBranchError("Base branch is required.");
      return;
    }

    onNameSubmit(worktreeName, baseBranch);
  };

  const handleWorktreeNameChange = (event) => {
    const nextValue = event.target.value;
    setWorktreeName(nextValue);

    if (nextValue.length === 0) {
      setWorktreeNameError("");
      return;
    }

    const isValid = /^[A-Za-z0-9-]+$/.test(nextValue);
    setWorktreeNameError(
      isValid ? "" : "Only letters, numbers, and hyphens are allowed."
    );
  };

  const handleBranchSelect = (branch) => {
    setBaseBranch(branch);
    setBaseBranchError("");
    setIsDropdownOpen(false);
    setSearchQuery("");
  };

  const filterBranches = (branchList) => {
    if (!searchQuery) return branchList;
    return branchList.filter(branch =>
      branch.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredLocalBranches = filterBranches(branches.local);
  const filteredRemoteBranches = filterBranches(branches.remote);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <header className="modal-header">
          <h3>Add Worktree</h3>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <form className="modal-body" onSubmit={handleWorktreeNameSubmit}>
          {/* Base Branch Selection */}
          <label htmlFor="baseBranch">Base Branch</label>
          <div className="combobox-container">
            <input
              id="baseBranch"
              type="text"
              value={isDropdownOpen ? searchQuery : baseBranch}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Search branches..."
              disabled={isLoadingBranches}
              aria-invalid={baseBranchError ? "true" : "false"}
            />
            {isDropdownOpen && (
              <div className="combobox-dropdown">
                {isLoadingBranches ? (
                  <div className="combobox-loading">Loading branches...</div>
                ) : (
                  <>
                    {filteredLocalBranches.length > 0 && (
                      <div className="combobox-group">
                        <div className="combobox-group-header">Local Branches</div>
                        {filteredLocalBranches.map((branch) => (
                          <div
                            key={`local-${branch}`}
                            className="combobox-item"
                            onClick={() => handleBranchSelect(branch)}
                          >
                            {branch}
                          </div>
                        ))}
                      </div>
                    )}
                    {filteredRemoteBranches.length > 0 && (
                      <div className="combobox-group">
                        <div className="combobox-group-header">Remote Branches</div>
                        {filteredRemoteBranches.map((branch) => (
                          <div
                            key={`remote-${branch}`}
                            className="combobox-item"
                            onClick={() => handleBranchSelect(branch)}
                          >
                            {branch}
                          </div>
                        ))}
                      </div>
                    )}
                    {filteredLocalBranches.length === 0 && filteredRemoteBranches.length === 0 && (
                      <div className="combobox-empty">No branches found</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          {baseBranchError && (
            <p className="field-error" role="alert">
              {baseBranchError}
            </p>
          )}

          {/* Worktree Name */}
          <label htmlFor="worktreeName">Worktree name</label>
          <input
            id="worktreeName"
            name="worktreeName"
            value={worktreeName}
            onChange={handleWorktreeNameChange}
            placeholder="feature-new-worktree"
            pattern="[A-Za-z0-9-]+"
            title="Only letters, numbers, and hyphens are allowed."
            required
            aria-invalid={worktreeNameError ? "true" : "false"}
          />
          {worktreeNameError && (
            <p className="field-error" role="alert">
              {worktreeNameError}
            </p>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}
