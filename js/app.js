/* =====================================
   Celebrate – V1.02 Dashboard Logic
===================================== */

const filters = {
  search: "",
  family: "all",
  timeframe: "all",
  type: "all"
};

const EVENTS = window.EVENTS || [];

/* -----------------------
   Auth constants ✅
------------------------ */
const AUTH_KEY = "auth_ok_v1";
const SESSION_TIMEOUT = 5 * 60 * 1000;
let sessionTimer = null;

/* -----------------------
   Security ✅
------------------------ */
(function protectApp() {
  if (sessionStorage.getItem(AUTH_KEY) === "true") return;

  const input = prompt("This page is password protected.\n\nEnter password:");

  if (!input || !input.trim()) {
    document.body.innerHTML = "";
    throw new Error("Access denied");
  }

  if (input === getAppPassword()) {
    sessionStorage.setItem(AUTH_KEY, "true");
  } else {
    alert("Incorrect password");
    document.body.innerHTML = "";
    throw new Error("Wrong password");
  }
})();


function logout() {
  sessionStorage.removeItem(AUTH_KEY);
  alert("Session expired. Please login again.");
  location.reload();
}

function resetSessionTimer() {
  if (sessionTimer) clearTimeout(sessionTimer);

  sessionTimer = setTimeout(() => {
    logout();
  }, SESSION_TIMEOUT);
}


/* -----------------------
   Pagination state
------------------------ */
let upcomingPage = 0;
let pastPage = 0;

let upcomingPageSize = 5;   // ✅ default changed
let pastPageSize = 5;       // ✅ default changed

/* -----------------------
   Init
------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  populateFamilyFilter();
  bindFilters();
  renderDashboard();

  const themeBtn = document.getElementById("themeToggle");
  if (themeBtn) themeBtn.onclick = toggleTheme;

  updateLogo();
  
  
	const logoutBtn = document.getElementById("logoutBtn");
	if (logoutBtn) logoutBtn.onclick = logout;


  /* ✅ Sticky masthead shadow on scroll */
  window.addEventListener("scroll", () => {
    const header = document.querySelector(".masthead");
    if (!header) return;

    header.classList.toggle("scrolled", window.scrollY > 8);
  });
});

["click", "mousemove", "keydown", "scroll", "touchstart"].forEach(event => {
  document.addEventListener(event, resetSessionTimer, true);
});

// Start timer immediately
resetSessionTimer();

/* -----------------------
   Filters
------------------------ */
function bindFilters() {
  searchInput.oninput = e => {
    filters.search = e.target.value.toLowerCase();
    resetPagination();
    renderDashboard();
  };

  familyFilter.onchange = e => {
    filters.family = e.target.value;
    resetPagination();
    renderDashboard();
  };

  timeFilter.onchange = e => {
    filters.timeframe = e.target.value;
    resetPagination();
    renderDashboard();
  };
  
	const typeFilter = document.getElementById("typeFilter");

	if (typeFilter) {
	  typeFilter.onchange = e => {
		filters.type = e.target.value;
		resetPagination();
		renderDashboard();
	  };
	}

}

function populateFamilyFilter() {
  const map = new Map();

  EVENTS.forEach(e => {
    if (!e.family || !e.familyHead) return;

    // Use e.family as the FILTER VALUE (canonical)
    if (!map.has(e.family)) {
      map.set(e.family, {
        value: e.family,                  // ✅ used for filtering
        label: getFamilyLabel(e.familyHead) // ✅ shown in dropdown
      });
    }
  });

  const sorted = Array.from(map.values())
    .sort((a, b) => a.label.localeCompare(b.label));

  familyFilter.innerHTML =
    `<option value="all">All families</option>` +
    sorted
      .map(f => `<option value="${f.value}">${f.label}</option>`)
      .join("");
}


/* -----------------------
   Dashboard rendering
------------------------ */


function resetPagination() {
  upcomingPage = 0;
  pastPage = 0;
}

function shouldShow(section) {
  return (
    filters.timeframe === "all" ||
    filters.timeframe === section
  );
}

