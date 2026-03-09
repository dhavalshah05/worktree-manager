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
      // Regex captures: path, head, branch (in brackets), and optional "prunable"
      const match = line.match(/^(\S+)\s+(\S+)(?:\s+\[(.+?)\])?(?:\s+(prunable))?$/);
      const path = match?.[1] ?? "";
      const head = match?.[2] ?? "";
      const branch = match?.[3] ?? "";
      const isPrunable = match?.[4] === "prunable";
      return {
        path,
        head,
        branch,
        isPrunable,
        raw: line,
      };
    });
}



export function useFetchWorktrees(repoPath) {
  const [worktreeResult, setWorktreeResult] = useState({
    loading: false,
    error: null,
    worktrees: [],
    prunableWorktrees: [],
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
        prunableWorktrees: [],
        error: null
      })

      try {
        // Fetch worktree list
        const listCommand = Command.create("git-worktree-list", [], {
          cwd: repoPath,
        });
        const listOutput = await listCommand.execute();
        const listStdout = listOutput.stdout?.trim() ?? "";
        const worktrees = parseWorktreeList(listStdout);

        // Extract prunable worktrees from the parsed list
        const prunableWorktrees = worktrees.filter(wt => wt.isPrunable);

        if (!ignore) {
          setWorktreeResult({
            loading: false,
            error: null,
            worktrees,
            prunableWorktrees,
          })
        }
      } catch (error) {
        const message = error?.message || "Failed to run git worktree list.";
        if (!ignore) {
          setWorktreeResult({
            loading: false,
            worktrees: [],
            prunableWorktrees: [],
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

