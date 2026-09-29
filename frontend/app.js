const $ = selector => document.querySelector(selector);
const API = window.__HATCHABLE__?.api || "/api";
let trip = null, people = [], expenses = [];
const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value) || 0);
const esc = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[character]));
async function api(path, options = {}) { const response = await fetch(API + path, { headers: { "Content-Type": "application/json" }, ...options }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Request failed"); return data; }
function render() {
  const total = expenses.reduce((sum, item) => sum + Number(item.amount), 0), share = people.length ? total / people.length : 0;
  $("#tripName").textContent = trip.name; $("#shareCode").textContent = trip.share_code; $("#tripMeta").textContent = `${people.length} people · Last updated just now`;
  $("#total").textContent = money(total); $("#share").textContent = money(share); $("#expenseCount").textContent = expenses.length;
  $("#peopleList").innerHTML = people.map((person, index) => `<label class="person-input"><span>${index + 1}</span><input data-person="${person.id}" value="${esc(person.name)}"></label>`).join("");
  $("#payer").innerHTML = people.map(person => `<option value="${person.id}">${esc(person.name)}</option>`).join("");
  $("#expenseList").className = expenses.length ? "expense-list" : "expense-list empty";
  $("#expenseList").innerHTML = expenses.length ? expenses.map(item => `<div class="expense-item"><div><b>${esc(item.title)}</b><small>${esc(item.payer_name || "Unknown")}</small></div><strong>${money(item.amount)}</strong></div>`).join("") : "No expenses yet.";
  const balances = people.map(person => ({ ...person, paid: expenses.filter(item => item.payer_id === person.id).reduce((sum, item) => sum + Number(item.amount), 0) }));
  $("#balances").innerHTML = balances.map(person => { const balance = person.paid - share; return `<div class="balance"><span>${esc(person.name)}</span><b class="${balance >= 0 ? "positive" : "negative"}">${balance >= 0 ? "+" : "-"}${money(Math.abs(balance))}</b></div>`; }).join("");
  const debtors = balances.filter(person => person.paid - share < -.005).map(person => ({ ...person, amount: share - person.paid })), creditors = balances.filter(person => person.paid - share > .005).map(person => ({ ...person, amount: person.paid - share })), settlements = [];
  for (const debtor of debtors) while (debtor.amount > .005 && creditors.length) { const creditor = creditors[0], amount = Math.min(debtor.amount, creditor.amount); settlements.push(`<div class="settle"><b>${esc(debtor.name)}</b> pays <b>${money(amount)}</b> to <b>${esc(creditor.name)}</b></div>`); debtor.amount -= amount; creditor.amount -= amount; if (creditor.amount <= .005) creditors.shift(); }
  $("#settlements").innerHTML = settlements.join("") || '<div class="settle">Everyone is settled up.</div>';
}
function showApp() { $("#welcome").classList.add("hidden"); $("#app").classList.remove("hidden"); }
function showWelcome() { $("#app").classList.add("hidden"); $("#welcome").classList.remove("hidden"); }
async function loadTrip(identifier) { const data = await api(`/trips/${encodeURIComponent(identifier)}`); trip = data.trip; people = data.travelers; expenses = data.expenses; localStorage.setItem("tripsplit_current", trip.share_code); showApp(); render(); }
async function createTrip() { const count = Math.max(1, Math.min(20, Number($("#peopleCount").value) || 4)), name = $("#newTripName").value.trim() || "My Trip"; const data = await api("/trips/create", { method: "POST", body: JSON.stringify({ name, travelers: Array.from({ length: count }, (_, index) => `Person ${index + 1}`) }) }); await loadTrip(data.trip.share_code); }
async function savePeople() { const names = [...document.querySelectorAll("[data-person]")].map(input => input.value.trim()); await api(`/trips/${encodeURIComponent(trip.share_code)}/travelers/sync`, { method: "POST", body: JSON.stringify({ travelers: names }) }); await loadTrip(trip.share_code); }
async function addExpense() { const amount = Number($("#amount").value); if (!$("#payer").value || !Number.isFinite(amount) || amount <= 0) return alert("Choose a payer and enter a positive amount."); await api(`/trips/${encodeURIComponent(trip.share_code)}/expenses`, { method: "POST", body: JSON.stringify({ payer_id: $("#payer").value, title: $("#title").value, amount }) }); $("#title").value = ""; $("#amount").value = ""; await loadTrip(trip.share_code); }
async function showHistory() { $("#history").classList.remove("hidden"); const data = await api("/trips/history"); $("#historyList").innerHTML = data.trips.length ? data.trips.map(item => `<div class="history-item"><div><strong>${esc(item.name)}</strong><span>${item.expense_count} expenses · ${money(item.total)} · ${esc(item.share_code)}</span></div><button class="secondary" data-resume="${esc(item.share_code)}">Resume</button></div>`).join("") : "No saved trips yet."; document.querySelectorAll("[data-resume]").forEach(button => button.onclick = async () => { await loadTrip(button.dataset.resume); $("#history").classList.add("hidden"); }); }
$("#createBtn").onclick = () => { $("#createBox").classList.remove("hidden"); $("#joinBox").classList.add("hidden"); };
$("#joinBtn").onclick = () => { $("#joinBox").classList.remove("hidden"); $("#createBox").classList.add("hidden"); };
$("#startTrip").onclick = async () => { try { await createTrip(); } catch (error) { alert(error.message); } };
$("#joinTrip").onclick = async () => { try { const code = $("#joinCode").value.trim().toUpperCase(); if (!code) return alert("Enter a trip code."); await loadTrip(code); } catch (error) { alert("Trip not found. Check the code."); } };
$("#buildPeople").onclick = savePeople; $("#addExpense").onclick = addExpense; $("#historyBtn").onclick = showHistory; $("#closeHistory").onclick = () => $("#history").classList.add("hidden");
$("#resetBtn").onclick = () => { localStorage.removeItem("tripsplit_current"); trip = null; showWelcome(); };
$("#copyBtn").onclick = async () => { await navigator.clipboard.writeText(`${location.origin}${location.pathname}?trip=${trip.share_code}`); alert("Join link copied."); };
(async () => { const queryTrip = new URLSearchParams(location.search).get("trip"), saved = queryTrip || localStorage.getItem("tripsplit_current"); if (saved) { try { await loadTrip(saved); } catch { localStorage.removeItem("tripsplit_current"); showWelcome(); } } else showWelcome(); })();