function renderDashboard() {
  // ---------------------------------
  // 1. Apply base filters
  // ---------------------------------
  let events = EVENTS.filter(e =>
    (!filters.search || getSearchText(e).includes(filters.search)) &&
    (filters.family === "all" || e.family === filters.family) &&
    (filters.type === "all" || e.type === filters.type)
  );

  // ✅ Exclude placeholder dates from timeline
  events = events.filter(e => e.date !== "2000-01-01");

  // ---------------------------------
  // 2. Categorize events
  // ---------------------------------
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const priority = [];
  const upcoming = [];
  const past = [];

  events.forEach(e => {
    const d = new Date(e.date);
    const currentYearDate = new Date(
      today.getFullYear(),
      d.getMonth(),
      d.getDate()
    );

    if (currentYearDate >= today && d.getMonth() === today.getMonth()) {
      priority.push(e);
    } else if (currentYearDate > today) {
      upcoming.push(e);
    } else {
      past.push(e);
    }
  });

  // ✅ Sort by urgency
  priority.sort((a, b) => getDaysInfo(a).days - getDaysInfo(b).days);
  upcoming.sort((a, b) => getDaysInfo(a).days - getDaysInfo(b).days);
  past.sort((a, b) => getDaysInfo(a).days - getDaysInfo(b).days);

  // ---------------------------------
  // 3. Cache section elements
  // ---------------------------------
  const prioritySection = document.getElementById("prioritySection");
  const upcomingSection = document.getElementById("upcomingSection");
  const pastSection = document.getElementById("pastSection");

  // ---------------------------------
  // 4. Timeframe‑aware rendering
  // ---------------------------------

  // ✅ PRIORITY
  if (filters.timeframe === "all" || filters.timeframe === "priority") {
    if (prioritySection) prioritySection.style.display = "block";
    renderPriority(priority);
    priorityCount.textContent = priority.length;
  } else {
    if (prioritySection) prioritySection.style.display = "none";
  }

  // ✅ UPCOMING
  if (filters.timeframe === "all" || filters.timeframe === "upcoming") {
    if (upcomingSection) upcomingSection.style.display = "block";
    renderList(upcomingList, upcoming, "upcoming");
    upcomingCount.textContent = upcoming.length;
  } else {
    if (upcomingSection) upcomingSection.style.display = "none";
  }

  // ✅ PAST
  if (filters.timeframe === "all" || filters.timeframe === "past") {
    if (pastSection) pastSection.style.display = "block";
    renderList(pastList, past, "past");
    pastCount.textContent = past.length;
  } else {
    if (pastSection) pastSection.style.display = "none";
  }

  // ---------------------------------
  // 5. Missing data is always evaluated
  // ---------------------------------
  renderMissingData();
}
/* -----------------------
   For missing date info
------------------------ */

function renderMissingData() {
  const container = document.getElementById("missingDataTable");
  const section = document.getElementById("missingDataSection");

  container.innerHTML = "";

  // Structure:
  // {
  //   "Ravi Dikshit": { birthdays: [], anniversaries: [] }
  // }
  const map = {};

  EVENTS.forEach(e => {
    // ✅ Only treat EXACT placeholder as missing
    if (e.date !== "2000-01-01") return;

    const familyHead = e.familyHead || "Unknown Family";

    if (!map[familyHead]) {
      map[familyHead] = {
        birthdays: [],
        anniversaries: []
      };
    }

    if (e.type === "birthday") {
      map[familyHead].birthdays.push(e.name);
    }

    if (e.type === "anniversary") {
      map[familyHead].anniversaries.push(e.name);
    }
  });

  const familyHeads = Object.keys(map);

  if (!familyHeads.length) {
    section.style.display = "none";
    return;
  }

  familyHeads.forEach(head => {
    const bdays = map[head].birthdays;
    const annivs = map[head].anniversaries;

    container.innerHTML += `
      <div class="missing-family">
        <h4>${head}</h4>

        ${
          bdays.length
            ? `
          <div class="missing-group">
            <strong>🎂 Missing Birthdays (${bdays.length})</strong>
            <ul>
              ${bdays.map(n => `<li>${n}</li>`).join("")}
            </ul>
          </div>
        `
            : ""
        }

        ${
          annivs.length
            ? `
          <div class="missing-group">
            <strong>💍 Missing Anniversaries (${annivs.length})</strong>
            <ul>
              ${annivs.map(n => `<li>${n}</li>`).join("")}
            </ul>
          </div>
        `
            : ""
        }
      </div>
    `;
  });

  section.style.display = "block";
}

