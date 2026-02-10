import {Command} from "@tauri-apps/plugin-shell";
import {useEffect, useState} from "react";

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

export function useFetchWorktrees(repoPath) {
  const [worktreeResult, setWorktreeResult] = useState({
    loading: false,
    error: null,
    worktrees: [],
  })
  const [refreshKey, setRefreshKey] = useState(null)

  const refresh = () => {
    setRefreshKey((new Date()).getTime())
  }

  useEffect(() => {
    let ignore = false;

    const getWorktrees = async () => {
      setWorktreeResult({
        loading: true,
        worktrees: [],
        error: null
      })

      try {
        const command = Command.create("git-worktree-list", [], {
          cwd: repoPath,
        });
        const output = await command.execute();
        const stdout = output.stdout?.trim() ?? "";
        const rows = parseWorktreeList(stdout);

        if (!ignore) {
          setWorktreeResult({
            loading: false,
            error: null,
            worktrees: rows,
          })
        }
      } catch (error) {
        const message = error?.message || "Failed to run git worktree list.";
        if (!ignore) {
          setWorktreeResult({
            loading: false,
            worktrees: [],
            error: message,
          })
        }
      }
    }

    getWorktrees()

    return () => {
      ignore = true
    }
  }, [repoPath, refreshKey]);

  return {
    worktreeResult,
    refresh
  };
}

