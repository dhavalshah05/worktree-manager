import { confirm } from '@tauri-apps/plugin-dialog';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

export function WorktreeList({ worktrees, onDeleteWorktree }) {
    return (
        <section style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: "1rem",
        }}>
            <h2>Worktrees</h2>

            {worktrees.length === 0 ? (
                <EmptyWorktree />
            ) : (
                <WorktreeListInternal worktrees={worktrees} onDeleteWorktree={onDeleteWorktree} />
            )}
        </section>
    );
}

function WorktreeListInternal({ worktrees, onDeleteWorktree }) {
    return (
        <>
            {worktrees.map((worktree) => (
                <WorktreeItem
                    key={`${worktree.path}-${worktree.raw}`}
                    worktree={worktree}
                    onDeleteWorktree={onDeleteWorktree}
                />
            ))}
        </>
    )
}

function WorktreeItem({ worktree, onDeleteWorktree }) {

    const handleDelete = async (e) => {
        e.stopPropagation()
        const branchName = worktree.branch || 'this worktree';
        const confirmed = await confirm(`Are you sure you want to remove "${branchName}"?`, {
            title: 'Confirm Removal',
            kind: 'warning'
        });
        if (confirmed) {
            onDeleteWorktree(worktree);
        }
    }

    const handleCopyPath = async (e) => {
        e.stopPropagation();
        try {
            await writeText(worktree.path);
            // Visual feedback - change button text temporarily
            e.target.textContent = 'Copied!';
            setTimeout(() => {
                e.target.textContent = 'Copy Path';
            }, 1500);
        } catch (error) {
            console.error('Failed to copy path:', error);
        }
    }

    return (
        <article style={{
            display: 'flex',
            flexDirection: 'column',
            gap: "0.5rem",
            width: '100%',
            maxWidth: '600px',
            border: '2px solid gray',
            borderRadius: '8px',
            padding: "1rem",
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: "1rem",
            }}>
                <h3 style={{ margin: 0 }}>{worktree.branch || 'Detached HEAD'}</h3>
                <button
                    type="button"
                    onClick={handleDelete}
                    style={{
                        padding: '4px 8px',
                        fontSize: '0.85em',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Remove
                </button>
            </div>

            <div style={{ fontSize: '0.9em', color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ margin: '4px 0' }}>
                    <strong>Head:</strong> {worktree.head}
                </p>
                <button
                    type="button"
                    onClick={handleCopyPath}
                    style={{
                        padding: '4px 8px',
                        fontSize: '0.85em',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Copy Path
                </button>
            </div>
        </article>
    )
}

function EmptyWorktree() {
    return (
        <p>No worktrees found. Add one using the button above.</p>
    )
}
