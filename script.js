const diagnosticQuestions = [
  {
    title: "QUESTION 1 OF 5",
    question: "What is the most critical workforce outcome your organisation needs to achieve in the next 90 days?",
    sub: "This anchors the entire curation to a named outcome, not a training preference.",
    options: [
      { title: "A professionally credentialled DSP workforce", note: "Routes to DSP certification track" },
      { title: "Reduced DSP turnover and improved retention", note: "Routes to foundation or certification programs" },
      { title: "Compliance readiness for audit or state survey", note: "Routes to compliance and documentation program" },
      { title: "A trauma-informed standard of care across the organisation", note: "Routes to trauma-informed program" },
      { title: "A credentialled case management team", note: "Routes to IDD Case Management Professional Program" }
    ]
  },
  {
    title: "QUESTION 2 OF 5",
    question: "Which population carries the highest risk exposure if undertrained right now?",
    sub: "Risk-based framing surfaces coaching need - high clinical risk requires coached skill development, not content access alone.",
    options: [
      { title: "DSPs supporting individuals with complex behavioural or health needs", note: "Adds health, trauma, and medication modules - coaching recommended" },
      { title: "Support coordinators managing high-complexity caseloads", note: "Adds SC trauma and mandatory reporting - self-paced viable" },
      { title: "New hires entering direct care without prior IDD experience", note: "Adds foundations and communication modules - coaching recommended" },
      { title: "All staff - systemic gaps across the full workforce", note: "Routes to mixed workforce program - coaching essential" }
    ]
  },
  {
    title: "QUESTION 3 OF 5",
    question: "Where does your organisation have the most significant evidence-based practice gap?",
    sub: "This determines whether Dr. Harvey's program is the centrepiece or a supporting module - and whether coaching is essential or optional.",
    options: [
      { title: "Trauma-informed support - no consistent clinical framework", note: "Dr. Harvey's program is central - coaching essential" },
      { title: "Health and safety monitoring - staff miss early warning signs", note: "Fatal Five, health, and medication modules - coaching recommended" },
      { title: "Documentation and compliance - audit exposure or note quality", note: "Documentation and HCBS compliance module - self-paced viable" },
      { title: "Person-centred practice - staff default to task completion", note: "Foundations and communication modules - coaching recommended" }
    ]
  },
  {
    title: "QUESTION 4 OF 5",
    question: "What must your organisation demonstrate to funders, surveyors, or families by the end of the program?",
    sub: "Accountability framing determines the credential and delivery format. Demonstrable practice change requires coached application with evidence.",
    options: [
      { title: "That our DSPs hold a nationally recognised professional credential", note: "Confirms NADSP-aligned certification, formal credential" },
      { title: "That our staff have completed verified regulatory training", note: "Confirms compliance module emphasis, audit documentation export" },
      { title: "That our organisation operates to a trauma-informed standard", note: "Dr. Harvey program central - coaching essential to prove practice change" },
      { title: "That our case management team meets professional competency standards", note: "Confirms IDD-CMP credential for SC track" }
    ]
  },
  {
    title: "QUESTION 5 OF 5",
    question: "If one thing changed in how your workforce supports the individuals in your care, what would have the greatest impact on their quality of life?",
    sub: "This confirms the outcome and determines how coaching is framed - as professional accountability or as clinical quality assurance.",
    options: [
      { title: "Staff would understand and respond to trauma rather than misreading it as behaviour", note: "Confirms: Trauma-Informed program - coaching essential - Dr. Harvey anchored" },
      { title: "Staff would catch health changes earlier and escalate before they become emergencies", note: "Confirms: Health and Safety emphasis - coaching recommended" },
      { title: "Staff would support real choice and self-determination, not just plan compliance", note: "Confirms: Person-centred foundation - coaching recommended for practice change" },
      { title: "Staff would document in a way that reflects the person, not the task completed", note: "Confirms: Documentation emphasis - self-paced viable with live documentation review" }
    ]
  }
];

let currentQ = 0;
let answers = [];
let roiSaveTimeout;

