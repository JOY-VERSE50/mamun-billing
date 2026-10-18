
/* =====================================
   MAMUN CHATRABASH BILL MANAGER
   ===================================== */

// নিজের Apps Script Web App URL বসাও
const API_URL = "https://script.google.com/macros/s/AKfycbzfpXGH-HUpwS6W-oxdqQx4V1TW_m7gSb3sE4lV4ebHGA3fIu7gnCecg-d9BUEzTZVSFA/exec";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "12345678";

let membersData = [];
let paymentsData = [];
let currentPaymentFilter = {
  month: "",
  type: ""
};

const $ = id => document.getElementById(id);

function today() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000)
    .toISOString().slice(0, 10);
}

function currentMonth() {
  return today().slice(0, 7);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function money(value) {
  return "৳" + Number(value || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2
  });
}

function showMessage(message, isError = false) {
  const el = $("appMessage");
  if (!el) return;

  el.textContent = message;
  el.classList.toggle("error-message", isError);

  if (isError) {
    el.style.color = "#ff647c";
  } else {
    el.style.color = "#24c78a";
  }
}

function setFormDefaults() {
  [
    "electricityMonth",
    "wifiMonth",
    "electricityExpenseMonth",
    "wifiExpenseMonth"
  ].forEach(id => {
    if ($(id) && !$(id).value) $(id).value = currentMonth();
  });

  [
    "electricityDate",
    "wifiDate",
    "electricityExpenseDate",
    "wifiExpenseDate"
  ].forEach(id => {
    if ($(id) && !$(id).value) $(id).value = today();
  });
}


/* =====================================
   API HELPER
   ===================================== */

async function api(action, data = null, id = null) {
  if (
    !API_URL ||
    API_URL.includes("PASTE_YOUR")
  ) {
    throw new Error("app.js-এ Apps Script Web App URL বসাও।");
  }

  const params = new URLSearchParams();
  params.set("action", action);

  if (data !== null) {
    params.set("data", JSON.stringify(data));
  }

  if (id !== null) {
    params.set("id", String(id));
  }

  const response = await fetch(
    API_URL + "?" + params.toString(),
    { method: "GET", redirect: "follow" }
  );

  if (!response.ok) {
    throw new Error("Server response error: " + response.status);
  }

  const result = await response.json();

  if (result && result.success === false) {
    throw new Error(result.message || "Operation failed.");
  }

  return result;
}


/* =====================================
   LOGIN / LOGOUT
   ===================================== */

function showApp() {
  $("loginPage").classList.add("hidden");
  $("appPage").classList.remove("hidden");

  setFormDefaults();
  loadAllData();
}

function logout() {
  localStorage.removeItem("mamunAdminLoggedIn");
  $("appPage").classList.add("hidden");
  $("loginPage").classList.remove("hidden");
}

function handleLogin(event) {
  event.preventDefault();

  const username = $("username").value.trim();
  const password = $("password").value;
  const message = $("loginMessage");

  if (
    username === ADMIN_USERNAME &&
    password === ADMIN_PASSWORD
  ) {
    localStorage.setItem("mamunAdminLoggedIn", "true");
    message.textContent = "";
    showApp();
  } else {
    message.textContent = "Incorrect username or password.";
    message.classList.add("error-message");
  }
}


/* =====================================
   NAVIGATION
   ===================================== */

function showPanel(panelId) {
  document.querySelectorAll(".main-content .panel").forEach(panel => {
    panel.classList.toggle("hidden", panel.id !== panelId);
  });

  document.querySelectorAll(".navigation button").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.target === panelId
    );
  });

  if (panelId === "membersPanel") loadMembers();
  if (panelId === "paymentsPanel") loadPayments();
}


/* =====================================
   LOAD ALL DATA
   ===================================== */

async function loadAllData() {
  showMessage("Loading data...");

  try {
    await loadMembers();
    await loadPayments();
    showMessage("Data loaded successfully.");
  } catch (error) {
    showMessage(error.message, true);
  }
}


