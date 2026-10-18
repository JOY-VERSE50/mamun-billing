// ================================
// MAMUN CHATRABASH APP
// ================================

// তোমার Google Apps Script Web App URL এখানে বসাবে
const API_URL = "https://script.google.com/macros/s/AKfycbzfpXGH-HUpwS6W-oxdqQx4V1TW_m7gSb3sE4lV4ebHGA3fIu7gnCecg-d9BUEzTZVSFA/exec";


// ================================
// ADMIN LOGIN
// ================================

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "12345678";

function login() {

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  const error = document.getElementById("loginError");

  if (
    username === ADMIN_USERNAME &&
    password === ADMIN_PASSWORD
  ) {

    localStorage.setItem("mamunAdminLoggedIn", "true");

    showApp();

  } else {

    error.textContent = "Invalid username or password.";

  }
}


function logout() {

  localStorage.removeItem("mamunAdminLoggedIn");

  document.getElementById("app").classList.add("hidden");
  document.getElementById("loginPage").classList.remove("hidden");

  document.getElementById("username").value = "";
  document.getElementById("password").value = "";

}


function showApp() {

  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  loadMembers();

}


function checkLogin() {

  const loggedIn =
    localStorage.getItem("mamunAdminLoggedIn");

  if (loggedIn === "true") {
    showApp();
  }

}


// ================================
// MEMBER FORM
// ================================

function openMemberForm() {

  document.getElementById("memberForm")
    .classList.remove("hidden");

  document.getElementById("formTitle")
    .textContent = "Add Member";

  clearMemberForm();

}


function closeMemberForm() {

  document.getElementById("memberForm")
    .classList.add("hidden");

  clearMemberForm();

}


function clearMemberForm() {

  document.getElementById("memberId").value = "";
  document.getElementById("memberName").value = "";
  document.getElementById("memberRoom").value = "";
  document.getElementById("memberPhone").value = "";
  document.getElementById("memberJoinDate").value = "";
  document.getElementById("memberStatus").value = "Active";

}


// ================================
// SAVE MEMBER
// ================================

async function saveMember() {

  const id =
    document.getElementById("memberId").value;

  const name =
    document.getElementById("memberName").value.trim();

  const room =
    document.getElementById("memberRoom").value.trim();

  const phone =
    document.getElementById("memberPhone").value.trim();

  const joinDate =
    document.getElementById("memberJoinDate").value;

  const status =
    document.getElementById("memberStatus").value;


  if (!name) {
    alert("Member name is required.");
    return;
  }


  const data = {
    name: name,
    room: room,
    phone: phone,
    joinDate: joinDate,
    status: status
  };


  try {

    let url = API_URL;

    if (id) {

      url +=
        "?action=editMember" +
        "&id=" + encodeURIComponent(id) +
        "&data=" + encodeURIComponent(
          JSON.stringify(data)
        );

    } else {

      url +=
        "?action=addMember" +
        "&data=" + encodeURIComponent(
          JSON.stringify(data)
        );

    }


    const response = await fetch(url);

    const result = await response.json();


    if (result.success) {

      alert(result.message);

      closeMemberForm();

      loadMembers();

    } else {

      alert(result.message || "Something went wrong.");

    }

  } catch (error) {

    console.error(error);

    alert(
      "Could not connect to Google Apps Script."
    );

  }

}


// ================================
// LOAD MEMBERS
// ================================

async function loadMembers() {

  try {

    const url =
      API_URL + "?action=getMembers";

    const response =
      await fetch(url);

    const members =
      await response.json();


    renderMembers(members);

    updateDashboard(members);

  } catch (error) {

    console.error(error);

    document.getElementById("memberTable").innerHTML = `
      <tr>
        <td colspan="6">
          Could not load members.
        </td>
      </tr>
    `;

  }

}


// ================================
// RENDER MEMBERS
// ================================

function renderMembers(members) {

  const table =
    document.getElementById("memberTable");


  if (!members || members.length === 0) {

    table.innerHTML = `
      <tr>
        <td colspan="6">
          No members found.
        </td>
      </tr>
    `;

    return;
  }


  table.innerHTML = "";


  members.forEach((member, index) => {

    const row =
      document.createElement("tr");


    row.innerHTML = `

      <td>${index + 1}</td>

      <td>${escapeHTML(member.Name || "")}</td>

      <td>${escapeHTML(member.Room || "")}</td>

      <td>${escapeHTML(member.Phone || "")}</td>

      <td>${escapeHTML(member.Status || "")}</td>

      <td>

        <button
          class="action-btn edit-btn"
          onclick='editMember(${JSON.stringify(member)})'
        >
          Edit
        </button>

        <button
          class="action-btn remove-btn"
          onclick="removeMember('${member.ID}')"
        >
          Remove
        </button>

      </td>

    `;


    table.appendChild(row);

  });

}


// ================================
// EDIT MEMBER
// ================================

function editMember(member) {

  document.getElementById("memberForm")
    .classList.remove("hidden");

  document.getElementById("formTitle")
    .textContent = "Edit Member";


  document.getElementById("memberId").value =
    member.ID || "";

  document.getElementById("memberName").value =
    member.Name || "";

  document.getElementById("memberRoom").value =
    member.Room || "";

  document.getElementById("memberPhone").value =
    member.Phone || "";

  document.getElementById("memberJoinDate").value =
    formatDateForInput(member["Join Date"]);

  document.getElementById("memberStatus").value =
    member.Status || "Active";

}


// ================================
// REMOVE MEMBER
// ================================

async function removeMember(id) {

  if (!confirm("Are you sure you want to remove this member?")) {
    return;
  }


  try {

    const url =
      API_URL +
      "?action=removeMember&id=" +
      encodeURIComponent(id);


    const response =
      await fetch(url);

    const result =
      await response.json();


    if (result.success) {

      alert(result.message);

      loadMembers();

    } else {

      alert(result.message);

    }

  } catch (error) {

    console.error(error);

    alert("Could not connect to server.");

  }

}


// ================================
// DASHBOARD
// ================================

function updateDashboard(members) {

  const total =
    members.length;

  const active =
    members.filter(
      member => member.Status === "Active"
    ).length;


  document.getElementById("totalMembers")
    .textContent = total;

  document.getElementById("activeMembers")
    .textContent = active;

}


// ================================
// HELPERS
// ================================

function formatDateForInput(dateValue) {

  if (!dateValue) {
    return "";
  }

  const date =
    new Date(dateValue);

  if (isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];

}


function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ================================
// START APP
// ================================

document.addEventListener(
  "DOMContentLoaded",
  checkLogin
);