const supabaseUrl = "https://dfdndaexxvztzndsmapk.supabase.co";
const supabasePublishableKey = "sb_publishable_WzdFk3H7PHYKLvxItQQNRw_WfYKjJcR";
const siteSessionId = (() => {
  const existing = localStorage.getItem("vantageidd_session_id");
  if (existing) return existing;
  const created = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem("vantageidd_session_id", created);
  return created;
})();

function setStatus(id, message, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.classList.remove("success", "error");
  if (type) el.classList.add(type);
}

async function insertIntoSupabase(table, payload) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`,
      Prefer: "return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Supabase insert failed for ${table}`);
  }
}

const outcomes = {
  trauma: {
    name: "Trauma-Informed IDD Organization Program",
    text: "Your answers indicate a clinical quality gap in trauma-informed practice, the most common gap in IDD provider organisations and the one with the highest impact on individual outcomes. Dr. Harvey's framework is the centrepiece of this program.",
    modules: ["M1 IDD Foundations", "M5 Dr. Harvey Trauma", "M3 Health + Safety", "SC Module A"],
    note: "Coaching is essential for this outcome. Trauma-informed practice is a behavioural and relational change - content alone produces awareness, coaching produces transformation. WICS coaching is included in the program recommendation."
  },
  compliance: {
    name: "IDD Compliance and Documentation Program",
    text: "Your answers indicate a compliance and documentation risk that requires an audit-ready training pathway focused on HCBS standards, reporting, and note quality.",
    modules: ["M6 Documentation", "SC Module B PCP Goals", "SC Module D Reporting", "M3 Health/Safety"],
    note: "Self-paced sufficient for this outcome - compliance is process-based, not relational."
  },
  workforce: {
    name: "IDD Workforce Foundation Program",
    text: "Your answers indicate a workforce development need focused on onboarding, professional identity, and retention across new or high-turnover DSP cohorts.",
    modules: ["M1 Foundations", "M2 Communication", "M3 Health/Safety", "M7 Professional Identity"],
    note: "Coaching recommended to support retention and professional identity formation."
  },
  mixed: {
    name: "IDD Mixed Workforce Professional Program",
    text: "Your answers indicate a mixed workforce need spanning DSPs and support coordinators, requiring a unified pathway with role-specific modules.",
    modules: ["M1 Foundations", "M3 Health/Safety", "Dr. Harvey M5", "M6 Documentation", "SC Module A", "SC Module D"],
    note: "DSP track includes coaching; SC track runs in parallel self-paced."
  }
};

function pickOutcome() {
  const allText = answers.join(" ").toLowerCase();
  if (allText.includes("trauma")) return outcomes.trauma;
  if (allText.includes("compliance") || allText.includes("audit") || allText.includes("documentation")) return outcomes.compliance;
  if (allText.includes("all staff")) return outcomes.mixed;
  return outcomes.workforce;
}

function renderProgress() {
  return `<div class="diag-progress">${diagnosticQuestions
    .map((_, i) => `<span class="diag-dot ${i <= currentQ ? "active" : ""}"></span>`)
    .join("")}</div>`;
}

function showQuestion(n) {
  const root = document.getElementById("diagnostic-root");
  if (!root) return;
  const q = diagnosticQuestions[n];
  const selected = answers[n];
  root.innerHTML = `
    <p class="diag-top-label">FIND YOUR PROGRAM</p>
    <h3 class="diag-title">What outcome does your organisation need?</h3>
    <p class="diag-copy">Answer five questions about your workforce and we will identify the training program that fits your specific need, including whether coaching is essential, recommended, or not required.</p>
    <p class="diag-question-label">${q.title}</p>
    <h4 class="diag-main-question">${q.question}</h4>
    <p class="diag-sub">${q.sub}</p>
    <div class="diag-options">
      ${q.options
        .map(
          (option) => `
        <button class="diag-option ${selected === option.title ? "selected" : ""}" data-value="${option.title}">
          <strong>${option.title}</strong>
          <span>${option.note}</span>
        </button>`
        )
        .join("")}
    </div>
    <div class="diag-bottom">
      ${renderProgress()}
      <div class="diag-buttons">
        ${n > 0 ? `<button class="diag-btn secondary" id="diag-back">Back</button>` : ""}
        <button class="diag-btn primary" id="diag-next" ${selected ? "" : "disabled"}>${n === diagnosticQuestions.length - 1 ? "See my program" : "Continue"}</button>
      </div>
    </div>
  `;

  root.querySelectorAll(".diag-option").forEach((button) => {
    button.addEventListener("click", () => {
      answers[n] = button.getAttribute("data-value");
      showQuestion(n);
    });
  });

  const next = document.getElementById("diag-next");
  if (next) {
    next.addEventListener("click", () => {
      if (currentQ === diagnosticQuestions.length - 1) {
        showOutcome();
      } else {
        currentQ += 1;
        showQuestion(currentQ);
      }
    });
  }

  const back = document.getElementById("diag-back");
  if (back) {
    back.addEventListener("click", () => {
      currentQ -= 1;
      showQuestion(currentQ);
    });
  }
}