/* =====================================
   MEMBERS
   ===================================== */

function normalizeMembers(result) {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  return [];
}

function memberField(member, field) {
  const aliases = {
    id: ["ID", "id"],
    name: ["Name", "name"],
    room: ["Room", "room"],
    phone: ["Phone", "phone"],
    joinDate: ["Join Date", "joinDate", "join_date"],
    status: ["Status", "status"]
  };

  for (const key of aliases[field] || [field]) {
    if (member[key] !== undefined) return member[key];
  }

  return "";
}

async function loadMembers() {
  const result = await api("getMembers");
  membersData = normalizeMembers(result);

  renderMembers();
  populateMemberDropdowns();
  updateDashboard();

  return membersData;
}

function renderMembers() {
  const tbody = $("membersTableBody");
  if (!tbody) return;

  if (membersData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6">No members added yet.</td></tr>';
    return;
  }

  tbody.innerHTML = membersData.map(member => {
    const id = memberField(member, "id");
    const name = memberField(member, "name");
    const room = memberField(member, "room");
    const phone = memberField(member, "phone");
    const joinDate = memberField(member, "joinDate");
    const status = memberField(member, "status");

    return `
      <tr>
        <td>${escapeHTML(name)}</td>
        <td>${escapeHTML(room)}</td>
        <td>${escapeHTML(phone)}</td>
        <td>${escapeHTML(joinDate)}</td>
        <td>${escapeHTML(status)}</td>
        <td>
          <button type="button"
            data-action="edit-member"
            data-id="${escapeHTML(id)}">Edit</button>
          <button type="button"
            class="secondary-btn"
            data-action="remove-member"
            data-id="${escapeHTML(id)}">Remove</button>
        </td>
      </tr>
    `;
  }).join("");
}

function populateMemberDropdowns() {
  ["electricityMember", "wifiMember"].forEach(selectId => {
    const select = $(selectId);
    if (!select) return;

    const previousValue = select.value;

    select.innerHTML =
      '<option value="">Select Member</option>';

    membersData
      .filter(m =>
        String(memberField(m, "status")).toLowerCase() === "active"
      )
      .forEach(member => {
        const id = memberField(member, "id");
        const name = memberField(member, "name");
        const room = memberField(member, "room");

        const option = document.createElement("option");
        option.value = id;
        option.textContent = `${name} — Room ${room}`;
        select.appendChild(option);
      });

    if ([...select.options].some(o => o.value === previousValue)) {
      select.value = previousValue;
    }
  });
}

