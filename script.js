
const $ = id => document.getElementById(id);
const KEY = "asharPro_business_v1";
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const monthNow = () => today().slice(0,7);

let db = { transactions: [], customers: [] };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");
  if (saved && Array.isArray(saved.transactions) && Array.isArray(saved.customers)) db = saved;
} catch (e) { console.warn("Could not load saved data", e); }

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    return true;
  } catch (e) {
    toast("Could not save. Browser storage may be unavailable or full.");
    return false;
  }
}
let toastTimer;
function toast(message) {
  $("toast").textContent = message;
  $("toast").style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").style.display = "none", 3000);
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
}
function money(value) {
  return "Rs " + Number(value || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 2
  });
}
function id() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);
}
function empty(message) {
  return `<div class="empty">${esc(message)}</div>`;
}
function table(headers, rows) {
  if (!rows.length) return empty("No records found.");
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}
function sortedTransactions(list) {
  return [...list].sort((a,b) => b.date.localeCompare(a.date) || b.createdAt-a.createdAt);
}
function totals(list) {
  const sales = list.filter(t=>t.type==="sale").reduce((n,t)=>n+t.amount,0);
  const expenses = list.filter(t=>t.type==="expense").reduce((n,t)=>n+t.amount,0);
  return {sales,expenses,net:sales-expenses};
}

function showView(name) {
  document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
  $(`${name}View`).classList.remove("hidden");
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  $("pageTitle").textContent = ({dashboard:"Dashboard",transactions:"Transactions",customers:"Customers",reports:"Reports"})[name];
  $("sidebar").classList.remove("open");
  renderAll();
}
document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.go)));
$("menuBtn").addEventListener("click",()=>$("sidebar").classList.toggle("open"));

function openTransaction(type="sale") {
  showView("transactions");
  $("transactionForm").classList.remove("hidden");
  $("transactionType").value=type;
  $("transactionDate").value=today();
  $("transactionCategory").focus();
}
$("addQuick").addEventListener("click",()=>openTransaction());
$("newTransaction").addEventListener("click",()=>openTransaction());
document.querySelectorAll("[data-quick]").forEach(b=>b.addEventListener("click",()=>openTransaction(b.dataset.quick)));
$("cancelTransaction").addEventListener("click",()=>{
  $("transactionForm").reset();
  $("transactionForm").classList.add("hidden");
});

$("transactionForm").addEventListener("submit",e=>{
  e.preventDefault();
  const amount=Number($("transactionAmount").value);
  const date=$("transactionDate").value;
  const category=$("transactionCategory").value.trim();
  if(!Number.isFinite(amount)||amount<=0||!date||!category){
    toast("Enter a valid amount, date and category.");return;
  }
  const item={
    id:id(),type:$("transactionType").value,amount,
    date,category,note:$("transactionNote").value.trim(),
    createdAt:Date.now()
  };
  db.transactions.push(item);
  if(!save()){db.transactions.pop();return;}
  $("transactionForm").reset();
  $("transactionDate").value=today();
  $("transactionForm").classList.add("hidden");
  renderAll();
  toast("Transaction saved successfully.");
});

$("transactionSearch").addEventListener("input",renderTransactions);
$("transactionFilter").addEventListener("change",renderTransactions);

function renderTransactions() {
  const q=$("transactionSearch").value.trim().toLowerCase();
  const filter=$("transactionFilter").value;
  const list=sortedTransactions(db.transactions).filter(t=>
    (filter==="all"||t.type===filter) &&
    [t.category,t.note,t.date].some(v=>String(v).toLowerCase().includes(q))
  );
  $("transactionsTable").innerHTML=table(
    ["DATE","TYPE","CATEGORY / NOTES","AMOUNT","ACTION"],
    list.map(t=>`<tr>
      <td>${esc(t.date)}</td>
      <td><span class="type-badge ${esc(t.type)}">${t.type==="sale"?"Sale":"Expense"}</span></td>
      <td><span class="name-cell">${esc(t.category)}</span>${t.note?`<span class="subtext">${esc(t.note)}</span>`:""}</td>
      <td class="amount-${esc(t.type)}">${t.type==="sale"?"+":"−"}${money(t.amount)}</td>
      <td><button class="delete-btn" data-delete-transaction="${esc(t.id)}">Delete</button></td>
    </tr>`)
  );
}
$("transactionsTable").addEventListener("click",e=>{
  const b=e.target.closest("[data-delete-transaction]");
  if(!b)return;
  const item=db.transactions.find(t=>t.id===b.dataset.deleteTransaction);
  if(!item||!confirm("Delete this transaction?"))return;
  const old=db.transactions;
  db.transactions=old.filter(t=>t.id!==item.id);
  if(!save()){db.transactions=old;return;}
  renderAll();toast("Transaction deleted.");
});

