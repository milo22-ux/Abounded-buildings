import fetch from "node-fetch";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = "milo22-ux";
const REPO_NAME = "DataBases";
const FILE_PATH = "players.json";

async function getUsers() {
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
    headers: { 
      "Authorization": `token ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json"
    }
  });
  const data = await res.json();
  if (!data.content || !data.sha) return { users: [], sha: null };
  let users = [];
  try { users = JSON.parse(Buffer.from(data.content, "base64").toString()); } catch { users = []; }
  return { users, sha: data.sha };
}

async function updateUsers(users, sha) {
  const body = {
    message: "Update all players via Lua script",
    content: Buffer.from(JSON.stringify(users, null, 2)).toString("base64"),
    sha: sha
  };
  if (!sha) delete body.sha;
  return fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
    method: "PUT",
    headers: { 
      "Authorization": `token ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json"
    },
    body: JSON.stringify(body)
  }).then(res => res.json());
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const incomingUsers = req.body;
    if (!Array.isArray(incomingUsers)) return res.status(400).json({ error: "Invalid data" });
    const { users, sha } = await getUsers();
    const existingIds = new Set(users.map(u => u.userId));
    for (const u of incomingUsers) {
      if (!existingIds.has(u.userId)) {
        users.push(u);
        existingIds.add(u.userId);
      }
    }
    await updateUsers(users, sha);
    res.json({ success: true, totalUsers: users.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
