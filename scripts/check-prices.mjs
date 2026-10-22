// Daily price-drop check, run on a schedule by
// .github/workflows/price-check.yml (no server, no Blaze plan — this just
// runs on GitHub's free Actions runner and talks to Firestore directly with
// the same service-account key the deploy workflow already uses).
//
// For every gift that's still an "idea" and has a link + a saved price, we
// re-check the product page. If the current price is lower than what's
// saved, we flag the gift (priceDropped/priceWas/priceNow/priceDropAt) so
// the app can show a "price dropped" badge next time someone opens it. If
// the price has recovered back to (or above) what's saved, we clear the
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePrice(raw) {
  if (raw == null || raw === "") return null;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
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

async function main() {
  const snap = await db.collectionGroup("gifts").get();
  let checked = 0, dropped = 0, recovered = 0, skipped = 0;

  for (const docSnap of snap.docs) {
    const g = docSnap.data();
    if (!g.url || (g.status || "idea") !== "idea" || g.price == null) { skipped++; continue; }

    checked++;
    const now = Date.now();
    const currentPrice = await fetchCurrentPrice(g.url);

    if (currentPrice == null) {
      await docSnap.ref.update({ lastPriceCheck: now }).catch((e) => console.error("  update failed:", e.message));
    } else if (currentPrice < g.price - 0.009) {
      dropped++;
      console.log(`price drop: "${g.title || docSnap.id}" $${g.price} -> $${currentPrice}`);
      await docSnap.ref.update({
        priceDropped: true,
        priceWas: g.price,
        priceNow: currentPrice,
        priceDropAt: now,
        lastPriceCheck: now,
      }).catch((e) => console.error("  update failed:", e.message));
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
