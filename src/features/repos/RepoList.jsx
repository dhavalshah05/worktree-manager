import { confirm } from '@tauri-apps/plugin-dialog';

export function RepoList({ repos, onSelectRepo, onDeleteRepo }) {
  return (
    <section style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: "1rem",
    }}>
      <h2>Repositories</h2>

      {repos.length === 0 ? (
        <EmptyRepo />
      ) : (
        <RepoListInternal repos={repos} onSelectRepo={onSelectRepo} onDeleteRepo={onDeleteRepo} />
      )}
    </section>
  );
}

function RepoListInternal({ repos, onSelectRepo, onDeleteRepo }) {
  return (
    <>
      {repos.map((repo) => (
        <RepoItem key={repo.id} repo={repo} onSelectRepo={onSelectRepo} onDeleteRepo={onDeleteRepo} />
      ))}
    </>
  )
}

function RepoItem({ repo, onDeleteRepo, onSelectRepo }) {

  const handleDelete = async (e) => {
    e.stopPropagation()
    const confirmed = await confirm(`Are you sure you want to remove "${repo.name}"?`, {
      title: 'Confirm Removal',
      kind: 'warning'
    });
    if (confirmed) {
      onDeleteRepo(repo.id);
    }
  }

  const handleSelect = (e) => {
    onSelectRepo(repo)
  }

  return (
    <article onClick={handleSelect} style={{
      display: 'flex',
      alignItems: 'center',
      gap: "1rem",
      width: 'fit-content',
      border: '2px solid gray',
      borderRadius: '8px',
      padding: "0.5rem",
      cursor: 'pointer',
    }}>
      <h2>{repo.name}</h2>
      {/*<p style={{ fontSize: '0.9em', color: '#666' }}>{repo.path}</p>*/}
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
    </article>
  )
}

function EmptyRepo() {
  return (
    <p>No repositories added yet. Add one using the form above.</p>
  )
}
