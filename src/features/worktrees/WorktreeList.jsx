import { confirm } from '@tauri-apps/plugin-dialog';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

export function WorktreeList({ worktrees, prunableWorktrees, onDeleteWorktree, onOpenWith, onPrune }) {
    const hasPrunable = prunableWorktrees && prunableWorktrees.length > 0;

    const handlePruneClick = async () => {
        if (!hasPrunable) return;

        // Build confirmation message listing prunable worktrees
        const worktreeList = prunableWorktrees.map(wt => {
            const branch = wt.branch || 'Detached HEAD';
            const path = wt.path || wt.name || 'Unknown path';
            return `- ${path} (branch: ${branch})`;
        }).join('\n');

        const message = `The following worktrees will be removed from git's registry:\n\n${worktreeList}\n\nThis action only removes the git tracking entry. The actual directory may already be deleted.`;

        const confirmed = await confirm(message, {
            title: `Prune ${prunableWorktrees.length} Worktree${prunableWorktrees.length > 1 ? 's' : ''}?`,
            kind: 'warning'
        });

        if (confirmed) {
            onPrune();
        }
    };

    return (
        <section>
            <div className="section-header">
                <h3 className="section-title">Worktrees ({worktrees.length})</h3>
                {hasPrunable && (
                    <button
                        type="button"
                        onClick={handlePruneClick}
                        className="btn-warning btn-sm"
                        aria-label="Prune stale worktrees"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Prune Worktrees ({prunableWorktrees.length})
                    </button>
                )}
            </div>

            {worktrees.length === 0 ? (
                <EmptyWorktree />
            ) : (
                <div className="list">
                    {worktrees.map((worktree) => (
                        <WorktreeItem
                            key={`${worktree.path}-${worktree.raw}`}
                            worktree={worktree}
                            onDeleteWorktree={onDeleteWorktree}
                            onOpenWith={onOpenWith}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function WorktreeItem({ worktree, onDeleteWorktree, onOpenWith }) {
    const handleDelete = async (e) => {
        e.stopPropagation();
        const branchName = worktree.branch || 'this worktree';
        const confirmed = await confirm(`Are you sure you want to remove "${branchName}"?`, {
            title: 'Confirm Removal',
            kind: 'warning'
        });
        if (confirmed) {
            onDeleteWorktree(worktree);
        }
    };

    const handleCopyPath = async (e) => {
        e.stopPropagation();
        try {
            await writeText(worktree.path);
            e.target.textContent = 'Copied!';
            setTimeout(() => {
                e.target.textContent = 'Copy Path';
            }, 1500);
        } catch (error) {
            console.error('Failed to copy path:', error);
        }
    };

    const handleOpenWith = async (e) => {
        e.stopPropagation();
        const selectedOption = e.target.value;
        if (!selectedOption) {
            return;
        }

        try {
            await onOpenWith(worktree, selectedOption);
        } finally {
            e.target.value = '';
        }
    };

    const localBranch = worktree.branch || 'Detached HEAD';
    const trackingBranch = worktree.tracking || '';
    const worktreeName = worktree.path.split('/').pop();
    const shortHead = worktree.head?.substring(0, 8) || 'N/A';

    return (
        <article className={`worktree-card ${worktree.isPrunable ? 'worktree-prunable' : ''}`}>
            <div className="worktree-header">
                <div className="worktree-header-main">
                    <div className={`list-item-icon ${worktree.isPrunable ? 'list-item-icon-warning' : ''}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="6" y1="3" x2="6" y2="15" />
                            <circle cx="18" cy="6" r="3" />
                            <circle cx="6" cy="18" r="3" />
                            <path d="M18 9a9 9 0 0 1-9 9" />
                        </svg>
                    </div>
                    <div className="worktree-identity">
                        {worktree.isPrunable && (
                            <span className="worktree-prunable-badge">Prunable</span>
                        )}
                        <div className="worktree-field">
                            <span className="worktree-field-label">Local</span>
                            <span className="worktree-field-value" title={localBranch}>{localBranch}</span>
                        </div>
                        <div className="worktree-field">
                            <span className="worktree-field-label">Tracking</span>
                            {trackingBranch ? (
                                <span className="worktree-field-value" title={trackingBranch}>{trackingBranch}</span>
                            ) : (
                                <span className="worktree-field-value worktree-field-empty">Not tracking</span>
                            )}
                        </div>
                        <div className="worktree-field">
                            <span className="worktree-field-label">Worktree</span>
                            <span className="worktree-field-value" title={worktreeName}>{worktreeName}</span>
                        </div>
                        <div className="worktree-field">
                            <span className="worktree-field-label">HEAD</span>
                            <span className="worktree-field-value worktree-field-muted">{shortHead}</span>
                        </div>
                    </div>
                </div>
                <div className="card-actions">
                    <select
                        defaultValue=""
                        onChange={handleOpenWith}
                        onClick={(e) => e.stopPropagation()}
                        className="open-with-select btn-sm"
                        aria-label={`Open ${worktree.branch || 'worktree'} with`}
                    >
                        <option value="" disabled>
                            Open with
                        </option>
                        <option value="antigravity">Antigravity</option>
                        <option value="codex">Codex</option>
                        <option value="intellij-idea">Intellij Idea</option>
                        <option value="cursor">Cursor</option>
                        <option value="android-studio">Android Studio</option>
                        <option value="webstorm">WebStorm</option>
                        <option value="ghostty">Ghostty</option>
                        <option value="terminal">Terminal</option>
                        <option value="claude">Claude</option>
                    </select>
                    <button
                        type="button"
                        onClick={handleCopyPath}
                        className="btn-secondary btn-sm"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy Path
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="btn-danger btn-sm"
                        aria-label="Remove worktree"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Remove
                    </button>
                </div>
            </div>
        </article>
    );
}

function EmptyWorktree() {
    return (
        <div className="empty-state">
            <div className="empty-state-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="6" y1="3" x2="6" y2="15" />
                    <circle cx="18" cy="6" r="3" />
                    <circle cx="6" cy="18" r="3" />
                    <path d="M18 9a9 9 0 0 1-9 9" />
                </svg>
            </div>
            <h3 className="empty-state-title">No worktrees found</h3>
            <p className="empty-state-description">
                Click "Add Worktree" to create a new worktree.
            </p>
        </div>
    );
}
