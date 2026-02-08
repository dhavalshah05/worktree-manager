use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
struct BranchesResponse {
    local: Vec<String>,
    remote: Vec<String>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_branches(repo_path: String) -> Result<BranchesResponse, String> {
    let output = Command::new("git")
        .args(&["branch", "-a"])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to execute git command: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git command failed: {}", error));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut local_branches = Vec::new();
    let mut remote_branches = Vec::new();

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        // Remove the "* " prefix from current branch
        let branch_name = if trimmed.starts_with("* ") {
            &trimmed[2..]
        } else {
            trimmed
        };

        // Skip HEAD references
        if branch_name.contains("HEAD ->") {
            continue;
        }

        // Categorize as remote or local
        if branch_name.starts_with("remotes/") {
            // Remove "remotes/" prefix
            let remote_branch = branch_name.trim_start_matches("remotes/");
            remote_branches.push(remote_branch.to_string());
        } else {
            local_branches.push(branch_name.to_string());
        }
    }

    Ok(BranchesResponse {
        local: local_branches,
        remote: remote_branches,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet, get_branches])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
