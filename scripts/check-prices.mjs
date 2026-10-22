// Daily price-drop check, run on a schedule by
// .github/workflows/price-check.yml (no server, no Blaze plan — this just
// runs on GitHub's free Actions runner and talks to Firestore directly with
// the same service-account key the deploy workflow already uses).
//
// For every gift that's still an "idea" and has a link + a saved price, we
// re-check the product page. If the current price is lower than what's
// saved, we flag the gift (priceDropped/priceWas/priceNow/priceDropAt) so
// the app can show a "price dropped" badge next time someone opens it, and
// we push a notification (Firebase Cloud Messaging, also free) to anyone
// who has alerts turned on and has that gift's board open on their device.
// If the price has recovered back to (or above) what's saved, we clear the
// flag. We never touch the gift's own `price` field here — only the app,
// at the person's own tap, does that.
import { readFileSync } from "node:fs";
import admin from "firebase-admin";

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS is not set");
  process.exit(1);
}
const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const messaging = admin.messaging();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePrice(raw) {
  if (raw == null || raw === "") return null;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function money(n) {
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

async function fetchCurrentPrice(url) {
  try {
    const r = await fetch("https://api.microlink.io/?url=" + encodeURIComponent(url) + "&palette=false");
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || j.status !== "success" || !j.data) return null;
    return parsePrice(j.data.price);
  } catch (e) {
    console.error("  fetch failed:", e.message);
    return null;
  }
}

// Board membership lives as users/{uid}/boards/{boardId} docs (each member's
// "My Lists" index entry), alongside the top-level boards/{boardId} doc
// itself — both share the collection id "boards", so a collectionGroup
// query returns both kinds. Keep only the nested ones (they have a parent
// document, "users/{uid}"); the top-level board doc doesn't.
async function loadBoardMembers() {
  const snap = await db.collectionGroup("boards").get();
  const byBoard = new Map(); // boardId -> Set(uid)
  for (const docSnap of snap.docs) {
    const parentDoc = docSnap.ref.parent.parent; // users/{uid}, or null for the top-level boards/{id} doc
    if (!parentDoc || parentDoc.parent.id !== "users") continue;
    const boardId = docSnap.id;
    const uid = parentDoc.id;
    if (!byBoard.has(boardId)) byBoard.set(boardId, new Set());
    byBoard.get(boardId).add(uid);
  }
  return byBoard;
}

async function loadUserTokens(uids) {
  const byUid = new Map();
  await Promise.all(Array.from(uids).map(async (uid) => {
    const snap = await db.collection("users").doc(uid).get();
    const tokens = (snap.exists && snap.data().fcmTokens) || [];
    if (tokens.length) byUid.set(uid, tokens);
  }));
  return byUid;
}

async function sendDropNotifications(drops, boardMembers) {
  if (!drops.length) return;
  // boardId -> all tokens of everyone on that board
  const neededUids = new Set();
  drops.forEach((d) => (boardMembers.get(d.boardId) || new Set()).forEach((uid) => neededUids.add(uid)));
  if (!neededUids.size) return;

  const tokensByUid = await loadUserTokens(neededUids);
  if (!tokensByUid.size) return;

  const messages = [];
  const tokenOwners = new Map(); // token -> uid, so a bad token can be pruned from the right doc
  for (const d of drops) {
    const uids = boardMembers.get(d.boardId) || new Set();
    const tokens = new Set();
    uids.forEach((uid) => (tokensByUid.get(uid) || []).forEach((t) => { tokens.add(t); tokenOwners.set(t, uid); }));
    if (!tokens.size) continue;
    const title = "Price dropped: " + d.title;
    const body = money(d.priceWas) + " → " + money(d.priceNow);
    tokens.forEach((token) => {
      messages.push({
        token,
        notification: { title, body },
        data: { boardId: d.boardId, url: "https://ourwrapsheet.web.app/b/" + d.boardId },
        webpush: { fcmOptions: { link: "https://ourwrapsheet.web.app/b/" + d.boardId } },
      });
    });
  }
  if (!messages.length) return;

  // sendEach handles mixed valid/invalid tokens without failing the batch.
  const res = await messaging.sendEach(messages);
  let sent = 0, pruned = 0;
  await Promise.all(res.responses.map(async (r, i) => {
    if (r.success) { sent++; return; }
    const code = r.error && r.error.code;
    if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
      const token = messages[i].token;
      const uid = tokenOwners.get(token);
      if (uid) {
        pruned++;
        await db.collection("users").doc(uid).update({ fcmTokens: admin.firestore.FieldValue.arrayRemove(token) }).catch(() => {});
      }
    } else {
      console.error("  push failed:", code, r.error && r.error.message);
    }
  }));
  console.log(`Sent ${sent} push notification(s)${pruned ? `, pruned ${pruned} dead token(s)` : ""}.`);
}

async function main() {
  const boardMembers = await loadBoardMembers();
  const snap = await db.collectionGroup("gifts").get();
  let checked = 0, dropped = 0, recovered = 0, skipped = 0;
  const newDrops = [];

  for (const docSnap of snap.docs) {
    const g = docSnap.data();
    if (!g.url || (g.status || "idea") !== "idea" || g.price == null) { skipped++; continue; }

    checked++;
    const now = Date.now();
    const currentPrice = await fetchCurrentPrice(g.url);
    const boardId = docSnap.ref.parent.parent.id;

    if (currentPrice == null) {
      await docSnap.ref.update({ lastPriceCheck: now }).catch((e) => console.error("  update failed:", e.message));
    } else if (currentPrice < g.price - 0.009) {
      dropped++;
      const isNew = !g.priceDropped;
      console.log(`price drop: "${g.title || docSnap.id}" $${g.price} -> $${currentPrice}${isNew ? "" : " (already flagged)"}`);
      await docSnap.ref.update({
        priceDropped: true,
        priceWas: g.price,
        priceNow: currentPrice,
        priceDropAt: now,
        lastPriceCheck: now,
      }).catch((e) => console.error("  update failed:", e.message));
      if (isNew) newDrops.push({ boardId, title: g.title || "a gift", priceWas: g.price, priceNow: currentPrice });
    } else {
      if (g.priceDropped) recovered++;
      await docSnap.ref.update({
        priceDropped: false,
        priceWas: admin.firestore.FieldValue.delete(),
        priceNow: admin.firestore.FieldValue.delete(),
        priceDropAt: admin.firestore.FieldValue.delete(),
        lastPriceCheck: now,
      }).catch((e) => console.error("  update failed:", e.message));
    }

    await sleep(400); // be polite to the free lookup API
  }

  console.log(`Checked ${checked} item(s), skipped ${skipped} (no link/price or not an idea). ${dropped} new drop(s), ${recovered} recovered.`);

  await sendDropNotifications(newDrops, boardMembers).catch((e) => console.error("Push notification step failed:", e.message));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
