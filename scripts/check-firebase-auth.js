const fs = require("fs");
const home = require("os").homedir();
const path = home + "/.config/configstore/firebase-tools.json";
try {
  const data = JSON.parse(fs.readFileSync(path, "utf8"));
  console.log("has tokens:", data.tokens ? true : false);
  if (data.tokens && data.tokens.refresh_token) {
    console.log("has refresh_token: true");
    console.log("refresh_token length:", data.tokens.refresh_token.length);
  }
} catch (e) {
  console.log("no config file or error:", e.message);
}
