/**
 * Storage Abstraction Layer
 * 
 * This module provides a unified interface for storing and retrieving data.
 * Currently uses LocalStorage as the backend, but can be easily replaced
 * with Tauri Store or other storage solutions by modifying only this file.
 * 
 * Usage:
 *   import { storage } from './lib/storage';
 *   storage.set('key', value);
 *   const value = storage.get('key');
 *   storage.remove('key');
 */

// Storage keys - centralized for type safety and easy refactoring
export const STORAGE_KEYS = {
  REPO_PATH: 'repoPath', // Legacy - kept for migration
  REPOS: 'repos',         // Array of repository objects
};

/**
 * Repository Helper Functions
 */

/**
 * Extract repository name from path
 * @param {string} path - Full repository path
 * @returns {string} Repository name
 */
export function getRepoNameFromPath(path) {
  const trimmed = path.trim().replace(/\/$/, ''); // Remove trailing slash
  const parts = trimmed.split('/');
  return parts[parts.length - 1] || 'Unknown Repository';
}

/**
 * Create a repository object
 * @param {string} path - Repository path
 * @returns {object} Repository object
 */
export function createRepoObject(path) {
  return {
    id: Date.now().toString(),
    path: path.trim(),
    name: getRepoNameFromPath(path),
    addedAt: Date.now(),
  };
}

/**
 * Get all repositories from storage
 * Handles migration from old single repoPath to new repos array
 * @returns {Array} Array of repository objects
 */
export function getRepos() {
  let repos = storage.get(STORAGE_KEYS.REPOS);

  // If repos doesn't exist, try to migrate from old repoPath
  if (!repos || !Array.isArray(repos)) {
    const oldRepoPath = storage.get(STORAGE_KEYS.REPO_PATH);
    if (oldRepoPath) {
      repos = [createRepoObject(oldRepoPath)];
      storage.set(STORAGE_KEYS.REPOS, repos);
      // Keep old repoPath for backward compatibility (optional)
    } else {
      repos = [];
    }
  }

  return repos;
}

/**
 * Add a repository to storage
 * @param {string} path - Repository path
 * @returns {object} Result object with success status and message
 */
export function addRepo(path) {
  const repos = getRepos();
  const trimmedPath = path.trim();

  // Check for duplicates
  const exists = repos.some(repo => repo.path === trimmedPath);
  if (exists) {
    return {
      success: false,
      message: 'This repository has already been added.',
    };
  }

  const newRepo = createRepoObject(trimmedPath);
  repos.push(newRepo);
  storage.set(STORAGE_KEYS.REPOS, repos);

  return {
    success: true,
    repo: newRepo,
  };
}

/**
 * Remove a repository from storage
 * @param {string} repoId - Repository ID to remove
 * @returns {boolean} True if removed successfully
 */
export function removeRepo(repoId) {
  const repos = getRepos();
  const filteredRepos = repos.filter(repo => repo.id !== repoId);

  if (filteredRepos.length === repos.length) {
    return false; // Repo not found
  }

  storage.set(STORAGE_KEYS.REPOS, filteredRepos);
  return true;
}

/**
 * LocalStorage adapter
 * Implements the storage interface using browser's localStorage API
 */
class LocalStorageAdapter {
  /**
   * Get a value from storage
   * @param {string} key - Storage key
   * @returns {any} The stored value, or null if not found
   */
  get(key) {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return null;

      // Try to parse as JSON, fallback to raw string
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`Error reading from storage (key: ${key}):`, error);
      return null;
    }
  }

  /**
   * Set a value in storage
   * @param {string} key - Storage key
   * @param {any} value - Value to store (will be JSON stringified)
   */
  set(key, value) {
    try {
      const serialized = typeof value === 'string'
        ? value
        : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`Error writing to storage (key: ${key}):`, error);
    }
  }

  /**
   * Remove a value from storage
   * @param {string} key - Storage key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from storage (key: ${key}):`, error);
    }
  }

  /**
   * Clear all storage
   */
  clear() {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
}

// Export a singleton instance
// To replace with Tauri Store: change this line to use TauriStoreAdapter
export const storage = new LocalStorageAdapter();

/**
 * MIGRATION GUIDE: Switching to Tauri Store
 * 
 * 1. Install the plugin:
 *    npm install @tauri-apps/plugin-store
 * 
 * 2. Create a TauriStoreAdapter class:
 *    class TauriStoreAdapter {
 *      constructor() {
 *        this.store = new Store('settings.json');
 *      }
 *      async get(key) { return await this.store.get(key); }
 *      async set(key, value) { await this.store.set(key, value); await this.store.save(); }
 *      async remove(key) { await this.store.delete(key); await this.store.save(); }
 *      async clear() { await this.store.clear(); await this.store.save(); }
 *    }
 * 
 * 3. Replace the export line:
 *    export const storage = new TauriStoreAdapter();
 * 
 * 4. Update component code to handle async operations (add await)
 * 
 * That's it! No changes needed in components.
 */