function showOutcome() {
  const root = document.getElementById("diagnostic-root");
  if (!root) return;
  const outcome = pickOutcome();
  const outcomeName = outcome.name;
  window.recommendedProgramName = outcomeName;
  storeDiagnosticResult(outcome);
  root.innerHTML = `
    <div class="outcome-card">
      <p class="diag-top-label">YOUR RECOMMENDED PROGRAM</p>
      <h4>${outcome.name}</h4>
      <p>${outcome.text}</p>
      <div class="module-pills" style="margin:12px 0 10px;">
        ${outcome.modules.map((m) => `<span>${m}</span>`).join("")}
      </div>
      <p>${outcome.note}</p>
      <div class="outcome-actions">
        <button type="button" class="btn btn-primary" onclick="talkAboutProgram()">Talk to us about this program</button>
        <a class="text-link" href="#" id="start-over">Start over</a>
      </div>
    </div>
  `;

  const reset = document.getElementById("start-over");
  if (reset) {
    reset.addEventListener("click", (e) => {
      e.preventDefault();
      currentQ = 0;
      answers = [];
      showQuestion(0);
    });
  }
}

function talkAboutProgram() {
  document.getElementById("contact").scrollIntoView({behavior:'smooth'});
  setTimeout(() => {
    const select = document.getElementById("program-select") ||
                   document.querySelector('select[name="program_interest"]');
    if (select && window.recommendedProgramName) {
      const name = window.recommendedProgramName.toLowerCase();
      const opts = [...select.options];
      const match = opts.find(o =>
        name.includes('foundation') && o.value === 'foundation' ||
        name.includes('trauma') && o.value === 'trauma' ||
        name.includes('compliance') && o.value === 'compliance' ||
        name.includes('mixed') && o.value === 'mixed' ||
        name.includes('diagnostic') && o.value === 'alacarte'
      );
      if (match) {
        match.selected = true;
        select.dispatchEvent(new Event('change'));
      }
    }
    const existing = document.getElementById('diagnostic-note');
    if (!existing && window.recommendedProgramName) {
      const form = document.querySelector('#contact form, .contact-form');
      if (form) {
        const note = document.createElement('div');
        note.id = 'diagnostic-note';
        note.style.cssText = 'background:rgba(200,121,65,0.1);border:1px solid rgba(200,121,65,0.3);border-radius:10px;padding:12px 16px;margin-bottom:1.25rem;font-family:Inter,sans-serif;font-size:13px;color:#C87941;';
        note.textContent = 'Based on your diagnostic - "' + window.recommendedProgramName + '" has been pre-selected.';
        form.insertBefore(note, form.firstChild);
      }
    }
  }, 800);
}

async function storeDiagnosticResult(outcome) {
  try {
    await insertIntoSupabase("diagnostic_results", {
      session_id: siteSessionId,
      answers,
      outcome_name: outcome.name,
      outcome_text: outcome.text,
      outcome_note: outcome.note,
      modules: outcome.modules,
      source_page: window.location.pathname || "/"
    });
  } catch (error) {
    console.error("Diagnostic save failed:", error);
  }
}

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelector(a.getAttribute("href"))?.scrollIntoView({ behavior: "smooth" });
  });
});