function openMemberForm(member = null) {
  const form = $("memberForm");
  form.classList.remove("hidden");

  $("memberId").value = member
    ? memberField(member, "id")
    : "";

  $("memberName").value = member
    ? memberField(member, "name")
    : "";

  $("memberRoom").value = member
    ? memberField(member, "room")
    : "";

  $("memberPhone").value = member
    ? memberField(member, "phone")
    : "";

  $("memberJoinDate").value = member
    ? String(memberField(member, "joinDate") || "").slice(0, 10)
    : today();

  $("memberStatus").value = member
    ? memberField(member, "status") || "Active"
    : "Active";

  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeMemberForm() {
  $("memberForm").reset();
  $("memberId").value = "";
  $("memberForm").classList.add("hidden");
}

async function saveMember(event) {
  event.preventDefault();

  const id = $("memberId").value;

  const data = {
    name: $("memberName").value.trim(),
    room: $("memberRoom").value.trim(),
    phone: $("memberPhone").value.trim(),
    joinDate: $("memberJoinDate").value,
    status: $("memberStatus").value
  };

  if (!data.name || !data.room) {
    showMessage("Name and room are required.", true);
    return;
  }

  try {
    const result = await api(
      id ? "editMember" : "addMember",
      data,
      id || null
    );

    if (result.success === false) {
      throw new Error(result.message || "Unable to save member.");
    }

    closeMemberForm();
    await loadMembers();
    showMessage(result.message || "Member saved successfully.");
  } catch (error) {
    showMessage(error.message, true);
  }
}

function editMemberById(id) {
  const member = membersData.find(m =>
    String(memberField(m, "id")) === String(id)
  );

  if (member) openMemberForm(member);
}

async function removeMemberById(id) {
  const member = membersData.find(m =>
    String(memberField(m, "id")) === String(id)
  );

  if (!member) return;

  if (!confirm(
    `Mark ${memberField(member, "name")} as inactive?`
  )) return;

  try {
    const result = await api("removeMember", null, id);
    await loadMembers();
    showMessage(result.message || "Member updated.");
  } catch (error) {
    showMessage(error.message, true);
  }
}


/* =====================================
   ELECTRICITY / WIFI EXPENSES
   ===================================== */

async function saveExpense(event, type) {
  event.preventDefault();

  const electricity = type === "Electricity";

  const data = electricity
    ? {
        amount: $("electricityExpenseAmount").value,
        date: $("electricityExpenseDate").value,
        month: $("electricityExpenseMonth").value,
        type: "Electricity",
        note: $("electricityExpenseNote").value.trim()
      }
    : {
        amount: $("wifiExpenseAmount").value,
        date: $("wifiExpenseDate").value,
        month: $("wifiExpenseMonth").value,
        note: $("wifiExpenseNote").value.trim()
      };

  if (Number(data.amount) <= 0) {
    showMessage("Enter a valid amount.", true);
    return;
  }

  try {
    const result = await api(
      electricity ? "addElectricity" : "addWifi",
      data
    );

    event.target.reset();
    setFormDefaults();
    showMessage(result.message || "Expense saved successfully.");
  } catch (error) {
    showMessage(error.message, true);
  }
}


/* =====================================
   MEMBER PAYMENTS
   ===================================== */

async function savePayment(event, type) {
  event.preventDefault();

  const electricity = type === "Electricity";
  const prefix = electricity ? "electricity" : "wifi";

  const memberId = $(prefix + "Member").value;
  const amount = Number($(prefix + "Amount").value);
  const month = $(prefix + "Month").value;
  const date = $(prefix + "Date").value;
  const note = $(prefix + "Note").value.trim();

  const member = membersData.find(m =>
    String(memberField(m, "id")) === String(memberId)
  );

  if (!member) {
    showMessage("Please select a member.", true);
    return;
  }

  if (amount <= 0 || !month || !date) {
    showMessage("Enter amount, month and payment date.", true);
    return;
  }

  const data = {
    memberId: String(memberField(member, "id")),
    memberName: String(memberField(member, "name")),
    room: String(memberField(member, "room")),
    amount,
    type,
    month,
    date,
    note
  };

  try {
    const result = await api("addPayment", data);

    if (result.success === false) {
      throw new Error(result.message || "Payment was not saved.");
    }

    event.target.reset();
    setFormDefaults();

    await loadPayments();
    updateDashboard();

    showMessage(result.message || `${type} payment saved.`);
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function loadPayments() {
  const result = await api("getPayments");

  paymentsData = normalizeMembers(result);
  renderPayments();
  updateDashboard();

  return paymentsData;
}

function paymentField(payment, field) {
  const aliases = {
    id: ["ID", "id"],
    memberId: ["Member ID", "memberId"],
    name: ["Member Name", "memberName"],
    room: ["Room", "room"],
    amount: ["Amount", "amount"],
    type: ["Type", "type"],
    month: ["Month", "month"],
    date: ["Date", "date"],
    note: ["Note", "note"]
  };

  for (const key of aliases[field] || [field]) {
    if (payment[key] !== undefined) return payment[key];
  }

  return "";
}

function renderPayments() {
  const tbody = $("paymentsTableBody");
  if (!tbody) return;

  const monthFilter = currentPaymentFilter.month;
  const typeFilter = currentPaymentFilter.type;

  const filtered = paymentsData.filter(payment => {
    const matchesMonth = !monthFilter ||
      String(paymentField(payment, "month")).slice(0, 7) === monthFilter;

    const matchesType = !typeFilter ||
      String(paymentField(payment, "type")) === typeFilter;

    return matchesMonth && matchesType;
  });

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7">No matching payments found.</td></tr>';
    return;
  }

  filtered.sort((a, b) =>
    String(paymentField(b, "date")).localeCompare(
      String(paymentField(a, "date"))
    )
  );

  tbody.innerHTML = filtered.map(payment => `
    <tr>
      <td>${escapeHTML(paymentField(payment, "date"))}</td>
      <td>${escapeHTML(paymentField(payment, "name"))}</td>
      <td>${escapeHTML(paymentField(payment, "room"))}</td>
      <td>${escapeHTML(paymentField(payment, "type"))}</td>
      <td>${escapeHTML(paymentField(payment, "month"))}</td>
      <td>${money(paymentField(payment, "amount"))}</td>
      <td>${escapeHTML(paymentField(payment, "note"))}</td>
    </tr>
  `).join("");
}

function applyPaymentFilters() {
  currentPaymentFilter.month = $("paymentMonthFilter").value;
  currentPaymentFilter.type = $("paymentTypeFilter").value;
  renderPayments();
}

function clearPaymentFilters() {
  $("paymentMonthFilter").value = "";
  $("paymentTypeFilter").value = "";

  currentPaymentFilter = { month: "", type: "" };
  renderPayments();
}


/* =====================================
   DASHBOARD
   ===================================== */

function updateDashboard() {
  const active = membersData.filter(m =>
    String(memberField(m, "status")).toLowerCase() === "active"
  );

  const electricityTotal = paymentsData
    .filter(p => paymentField(p, "type") === "Electricity")
    .reduce((sum, p) => sum + Number(paymentField(p, "amount") || 0), 0);

  const wifiTotal = paymentsData
    .filter(p => paymentField(p, "type") === "WiFi")
    .reduce((sum, p) => sum + Number(paymentField(p, "amount") || 0), 0);

  if ($("totalMembers")) {
    $("totalMembers").textContent = membersData.length;
  }

  if ($("activeMembers")) {
    $("activeMembers").textContent = active.length;
  }

  if ($("electricityCollected")) {
    $("electricityCollected").textContent = money(electricityTotal);
  }

  if ($("wifiCollected")) {
    $("wifiCollected").textContent = money(wifiTotal);
  }
}


/* =====================================
   EVENT LISTENERS
   ===================================== */

document.addEventListener("DOMContentLoaded", () => {
  $("loginForm").addEventListener("submit", handleLogin);
  $("logoutBtn").addEventListener("click", logout);

  document.querySelectorAll(".navigation button").forEach(button => {
    button.addEventListener("click", () => {
      showPanel(button.dataset.target);
    });
  });

  $("addMemberBtn").addEventListener("click", () => openMemberForm());
  $("cancelMemberBtn").addEventListener("click", closeMemberForm);
  $("memberForm").addEventListener("submit", saveMember);

  $("membersTableBody").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.id;

    if (button.dataset.action === "edit-member") {
      editMemberById(id);
    }

    if (button.dataset.action === "remove-member") {
      removeMemberById(id);
    }
  });

  $("electricityExpenseForm").addEventListener("submit", event => {
    saveExpense(event, "Electricity");
  });

  $("wifiExpenseForm").addEventListener("submit", event => {
    saveExpense(event, "WiFi");
  });

  $("electricityPaymentForm").addEventListener("submit", event => {
    savePayment(event, "Electricity");
  });

  $("wifiPaymentForm").addEventListener("submit", event => {
    savePayment(event, "WiFi");
  });

  $("filterPaymentsBtn").addEventListener("click", applyPaymentFilters);
  $("clearPaymentFiltersBtn").addEventListener("click", clearPaymentFilters);

  if (localStorage.getItem("mamunAdminLoggedIn") === "true") {
    showApp();
  } else {
    $("loginPage").classList.remove("hidden");
    $("appPage").classList.add("hidden");
  }
});