/* -----------------------
   Priority cards
------------------------ */
function renderPriority(list) {
  if (!list.length) {
    priorityList.innerHTML =
      '<div class="empty-state">🎉 No celebrations this month</div>';
    return;
  }

  priorityList.innerHTML = list.map(e => {
    const info = getDaysInfo(e);
    return `
      <div class="priority-card ${e.type}">
        <div class="top">
          <div>
            <strong>${e.name}</strong><br>
            <small>${e.type}</small>
          </div>
          <div>${e.type === "birthday" ? "🎂" : "💍"}</div>
        </div>
        <div class="bottom">
          ${formatDate(e.date)}
          <span class="days-badge">
            ${
              info.days === 0
                ? "Today 🎉"
                : info.isPast
                ? `${info.days} days ago`
                : `In ${info.days} days`
            }
          </span>
        </div>
      </div>
    `;
  }).join("");
}

/* -----------------------------
        Helper functions
-------------------------------*/

function normalizeRelation(relation) {
  if (!relation) return "Member";

  const r = relation.toLowerCase();

  if (r === "son") return "Kid‑Son";
  if (r === "daughter") return "Kid‑Daughter";
  if (r === "wife") return "Wife";
  if (r === "husband") return "Husband";

  return relation; // fallback
}

function getFamilyContext(e) {
  if (!e.familyHead) return "";
  return `of ${e.familyHead}`;
}


/* -----------------------
   Upcoming / Past list
------------------------ */