window.addEventListener("scroll", () => {
  document.querySelector(".site-header")?.classList.toggle("scrolled", window.scrollY > 50);
});

document.querySelector(".hamburger")?.addEventListener("click", () => {
  document.querySelector(".nav-menu")?.classList.toggle("open");
});

function updateSliderFill(slider) {
  const min = Number(slider.min || 0);
  const max = Number(slider.max || 100);
  const val = Number(slider.value);
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(to right, var(--orange) ${pct}%, var(--bg-border-dark) ${pct}%)`;
}

function bump(el) {
  if (!el) return;
  el.style.transform = "scale(1.03)";
  el.style.opacity = "0.9";
  requestAnimationFrame(() => {
    setTimeout(() => {
      el.style.transform = "scale(1)";
      el.style.opacity = "1";
    }, 80);
  });
}

function updateROI() {
  const dsps = parseInt(document.getElementById("dsps").value, 10);
  const rate = parseInt(document.getElementById("rate").value, 10);
  const exits = Math.round((dsps * rate) / 100);
  const cost = exits * 5000;
  const saving = Math.round(cost * 0.1);
  const ratio = Math.round(cost / 15000);

  const ids = {
    exits: exits,
    cost: `$${cost.toLocaleString()}`,
    saving: `$${saving.toLocaleString()}`,
    ratio: `${ratio}×+`,
    "dsps-val": dsps,
    "rate-val": `${rate}%`
  };

  Object.entries(ids).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el && el.textContent !== String(value)) {
      el.textContent = String(value);
      bump(el);
    }
  });

  updateSliderFill(document.getElementById("dsps"));
  updateSliderFill(document.getElementById("rate"));
  queueROISave({ dsps, rate, exits, cost, saving, ratio });
}

function queueROISave(roiState) {
  clearTimeout(roiSaveTimeout);
  roiSaveTimeout = setTimeout(() => {
    storeROIResult(roiState);
  }, 900);
}

async function storeROIResult(roiState) {
  try {
    await insertIntoSupabase("roi_calculator_sessions", {
      dsp_count: roiState.dsps,
      turnover_rate_pct: roiState.rate,
      calculated_exits: roiState.exits,
      calculated_cost_usd: roiState.cost,
      calculated_saving_usd: roiState.saving,
      calculated_ratio: roiState.ratio
    });
  } catch (error) {
    console.error("ROI save failed:", error);
  }
}

document.getElementById("dsps")?.addEventListener("input", updateROI);
document.getElementById("rate")?.addEventListener("input", updateROI);

async function submitContactForm(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const errMsg = document.getElementById("form-error");
  if (errMsg) {
    errMsg.textContent = "";
    errMsg.style.display = "none";
  }
  btn.textContent = "Sending...";
  btn.disabled = true;

  const data = {
    first_name: form.querySelector('[name="First name"]').value,
    last_name: form.querySelector('[name="Last name"]').value,
    title: form.querySelector('[name="Your title"]').value,
    org: form.querySelector('[name="Organisation"]').value,
    email: form.querySelector('[name="Email"]').value,
    program: (form.querySelector('[name="program_interest"]') || form.querySelector('[name="Program"]'))?.value || "",
    count: form.querySelector('[name="Number of DSPs or SCs to train"]').value
  };

  const supabasePromise = insertIntoSupabase("contact_submissions", {
    first_name: data.first_name,
    last_name: data.last_name,
    title: data.title,
    organisation: data.org,
    email: data.email,
    program_interest: data.program,
    dsp_sc_count: data.count
  });

  const isLocal = window.location.hostname === "127.0.0.1"
               || window.location.hostname === "localhost";

  const mailtrapPromise = !isLocal
    ? fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: { email: "noreply@hello-itsme.com", name: "VantageIDD" },
          to: [{ email: "help@hello-itsme.com" }],
          subject: `New VantageIDD enquiry - ${data.org}`,
          html: `<!DOCTYPE html>
<html>
<body style="font-family: Inter, sans-serif; color: #1A2330; 
             max-width: 600px; margin: 0 auto; padding: 32px;">

  <div style="background: #162230; padding: 24px; border-radius: 12px; 
              margin-bottom: 24px;">
    <h1 style="color: white; font-size: 20px; margin: 0;">
      New VantageIDD Enquiry
    </h1>
    <p style="color: #B8C8D8; font-size: 14px; margin: 6px 0 0;">
      Submitted via vantage idd website
    </p>
  </div>

  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <tr style="border-bottom: 1px solid #F0EAE0;">
      <td style="padding: 12px 0; color: #7A8A96; width: 40%;">Name</td>
      <td style="padding: 12px 0; font-weight: 600;">
        ${data.first_name} ${data.last_name}
      </td>
    </tr>
    <tr style="border-bottom: 1px solid #F0EAE0;">
      <td style="padding: 12px 0; color: #7A8A96;">Title</td>
      <td style="padding: 12px 0;">${data.title}</td>
    </tr>
    <tr style="border-bottom: 1px solid #F0EAE0;">
      <td style="padding: 12px 0; color: #7A8A96;">Organisation</td>
      <td style="padding: 12px 0; font-weight: 600;">${data.org}</td>
    </tr>
    <tr style="border-bottom: 1px solid #F0EAE0;">
      <td style="padding: 12px 0; color: #7A8A96;">Email</td>
      <td style="padding: 12px 0;">
        <a href="mailto:${data.email}" 
           style="color: #C87941;">${data.email}</a>
      </td>
    </tr>
    <tr style="border-bottom: 1px solid #F0EAE0;">
      <td style="padding: 12px 0; color: #7A8A96;">Program interest</td>
      <td style="padding: 12px 0;">${data.program}</td>
    </tr>
    <tr>
      <td style="padding: 12px 0; color: #7A8A96;">DSP / SC count</td>
      <td style="padding: 12px 0;">${data.count}</td>
    </tr>
  </table>

  <div style="margin-top: 32px; padding: 16px; background: #FBF0E4; 
              border-radius: 10px; border-left: 4px solid #C87941;">
    <p style="margin: 0; font-size: 13px; color: #5A6A7A;">
      Reply directly to 
      <a href="mailto:${data.email}" style="color: #C87941;">
        ${data.email}
      </a> 
      to respond to this enquiry.
    </p>
  </div>

  <p style="margin-top: 24px; font-size: 12px; color: #B8C8D8; 
            text-align: center;">
    VantageIDD · Powered by Focus EduSolutions · hello-itsme.com
  </p>

</body>
</html>`
        })
      }).then((res) => {
        if (!res.ok) {
          throw new Error("Mailtrap send failed");
        }
        return res;
      })
    : Promise.resolve(
        console.log("Local environment - skipping Mailtrap, would have sent email to help@hello-itsme.com")
      );

  const results = await Promise.allSettled([
    supabasePromise,
    mailtrapPromise
  ]);

  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Contact submission side-effect failed:", result.reason);
    }
  });

  try {
    form.innerHTML = `
      <div style="text-align:center;padding:2rem">
        <p style="font-size:18px;font-weight:600;color:#1A2330">Thank you - we'll be in touch.</p>
        <p style="color:#5A6A7A">Randeep or a member of the team will respond within one business day.</p>
      </div>`;
  } catch (error) {
    console.error("Contact submission failed:", error);
    btn.textContent = "Request a call →";
    btn.disabled = false;
    if (errMsg) {
      errMsg.textContent = "Something went wrong. Please try again or email help@hello-itsme.com directly.";
      errMsg.style.display = "block";
    }
  }
}

document.querySelector(".contact-form, #contact-form, form")?.addEventListener("submit", submitContactForm);

const wellcheckModal = document.getElementById("wellcheckModal");
const openWellcheckModal = document.getElementById("openWellcheckModal");
const closeWellcheckModal = document.getElementById("closeWellcheckModal");

function toggleWellcheckModal(open) {
  if (!wellcheckModal) return;
  wellcheckModal.classList.toggle("open", open);
  wellcheckModal.setAttribute("aria-hidden", open ? "false" : "true");
}

openWellcheckModal?.addEventListener("click", () => {
  toggleWellcheckModal(true);
});

closeWellcheckModal?.addEventListener("click", () => {
  toggleWellcheckModal(false);
});

wellcheckModal?.addEventListener("click", (e) => {
  if (e.target === wellcheckModal) toggleWellcheckModal(false);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && wellcheckModal?.classList.contains("open")) {
    toggleWellcheckModal(false);
  }
});

async function submitWellcheckSignup(email) {
  const isLocal = window.location.hostname === "127.0.0.1"
               || window.location.hostname === "localhost";

  if (!isLocal) {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: { email: "noreply@hello-itsme.com", name: "VantageIDD" },
        to: [{ email: "help@hello-itsme.com" }],
        subject: `New DSPWellCheck signup - ${email}`,
        html: `<!DOCTYPE html>
<html>
<body style="font-family: Inter, sans-serif; color: #1A2330; 
             max-width: 600px; margin: 0 auto; padding: 32px;">

  <div style="background: #162230; padding: 24px; border-radius: 12px; 
              margin-bottom: 24px;">
    <h1 style="color: white; font-size: 20px; margin: 0;">
      New DSPWellCheck Signup
    </h1>
    <p style="color: #B8C8D8; font-size: 14px; margin: 6px 0 0;">
      Someone wants to be notified when DSPWellCheck launches
    </p>
  </div>

  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <tr style="border-bottom: 1px solid #F0EAE0;">
      <td style="padding: 12px 0; color: #7A8A96; width: 40%;">Email</td>
      <td style="padding: 12px 0;">
        <a href="mailto:${email}" 
           style="color: #C87941;">${email}</a>
      </td>
    </tr>
    <tr>
      <td style="padding: 12px 0; color: #7A8A96;">Signed up</td>
      <td style="padding: 12px 0;">
        ${new Date().toLocaleDateString('en-GB', { 
          day: 'numeric', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })}
      </td>
    </tr>
  </table>

  <p style="margin-top: 24px; font-size: 12px; color: #B8C8D8; 
            text-align: center;">
    VantageIDD · Powered by Focus EduSolutions · hello-itsme.com
  </p>

</body>
</html>`
      })
    });
    return res.ok;
  } else {
    console.log("Local environment - skipping Mailtrap, would have sent email to help@hello-itsme.com");
    return true;
  }
}

document.getElementById("wellcheckNotifyForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const emailValue = document.getElementById("wellcheck-email")?.value?.trim();

  setStatus("wellcheckModalStatus", "Submitting...", "");

  try {
    const results = await Promise.allSettled([
      insertIntoSupabase("dsp_wellcheck_signups", { email: emailValue }),
      submitWellcheckSignup(emailValue).then((sent) => {
        if (!sent) {
          throw new Error("Mailtrap send failed");
        }
        return sent;
      })
    ]);

    results.forEach((result) => {
      if (result.status === "rejected") {
        console.error("DSPWellCheck submission side-effect failed:", result.reason);
      }
    });

    const content = document.getElementById("wellcheckModalContent");
    if (content) {
      content.innerHTML = `<p class="modal-success">You're on the list. We'll be in touch.</p>`;
    }
  } catch (error) {
    console.error("DSPWellCheck signup failed:", error);
    const message = String(error.message || error).toLowerCase();
    if (message.includes("duplicate") || message.includes("already") || message.includes("unique")) {
      setStatus("wellcheckModalStatus", "This email is already registered.", "error");
    } else {
      setStatus("wellcheckModalStatus", "Something went wrong. Please try again.", "error");
    }
  }
});

const harveyMessages = [
  "Chief Clinical Architect",
  "Trauma-Informed IDD Expert",
  "Published by AAIDD",
  "30+ Years IDD Research",
  "Author of VantageIDD Curriculum"
];
let harveyIdx = 0;
const rotEl = document.querySelector(".harvey-rotating-text");
if (rotEl) {
  setInterval(() => {
    harveyIdx = (harveyIdx + 1) % harveyMessages.length;
    rotEl.style.opacity = "0";
    setTimeout(() => {
      rotEl.textContent = harveyMessages[harveyIdx];
      rotEl.style.opacity = "1";
    }, 300);
  }, 2500);
}

showQuestion(0);
updateROI();