$("newCustomer").addEventListener("click",()=>{
  $("customerForm").classList.remove("hidden");
  $("customerName").focus();
});
$("cancelCustomer").addEventListener("click",()=>{
  $("customerForm").reset();
  $("customerForm").classList.add("hidden");
});
$("customerForm").addEventListener("submit",e=>{
  e.preventDefault();
  const name=$("customerName").value.trim();
  const phone=$("customerPhone").value.trim();
  const note=$("customerNote").value.trim();
  if(!name)return;
  db.customers.push({id:id(),name,phone,note,createdAt:Date.now()});
  if(!save()){db.customers.pop();return;}
  $("customerForm").reset();
  $("customerForm").classList.add("hidden");
  renderAll();toast("Customer saved successfully.");
});
$("customerSearch").addEventListener("input",renderCustomers);

function renderCustomers() {
  const q=$("customerSearch").value.trim().toLowerCase();
  const list=[...db.customers].reverse().filter(c=>
    [c.name,c.phone,c.note].some(v=>v.toLowerCase().includes(q))
  );
  $("customersTable").innerHTML=table(["CUSTOMER","PHONE","NOTES","ACTION"],
    list.map(c=>`<tr>
      <td class="name-cell">${esc(c.name)}</td>
      <td>${esc(c.phone||"—")}</td><td>${esc(c.note||"—")}</td>
      <td><button class="delete-btn" data-delete-customer="${esc(c.id)}">Delete</button></td>
    </tr>`)
  );
}
$("customersTable").addEventListener("click",e=>{
  const b=e.target.closest("[data-delete-customer]");
  if(!b)return;
  const c=db.customers.find(x=>x.id===b.dataset.deleteCustomer);
  if(!c||!confirm(`Delete customer ${c.name}?`))return;
  const old=db.customers;
  db.customers=old.filter(x=>x.id!==c.id);
  if(!save()){db.customers=old;return;}
  renderAll();toast("Customer deleted.");
});

function renderDashboard() {
  const t=totals(db.transactions);
  $("salesTotal").textContent=money(t.sales);
  $("expenseTotal").textContent=money(t.expenses);
  $("profitTotal").textContent=money(t.net);
  $("profitTotal").style.color=t.net<0?"#c84158":"#16835f";
  $("customerTotal").textContent=db.customers.length;
  const list=sortedTransactions(db.transactions).slice(0,6);
  $("recentTransactions").innerHTML=table(["DATE","CATEGORY","TYPE","AMOUNT"],
    list.map(x=>`<tr><td>${esc(x.date)}</td><td class="name-cell">${esc(x.category)}</td>
    <td><span class="type-badge ${esc(x.type)}">${x.type==="sale"?"Sale":"Expense"}</span></td>
    <td class="amount-${esc(x.type)}">${x.type==="sale"?"+":"−"}${money(x.amount)}</td></tr>`)
  );
}

function renderReports() {
  const month=$("reportMonth").value;
  const list=sortedTransactions(db.transactions).filter(t=>!month||t.date.startsWith(month));
  const t=totals(list);
  $("reportSales").textContent=money(t.sales);
  $("reportExpenses").textContent=money(t.expenses);
  $("reportNet").textContent=money(t.net);
  $("reportNet").style.color=t.net<0?"#c84158":"#16835f";
  $("reportCount").textContent=list.length;
  $("reportTable").innerHTML=table(["DATE","TYPE","CATEGORY","AMOUNT","NOTES"],
    list.map(x=>`<tr><td>${esc(x.date)}</td>
    <td><span class="type-badge ${esc(x.type)}">${x.type==="sale"?"Sale":"Expense"}</span></td>
    <td>${esc(x.category)}</td><td>${money(x.amount)}</td><td>${esc(x.note||"—")}</td></tr>`)
  );
}
$("reportMonth").value=monthNow();
$("reportMonth").addEventListener("change",renderReports);
$("allMonths").addEventListener("click",()=>{$("reportMonth").value="";renderReports();});

function renderAll() {
  renderDashboard();renderTransactions();renderCustomers();renderReports();
}
$("dateLabel").textContent=new Date().toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short",year:"numeric"});
$("transactionDate").value=today();
renderAll();