function renderList(container, list, type) {
  if (!container) return;

  /* --------------------
     Empty state
  -------------------- */
  if (!list || list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ${type === "upcoming" ? "⏳ No upcoming events" : "📁 No past events"}
      </div>
    `;
    return;
  }

  /* --------------------
     Pagination state
  -------------------- */
  const page = type === "upcoming" ? upcomingPage : pastPage;
  const pageSize = type === "upcoming" ? upcomingPageSize : pastPageSize;

  const totalPages = Math.ceil(list.length / pageSize);
  const start = page * pageSize;
  const end = start + pageSize;

  const slice = list.slice(start, end);

  /* --------------------
     Render rows
  -------------------- */
  container.innerHTML = slice.map(e => {
    const info = getDaysInfo(e);

    const timeText =
      info.days === 0
        ? "Today 🎉"
        : info.isPast
        ? `${info.days} days ago`
        : `In ${info.days} days`;

    let metaText = "";

    /* ✅ Birthday logic */
    if (e.type === "birthday") {
      if (e.relation === "Son" || e.relation === "Daughter") {
        metaText = `🎂 Birthday – ${e.relation} of ${e.familyHead} · ${timeText}`;
      }
      else if (e.relation === "Wife") {
        metaText = `🎂 Birthday – Wife of ${e.familyHead} · ${timeText}`;
      }
      else {
        // Husband (family head)
        metaText = `🎂 Birthday · ${timeText}`;
      }
    }

    /* ✅ Anniversary logic (NO relation text) */
    if (e.type === "anniversary") {
      metaText = `💍 Anniversary · ${timeText}`;
    }

    return `
      <div class="list-row">
        <div class="strip ${e.type}"></div>

        <div class="row-date">
          ${formatDate(e.date)}
        </div>

        <div class="row-details">
          <div class="row-name">
            ${e.name}
          </div>
          <div class="row-meta">
            ${metaText}
          </div>
        </div>
      </div>
    `;
  }).join("");

  /* --------------------
     Pagination footer
  -------------------- */
  container.innerHTML += `
    <div class="pagination">
      <span class="page-info">
        ${page + 1} of ${totalPages}
      </span>

      <div class="page-controls">
        <button
          ${page === 0 ? "disabled" : ""}
          onclick="changePage('${type}', -1)">
          Back
        </button>

        <button
          ${page + 1 === totalPages ? "disabled" : ""}
          onclick="changePage('${type}', 1)">
          Next
        </button>
      </div>

      <label class="page-size">
        Show
        <select onchange="changePageSize('${type}', this.value)">
          <option value="5" ${pageSize === 5 ? "selected" : ""}>5</option>
          <option value="10" ${pageSize === 10 ? "selected" : ""}>10</option>
        </select>
        names
      </label>
    </div>
  `;
}

/* -----------------------
   Pagination handlers
------------------------ */
function changePage(type, delta) {
  if (type === "upcoming") {
    upcomingPage += delta;
  } else {
    pastPage += delta;
  }
  renderDashboard();
}

function changePageSize(type, value) {
  const size = Number(value);

  if (type === "upcoming") {
    upcomingPageSize = size;
    upcomingPage = 0;
  } else {
    pastPageSize = size;
    pastPage = 0;
  }
  renderDashboard();
}

/* -----------------------
   Section collapse
------------------------ */
function toggleSection(type) {
  const section = document.getElementById(type + "Section");
  const textEl = document.getElementById(type + "ToggleText");
  const iconEl = document.getElementById(type + "ToggleIcon");

  if (!section || !textEl || !iconEl) return;

  const isCollapsed = section.classList.contains("collapsed");

  section.classList.toggle("collapsed", !isCollapsed);
  textEl.textContent = isCollapsed ? "Hide" : "Show";

  iconEl.src = isCollapsed
    ? "images/Up_arrow_Icon.png"
    : "images/Down_arrow_Icon.png";
}

/* -----------------------
   Utilities
------------------------ */
function getDaysInfo(e) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = new Date(e.date);
  const target = new Date(today.getFullYear(), d.getMonth(), d.getDate());

  const isPast = target < today;
  const days = Math.abs(Math.floor((target - today) / 86400000));

  return { days, isPast };
}

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short"
  });
}

function getSearchText(e) {
  const date = new Date(e.date);

  const day = date.getDate().toString();
  const monthShort = date.toLocaleString("en", { month: "short" }).toLowerCase(); // aug
  const monthLong = date.toLocaleString("en", { month: "long" }).toLowerCase();   // august
  const monthNum = (date.getMonth() + 1).toString();                              // 8

  return [
    e.name,
    e.relation,
    day,
    monthShort,
    monthLong,
    monthNum
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
/* -----------------------
   Theme
------------------------ */
function toggleTheme() {
  const isDark = document.body.dataset.theme === "dark";
  document.body.dataset.theme = isDark ? "light" : "dark";

  const icon = document.querySelector(".theme-icon");
  if (icon) {
    icon.textContent = isDark ? "🌙" : "🌞";
  }

  updateLogo();
}

function updateLogo() {
  const logo = document.getElementById("brandLogo");
  if (!logo) return;

  const isDark = document.body.dataset.theme === "dark";
  logo.src = isDark
    ? "images/logo_Dark_big 1.png"
    : "images/logo_big 1.png";
}

/* -----------------------
   JS FOR MISSING Details
------------------------ */

function getAppPassword() {
  return "family@2026";
}


function getPasswordHash() {
  // SHA‑256 hash of "family@2026"
  return "a3c30c748c13e7e904fcc9a9b73fa8f0f5e2efefa6b193d4d3a5a44bf7adad31";
}


function openMissingModal() {
  const birthdayList = document.getElementById("missingBirthdays");
  const anniversaryList = document.getElementById("missingAnniversaries");

  birthdayList.innerHTML = "";
  anniversaryList.innerHTML = "";

  EVENTS.forEach(e => {
    const d = new Date(e.date);

    if (d.getFullYear() === 2000) {
      if (e.type === "birthday") {
        birthdayList.innerHTML += `<li>${e.name}</li>`;
      }
      if (e.type === "anniversary") {
        anniversaryList.innerHTML += `<li>${e.name}</li>`;
      }
    }
  });

  document.getElementById("missingModal").style.display = "flex";
}

function closeMissingModal() {
  document.getElementById("missingModal").style.display = "none";
}


function getFamilyLabel(familyHead) {
  if (!familyHead) return "";

  // Explicit friendly labels
  if (familyHead.includes("Hardeep")) return "Bhaiya";
  if (familyHead.includes("Ashish")) return "Ashish";

  // Default: use first name
  return familyHead.split(" ")[0];
}

