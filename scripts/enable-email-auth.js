const fs = require("fs");
const https = require("https");
const home = require("os").homedir();

const PROJECT_ID = "ijarpro-4d396";
const configPath = home + "/.config/configstore/firebase-tools.json";
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const refreshToken = config.tokens.refresh_token;

function httpRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const clientId = config.tokens.client_id || "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
  const clientSecret = config.tokens.client_secret || "j9iVZfS8kkCEFUPaAeJV0sAi";
  const tokenBody = `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}`;

  const tokenRes = await httpRequest("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  }, tokenBody);
  const accessToken = tokenRes.data.access_token;

  // Enable email/password sign-in
  const updateBody = JSON.stringify({
    signIn: { email: { enabled: true, passwordRequired: true } }
  });

  const res = await httpRequest(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=signIn.email`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
    updateBody
  );

  console.log("Enable email auth result:", res.status, JSON.stringify(res.data.signIn));
}

main().catch(e => console.error(e));
