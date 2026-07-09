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

// Builds a map of local branch name -> tracking branch (e.g. "master" -> "origin/master").
// Each line looks like "master origin/master". A branch with no upstream has no second value.
function parseUpstreamMap(output) {
  const upstreamByBranch = {};
  if (!output) {
    return upstreamByBranch;
  }

  output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      // Git branch names never contain spaces, so the first space splits branch from upstream.
      const spaceIndex = line.indexOf(" ");
      if (spaceIndex === -1) {
        upstreamByBranch[line] = "";
      } else {
        const branch = line.slice(0, spaceIndex);
        const upstream = line.slice(spaceIndex + 1).trim();
        upstreamByBranch[branch] = upstream;
      }
    });

  return upstreamByBranch;
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

        // Fetch the tracking (upstream) branch for every local branch.
        const upstreamCommand = Command.create("git-for-each-ref-upstream", [], {
          cwd: repoPath,
        });
        const upstreamOutput = await upstreamCommand.execute();
        const upstreamStdout = upstreamOutput.stdout?.trim() ?? "";
        const upstreamByBranch = parseUpstreamMap(upstreamStdout);

        // Attach the tracking branch to each worktree by its local branch name.
        const worktrees = parseWorktreeList(listStdout).map((worktree) => ({
          ...worktree,
          tracking: worktree.branch ? (upstreamByBranch[worktree.branch] ?? "") : "",
        }));

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

