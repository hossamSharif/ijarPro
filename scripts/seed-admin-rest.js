// Seed admin user using Firebase CLI credentials
const fs = require("fs");
const https = require("https");
const home = require("os").homedir();

const PROJECT_ID = "ijarpro-4d396";
const API_KEY = "AIzaSyC7R0y_hS7lXHkwh70ebrvRtOCi5QsN72A";
const ADMIN_EMAIL = "admin@ijar.pro";
const ADMIN_PASSWORD = "Admin@123456";

// Get Firebase CLI refresh token
const configPath = home + "/.config/configstore/firebase-tools.json";
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const refreshToken = config.tokens.refresh_token;

function httpRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken() {
  // Exchange refresh token for access token using Google's token endpoint
  const clientId = config.tokens.client_id || "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
  const clientSecret = config.tokens.client_secret || "j9iVZfS8kkCEFUPaAeJV0sAi";

  const body = `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}`;
  const res = await httpRequest("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  }, body);

  if (res.status !== 200) {
    throw new Error("Failed to get access token: " + JSON.stringify(res.data));
  }
  return res.data.access_token;
}

async function createUser(accessToken) {
  const body = JSON.stringify({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    displayName: "مدير النظام",
    emailVerified: true,
  });

  const res = await httpRequest(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
    body
  );

  if (res.status === 200) {
    console.log("User created, localId:", res.data.localId);
    return res.data.localId;
  } else if (res.data && res.data.error && res.data.error.message === "EMAIL_EXISTS") {
    // User exists, get their UID
    console.log("User already exists, looking up...");
    const lookupBody = JSON.stringify({ email: [ADMIN_EMAIL] });
    const lookupRes = await httpRequest(
      `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
      lookupBody
    );
    if (lookupRes.data.users && lookupRes.data.users[0]) {
      console.log("Found user:", lookupRes.data.users[0].localId);
      return lookupRes.data.users[0].localId;
    }
    throw new Error("Could not find existing user");
  } else {
    throw new Error("Failed to create user: " + JSON.stringify(res.data));
  }
}

async function setCustomClaims(accessToken, uid) {
  const body = JSON.stringify({
    localId: uid,
    customAttributes: JSON.stringify({ role: "admin" }),
  });

  const res = await httpRequest(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
    body
  );

  if (res.status === 200) {
    console.log("Custom claims set: { role: admin }");
  } else {
    throw new Error("Failed to set claims: " + JSON.stringify(res.data));
  }
}

async function createFirestoreDoc(accessToken, uid) {
  const now = new Date().toISOString();
  const docBody = JSON.stringify({
    fields: {
      username: { stringValue: "admin" },
      nameAr: { stringValue: "مدير النظام" },
      nameEn: { stringValue: "System Admin" },
      email: { stringValue: ADMIN_EMAIL },
      role: { stringValue: "admin" },
      isActive: { booleanValue: true },
      permissions: {
        mapValue: {
          fields: {
            canCreateInvoice: { booleanValue: true },
            canUpdateInvoice: { booleanValue: true },
            canCancelInvoice: { booleanValue: true },
            canRecordPayment: { booleanValue: true },
            canManageBuildings: { booleanValue: true },
            canManageCustomers: { booleanValue: true },
            canAddExpense: { booleanValue: true },
            canViewJournal: { booleanValue: true },
            canCreateManualEntry: { booleanValue: true },
            canViewReports: { booleanValue: true },
            canChangeOwnPassword: { booleanValue: true },
          },
        },
      },
      createdAt: { timestampValue: now },
      createdBy: { stringValue: "system" },
      updatedAt: { timestampValue: now },
      updatedBy: { stringValue: "system" },
    },
  });

  const res = await httpRequest(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
    docBody
  );

  if (res.status === 200) {
    console.log("Firestore user document created/updated");
  } else {
    throw new Error("Failed to create Firestore doc: " + JSON.stringify(res.data));
  }
}

async function enableEmailAuth(accessToken) {
  // Check/enable email-password sign-in
  const res = await httpRequest(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (res.status === 200) {
    const cfg = res.data;
    console.log("Auth config signIn providers:", JSON.stringify(cfg.signIn));

    // Enable email sign-in if not enabled
    if (cfg.signIn && cfg.signIn.email && !cfg.signIn.email.enabled) {
      console.log("Enabling email/password sign-in...");
      const updateBody = JSON.stringify({
        signIn: { email: { enabled: true, passwordRequired: true } }
      });
      const updateRes = await httpRequest(
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
      console.log("Enable result:", updateRes.status);
    }
  }
}

async function main() {
  try {
    console.log("Getting access token...");
    const accessToken = await getAccessToken();
    console.log("Access token obtained");

    // Check and enable email auth if needed
    await enableEmailAuth(accessToken);

    console.log("Creating admin user...");
    const uid = await createUser(accessToken);

    console.log("Setting custom claims...");
    await setCustomClaims(accessToken, uid);

    console.log("Creating Firestore document...");
    await createFirestoreDoc(accessToken, uid);

    console.log("Admin seeding complete!");
    console.log(`  Email: ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
}

main();
