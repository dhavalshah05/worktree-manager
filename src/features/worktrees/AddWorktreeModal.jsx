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
  const [useWorktreeNameAsBranch, setUseWorktreeNameAsBranch] = useState(true);
  const [branchName, setBranchName] = useState("");
  const [branchNameError, setBranchNameError] = useState("");

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

    if (worktreeNameError || worktreeName.length === 0) {
      if (!worktreeNameError && worktreeName.length === 0) {
        setWorktreeNameError("Worktree name is required.");
      }
      return;
    }

    if (!baseBranch || baseBranch.trim().length === 0) {
      setBaseBranchError("Base branch is required.");
      return;
    }

    if (!useWorktreeNameAsBranch) {
      if (branchName.length === 0) {
        setBranchNameError("Branch name is required.");
        return;
      }
      if (branchNameError) return;
    }

    const effectiveBranchName = useWorktreeNameAsBranch ? worktreeName : branchName;
    onNameSubmit(worktreeName, baseBranch, effectiveBranchName);
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

  const handleBranchNameChange = (event) => {
    const nextValue = event.target.value;
    setBranchName(nextValue);

    if (nextValue.length === 0) {
      setBranchNameError("");
      return;
    }

    const isValid = /^[A-Za-z0-9_\-\/]+$/.test(nextValue) && !nextValue.startsWith("/") && !nextValue.includes("//");
    setBranchNameError(
      isValid ? "" : "Only letters, numbers, hyphens, underscores, and slashes are allowed. Cannot start with or contain consecutive slashes."
    );
  };

  const handleToggleUseWorktreeNameAsBranch = (e) => {
    const checked = e.target.checked;
    setUseWorktreeNameAsBranch(checked);
    if (checked) {
      setBranchName("");
      setBranchNameError("");
    } else {
      setBranchName(worktreeName);
      setBranchNameError("");
    }
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
          <button type="button" onClick={onClose} aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form className="modal-body" onSubmit={handleWorktreeNameSubmit}>
          {/* Base Branch Selection */}
          <div>
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
          </div>

          {/* Worktree Name */}
          <div>
            <label htmlFor="worktreeName">Worktree Name</label>
            <input
              id="worktreeName"
              name="worktreeName"
              type="text"
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
          </div>

          {/* Branch Name Toggle */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={useWorktreeNameAsBranch}
                onChange={handleToggleUseWorktreeNameAsBranch}
              />
              Use worktree name as branch name
            </label>
          </div>

          {/* Custom Branch Name */}
          {!useWorktreeNameAsBranch && (
            <div>
              <label htmlFor="branchName">Branch Name</label>
              <input
                id="branchName"
                name="branchName"
                type="text"
                value={branchName}
                onChange={handleBranchNameChange}
                placeholder="feature/my-branch"
                required
                aria-invalid={branchNameError ? "true" : "false"}
              />
              {branchNameError && (
                <p className="field-error" role="alert">
                  {branchNameError}
                </p>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">
              Create Worktree
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
