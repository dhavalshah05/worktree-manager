import { confirm } from '@tauri-apps/plugin-dialog';

export function RepoList({ repos, onSelectRepo, onDeleteRepo }) {
  return (
    <section>
      <div className="section-header">
        <h2 className="section-title">Repositories</h2>
      </div>

      {repos.length === 0 ? (
        <EmptyRepo />
      ) : (
        <div className="list">
          {repos.map((repo) => (
            <RepoItem
              key={repo.id}
              repo={repo}
              onSelectRepo={onSelectRepo}
              onDeleteRepo={onDeleteRepo}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RepoItem({ repo, onDeleteRepo, onSelectRepo }) {
  const handleDelete = async (e) => {
    e.stopPropagation();
    const confirmed = await confirm(`Are you sure you want to remove "${repo.name}"?`, {
      title: 'Confirm Removal',
      kind: 'warning'
    });
    if (confirmed) {
      onDeleteRepo(repo.id);
    }
  };

  const handleSelect = () => {
    onSelectRepo(repo);
  };

  return (
    <article className="list-item" onClick={handleSelect}>
      <div className="list-item-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div className="list-item-content">
        <h3 className="list-item-title">{repo.name}</h3>
        <p className="list-item-subtitle">{repo.path}</p>
      </div>
      <div className="list-item-actions">
        <button
          type="button"
          onClick={handleDelete}
          className="btn-danger btn-sm"
          aria-label="Remove repository"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Remove
        </button>
      </div>
    </article>
  );
}

function EmptyRepo() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <h3 className="empty-state-title">No repositories yet</h3>
      <p className="empty-state-description">
        Choose a git repository to get started.
      </p>
    </div>
  );
}
