import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

function BranchCombobox({ label, selectedValue, onSelect, branches, isLoading, error, placeholder = "Search branches..." }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.combobox-container')) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filterBranches = (list) => {
    if (!searchQuery) return list;
    return list.filter(b => b.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const filteredLocal = filterBranches(branches.local);
  const filteredRemote = filterBranches(branches.remote);

  return (
    <div>
      <label htmlFor={`combobox-${label}`}>{label}</label>
      <div className="combobox-container">
        <input
          id={`combobox-${label}`}
          type="text"
          value={isOpen ? searchQuery : selectedValue}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={isLoading}
          aria-invalid={error ? "true" : "false"}
        />
        {isOpen && (
          <div className="combobox-dropdown">
            {isLoading ? (
              <div className="combobox-loading">Loading branches...</div>
            ) : (
              <>
                {filteredLocal.length > 0 && (
                  <div className="combobox-group">
                    <div className="combobox-group-header">Local Branches</div>
                    {filteredLocal.map((branch) => (
                      <div
                        key={`local-${branch}`}
                        className="combobox-item"
                        onClick={() => { onSelect(branch, false); setIsOpen(false); setSearchQuery(""); }}
                      >
                        {branch}
                      </div>
                    ))}
                  </div>
                )}
                {filteredRemote.length > 0 && (
                  <div className="combobox-group">
                    <div className="combobox-group-header">Remote Branches</div>
                    {filteredRemote.map((branch) => (
                      <div
                        key={`remote-${branch}`}
                        className="combobox-item"
                        onClick={() => { onSelect(branch, true); setIsOpen(false); setSearchQuery(""); }}
                      >
                        {branch}
                      </div>
                    ))}
                  </div>
                )}
                {filteredLocal.length === 0 && filteredRemote.length === 0 && (
                  <div className="combobox-empty">No branches found</div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function AddWorktreeModal({ onClose, onNameSubmit, repoPath }) {
  const [mode, setMode] = useState('checkout');
  const [branches, setBranches] = useState({ local: [], remote: [] });
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  // Shared
  const [worktreeName, setWorktreeName] = useState("");
  const [worktreeNameError, setWorktreeNameError] = useState("");

  // Checkout mode
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedBranchIsRemote, setSelectedBranchIsRemote] = useState(false);
  const [selectedBranchError, setSelectedBranchError] = useState("");

  // New branch mode
  const [baseBranch, setBaseBranch] = useState("");
  const [baseBranchError, setBaseBranchError] = useState("");
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
      } finally {
        setIsLoadingBranches(false);
      }
    };
    fetchBranches();
  }, [repoPath]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setWorktreeName("");
    setWorktreeNameError("");
    setSelectedBranch("");
    setSelectedBranchIsRemote(false);
    setSelectedBranchError("");
    setBaseBranch("");
    setBaseBranchError("");
    setBranchName("");
    setBranchNameError("");
    setUseWorktreeNameAsBranch(true);
  };

  const handleWorktreeNameChange = (event) => {
    const nextValue = event.target.value;
    setWorktreeName(nextValue);
    if (nextValue.length === 0) {
      setWorktreeNameError("");
      return;
    }
    const isValid = /^[A-Za-z0-9-]+$/.test(nextValue);
    setWorktreeNameError(isValid ? "" : "Only letters, numbers, and hyphens are allowed.");
  };

  const handleCheckoutBranchSelect = (branch, isRemote) => {
    setSelectedBranch(branch);
    setSelectedBranchIsRemote(isRemote);
    setSelectedBranchError("");
    // Auto-populate worktree name: strip remote prefix, replace slashes with hyphens
    const displayName = isRemote ? branch.replace(/^[^/]+\//, '') : branch;
    const sanitized = displayName.replace(/\//g, '-');
    setWorktreeName(sanitized);
    setWorktreeNameError("");
  };

  const handleBaseBranchSelect = (branch) => {
    setBaseBranch(branch);
    setBaseBranchError("");
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

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!worktreeName || worktreeNameError) {
      if (!worktreeName) setWorktreeNameError("Worktree name is required.");
      return;
    }

    if (mode === 'checkout') {
      if (!selectedBranch) {
        setSelectedBranchError("Please select a branch to checkout.");
        return;
      }
      onNameSubmit({ mode: 'checkout', worktreeName, branch: selectedBranch, isRemote: selectedBranchIsRemote });
    } else {
      if (!baseBranch) {
        setBaseBranchError("Base branch is required.");
        return;
      }
      if (!useWorktreeNameAsBranch) {
        if (!branchName) {
          setBranchNameError("Branch name is required.");
          return;
        }
        if (branchNameError) return;
      }
      const effectiveBranchName = useWorktreeNameAsBranch ? worktreeName : branchName;
      onNameSubmit({ mode: 'new-branch', worktreeName, baseBranch, branchName: effectiveBranchName });
    }
  };

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

        <form className="modal-body" onSubmit={handleSubmit}>
          {/* Mode Toggle */}
          <div className="mode-toggle">
            <button
              type="button"
              className={`mode-toggle-btn${mode === 'checkout' ? ' active' : ''}`}
              onClick={() => handleModeChange('checkout')}
            >
              Checkout Branch
            </button>
            <button
              type="button"
              className={`mode-toggle-btn${mode === 'new-branch' ? ' active' : ''}`}
              onClick={() => handleModeChange('new-branch')}
            >
              New Branch
            </button>
          </div>

          {mode === 'checkout' ? (
            <>
              <BranchCombobox
                label="Branch"
                selectedValue={selectedBranch}
                onSelect={handleCheckoutBranchSelect}
                branches={branches}
                isLoading={isLoadingBranches}
                error={selectedBranchError}
              />
              <div>
                <label htmlFor="worktreeName">Worktree Name</label>
                <input
                  id="worktreeName"
                  type="text"
                  value={worktreeName}
                  onChange={handleWorktreeNameChange}
                  placeholder="feature-my-branch"
                  required
                  aria-invalid={worktreeNameError ? "true" : "false"}
                />
                {worktreeNameError && <p className="field-error" role="alert">{worktreeNameError}</p>}
              </div>
            </>
          ) : (
            <>
              <BranchCombobox
                label="Base Branch"
                selectedValue={baseBranch}
                onSelect={handleBaseBranchSelect}
                branches={branches}
                isLoading={isLoadingBranches}
                error={baseBranchError}
              />
              <div>
                <label htmlFor="worktreeName">Worktree Name</label>
                <input
                  id="worktreeName"
                  type="text"
                  value={worktreeName}
                  onChange={handleWorktreeNameChange}
                  placeholder="feature-new-worktree"
                  required
                  aria-invalid={worktreeNameError ? "true" : "false"}
                />
                {worktreeNameError && <p className="field-error" role="alert">{worktreeNameError}</p>}
              </div>
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
              {!useWorktreeNameAsBranch && (
                <div>
                  <label htmlFor="branchName">Branch Name</label>
                  <input
                    id="branchName"
                    type="text"
                    value={branchName}
                    onChange={handleBranchNameChange}
                    placeholder="feature/my-branch"
                    required
                    aria-invalid={branchNameError ? "true" : "false"}
                  />
                  {branchNameError && <p className="field-error" role="alert">{branchNameError}</p>}
                </div>
              )}
            </>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Create Worktree</button>
          </div>
        </form>
      </div>
    </div>
  );
}
