const BASE_URL = "http://localhost:8000";

// ── REPOSITORY ────────────────────────────────────────────────────────────────

export async function parseLocalRepo(path) {
  const res = await fetch(`${BASE_URL}/repository/parse-local/${path}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadRepo(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/repository/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function parseGitRepo(gitUrl) {
  const res = await fetch(
    `${BASE_URL}/repository/parse-git?git_url=${encodeURIComponent(gitUrl)}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── AI ────────────────────────────────────────────────────────────────────────

export async function askQuestion(repoPath, question) {
  const res = await fetch(`${BASE_URL}/ai/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_path: repoPath, question }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── REPOS ─────────────────────────────────────────────────────────────────────

export async function listRepos() {
  const res = await fetch(`${BASE_URL}/repository/list`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}