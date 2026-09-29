import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const root = fileURLToPath(new URL(".", import.meta.url));
const frontend = join(root, "frontend");
const dataDir = join(root, "data");
if (!existsSync(dataDir)) mkdirSync(dataDir);
const db = new DatabaseSync(join(dataDir, "tripsplit.sqlite"));
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS trips (id TEXT PRIMARY KEY, name TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'INR', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, share_code TEXT UNIQUE NOT NULL);
  CREATE TABLE IF NOT EXISTS travelers (id TEXT PRIMARY KEY, trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE, name TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE, payer_id TEXT NOT NULL REFERENCES travelers(id) ON DELETE RESTRICT, title TEXT NOT NULL, amount REAL NOT NULL CHECK (amount > 0), created_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS travelers_trip_id_idx ON travelers(trip_id);
  CREATE INDEX IF NOT EXISTS expenses_trip_id_idx ON expenses(trip_id);
`);

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};
const now = () => new Date().toISOString();
const code = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const body = async req => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
};
const tripFor = value => db.prepare("SELECT * FROM trips WHERE id = ? OR share_code = ?").get(value, value);

function tripPayload(trip) {
  const travelers = db.prepare("SELECT id,name,position FROM travelers WHERE trip_id = ? ORDER BY position,created_at").all(trip.id);
  const expenses = db.prepare("SELECT e.id,e.title,e.amount,e.created_at,e.payer_id,t.name AS payer_name FROM expenses e JOIN travelers t ON t.id=e.payer_id WHERE e.trip_id=? ORDER BY e.created_at,e.id").all(trip.id).map(item => ({ ...item, amount: Number(item.amount) }));
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const share = travelers.length ? total / travelers.length : 0;
  const balances = travelers.map(person => {
    const paid = expenses.filter(item => item.payer_id === person.id).reduce((sum, item) => sum + item.amount, 0);
    return { traveler_id: person.id, name: person.name, paid, balance: paid - share };
  });
  const debtors = balances.filter(item => item.balance < -0.005).map(item => ({ ...item, amount: -item.balance }));
  const creditors = balances.filter(item => item.balance > 0.005).map(item => ({ ...item, amount: item.balance }));
  const settlements = [];
  for (const debtor of debtors) while (debtor.amount > 0.005 && creditors.length) {
    const creditor = creditors[0];
    const amount = Math.min(debtor.amount, creditor.amount);
    settlements.push({ from_name: debtor.name, to_name: creditor.name, amount: Number(amount.toFixed(2)) });
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (creditor.amount <= 0.005) creditors.shift();
  }
  return { trip, travelers, expenses, summary: { total: Number(total.toFixed(2)), equal_share: Number(share.toFixed(2)), expense_count: expenses.length, balances, settlements } };
}

async function api(req, res, pathname) {
  const parts = pathname.split("/").filter(Boolean);
  try {
    if (req.method === "POST" && pathname === "/api/trips/create") {
      const input = await body(req);
      const names = Array.isArray(input.travelers) ? input.travelers.slice(0, 20) : ["Person 1", "Person 2"];
      let shareCode;
      do shareCode = code(); while (db.prepare("SELECT 1 FROM trips WHERE share_code=?").get(shareCode));
      const timestamp = now();
      const trip = { id: randomUUID(), name: String(input.name || "New Trip").trim().slice(0, 120) || "New Trip", currency: "INR", share_code: shareCode, created_at: timestamp, updated_at: timestamp };
      db.prepare("INSERT INTO trips VALUES (?,?,?,?,?,?)").run(trip.id, trip.name, trip.currency, trip.created_at, trip.updated_at, trip.share_code);
      const travelers = names.map((value, position) => {
        const traveler = { id: randomUUID(), name: String(value || `Person ${position + 1}`).trim().slice(0, 80) || `Person ${position + 1}`, position };
        db.prepare("INSERT INTO travelers VALUES (?,?,?,?,?)").run(traveler.id, trip.id, traveler.name, position, timestamp);
        return traveler;
      });
      return json(res, 201, { trip, travelers });
    }
    if (req.method === "GET" && pathname === "/api/trips/history") {
      const trips = db.prepare("SELECT t.id,t.name,t.share_code,t.created_at,t.updated_at,COUNT(e.id) AS expense_count,COALESCE(SUM(e.amount),0) AS total FROM trips t LEFT JOIN expenses e ON e.trip_id=t.id GROUP BY t.id ORDER BY t.updated_at DESC,t.created_at DESC").all().map(item => ({ ...item, expense_count: Number(item.expense_count), total: Number(item.total) }));
      return json(res, 200, { trips });
    }
    if (parts[0] === "api" && parts[1] === "trips" && parts[2] && parts.length === 3) {
      const trip = tripFor(decodeURIComponent(parts[2]));
      if (!trip) return json(res, 404, { error: "Trip not found." });
      if (req.method === "DELETE") { db.prepare("DELETE FROM trips WHERE id=?").run(trip.id); return json(res, 200, { success: true }); }
      return json(res, 200, tripPayload(trip));
    }
    if (parts[0] === "api" && parts[1] === "trips" && parts[2] && parts[3] === "expenses" && parts.length === 4 && req.method === "POST") {
      const trip = tripFor(decodeURIComponent(parts[2]));
      if (!trip) return json(res, 404, { error: "Trip not found." });
      const input = await body(req);
      const payer = db.prepare("SELECT id FROM travelers WHERE id=? AND trip_id=?").get(String(input.payer_id || ""), trip.id);
      const amount = Number(input.amount);
      if (!payer || !Number.isFinite(amount) || amount <= 0) return json(res, 400, { error: "payer_id and a positive amount are required." });
      const expense = { id: randomUUID(), trip_id: trip.id, payer_id: payer.id, title: String(input.title || "Trip expense").trim().slice(0, 160) || "Trip expense", amount: Number(amount.toFixed(2)), created_at: now() };
      db.prepare("INSERT INTO expenses VALUES (?,?,?,?,?,?)").run(expense.id, expense.trip_id, expense.payer_id, expense.title, expense.amount, expense.created_at);
      db.prepare("UPDATE trips SET updated_at=? WHERE id=?").run(now(), trip.id);
      return json(res, 201, { expense });
    }
    if (parts[0] === "api" && parts[1] === "trips" && parts[3] === "expenses" && parts.length === 5 && req.method === "DELETE") {
      const trip = tripFor(decodeURIComponent(parts[2]));
      if (!trip || !db.prepare("SELECT id FROM expenses WHERE id=? AND trip_id=?").get(parts[4], trip.id)) return json(res, 404, { error: "Expense not found." });
      db.prepare("DELETE FROM expenses WHERE id=?").run(parts[4]);
      db.prepare("UPDATE trips SET updated_at=? WHERE id=?").run(now(), trip.id);
      return json(res, 200, { success: true, deleted_expense_id: parts[4] });
    }
    if (parts[0] === "api" && parts[1] === "trips" && parts[3] === "travelers" && parts[4] && req.method === "PUT") {
      const trip = tripFor(decodeURIComponent(parts[2]));
      const input = await body(req);
      const name = String(input.name || "").trim().slice(0, 80);
      if (!name) return json(res, 400, { error: "Traveler name is required." });
      const result = db.prepare("UPDATE travelers SET name=? WHERE id=? AND trip_id=? RETURNING id,name,position").get(name, parts[4], trip?.id || "");
      if (!result) return json(res, 404, { error: "Traveler not found." });
      db.prepare("UPDATE trips SET updated_at=? WHERE id=?").run(now(), trip.id);
      return json(res, 200, { traveler: result });
    }
    if (parts[0] === "api" && parts[1] === "trips" && parts[3] === "travelers" && parts[4] === "sync" && req.method === "POST") {
      const trip = tripFor(decodeURIComponent(parts[2]));
      if (!trip) return json(res, 404, { error: "Trip not found." });
      const input = await body(req);
      const names = Array.isArray(input.travelers) ? input.travelers.slice(0, 20) : [];
      const current = db.prepare("SELECT id FROM travelers WHERE trip_id=? ORDER BY position").all(trip.id);
      for (let index = 0; index < names.length; index++) {
        const name = String(names[index] || `Person ${index + 1}`).trim().slice(0, 80) || `Person ${index + 1}`;
        if (current[index]) db.prepare("UPDATE travelers SET name=? WHERE id=?").run(name, current[index].id);
        else db.prepare("INSERT INTO travelers VALUES (?,?,?,?,?)").run(randomUUID(), trip.id, name, index, now());
      }
      for (let index = names.length; index < current.length; index++) {
        if (!db.prepare("SELECT 1 FROM expenses WHERE payer_id=?").get(current[index].id)) db.prepare("DELETE FROM travelers WHERE id=?").run(current[index].id);
      }
      db.prepare("UPDATE trips SET updated_at=? WHERE id=?").run(now(), trip.id);
      return json(res, 200, { success: true });
    }
    return json(res, 404, { error: "Not found." });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Unable to process request." });
  }
}

const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname.startsWith("/api/")) return api(req, res, pathname);
  const requested = pathname === "/" ? "index.html" : normalize(pathname).replace(/^[/\\]+/, "");
  const file = join(frontend, requested);
  if (!file.startsWith(frontend) || !existsSync(file)) return json(res, 404, { error: "Page not found." });
  res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream" });
  res.end(await readFile(file));
});
const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`TripSplit running at http://localhost:${port}`));