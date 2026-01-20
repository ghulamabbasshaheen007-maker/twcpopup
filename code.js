console.log ("script is working 43")


  /* =========================
     CONFIG
  ========================== */
  var TWC_TARGET_SELECTOR = "#create-post__trigger";
  var TWC_CUSTOM_FIELD_ID = "pMR80x1BrnpsGE0ULX6e";
  var TWC_WATCHED_VALUE = "Watched";

  var TWC_API_BASE = "https://services.leadconnectorhq.com";
  var TWC_API_VERSION = "2021-07-28";
  var TWC_BEARER_TOKEN = "pit-7a2aa063-5698-4490-a39c-d167acbeb4e4";

  // Assets
  var TWC_BG_IMAGE_URL =
    "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/694b465f147f516b70fc6e85.jpg";

  var TWC_VIDEO_URLS = [
    "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/694b3061aaebe869e7136502.mp4",
    "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/694b30612dd46f53e6499569.mp4",
    "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/694b30617d382a58543678a0.mp4",
    "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/694b30992442e05ab9f715bb.mp4",
    "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/694b30611dea1005fea2713a.mp4"
  ];

  // Tutorial labels (you can rename)
  var TWC_STEP_TITLES = [
    "Setup & Configuration",
    "Dashboard Overview",
    "Creating Your First Campaign",
    "Automation Rules",
    "Analytics & Reporting"
  ];

  var TWC_STEP_DESCRIPTIONS = [
    "Learn how to setup and configure your account properly.",
    "Overview of dashboard features and navigation.",
    "Step by step guide to creating your first campaign.",
    "Learn automation rules and workflows.",
    "Understand analytics and reporting features."
  ];

  /* =========================
     IDS / GLOBALS
  ========================== */
  var TWC_FIRED = false;
  var TWC_ACTIVE_UID = null;

  var TWC_TUTORIAL_OVERLAY_ID = "twc-tutorial-overlay";
  var TWC_TUTORIAL_STYLES_ID = "twc-tutorial-styles";

  var TWC_MISSION_ID = "twc-mission-overlay";
  var TWC_MISSION_STYLES_ID = "twc-mission-styles";

  var TWC_DOCK_ID = "twc-success-tracker-dock";
  var TWC_DOCK_STYLE_ID = "twc-success-tracker-dock-styles";

  /* =========================
     LOGGING
  ========================== */
  function twcLog(msg) {
    try {
      console.log("[TWC_TUT]", msg);
    } catch (e) {}
  }

  /* =========================
     UID DETECTION
  ========================== */
  function twcGetUidFromLocalStorage() {
    var prefix = "firebase:authUser:";
    var i, k, raw, obj;

    try {
      for (i = 0; i < localStorage.length; i++) {
        k = localStorage.key(i);
        if (!k || k.indexOf(prefix) !== 0) continue;

        raw = localStorage.getItem(k);
        if (!raw) continue;

        try {
          obj = JSON.parse(raw);
          if (obj && obj.uid) return String(obj.uid).trim();
        } catch (parseErr) {}
      }
    } catch (storageErr) {}

    return null;
  }

  /* =========================
     API HELPERS
  ========================== */
  function twcGetContact(uid) {
    return fetch(TWC_API_BASE + "/contacts/" + encodeURIComponent(uid), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Version: TWC_API_VERSION,
        Authorization: "Bearer " + TWC_BEARER_TOKEN
      }
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error(
            "GET failed: " + res.status + " " + String(t || "").slice(0, 200)
          );
        });
      }
      return res.json();
    });
  }

  function twcGetCustomFieldValue(contactResp) {
    var fields =
      (contactResp && contactResp.contact && contactResp.contact.customFields) || [];
    var i, f;
    for (i = 0; i < fields.length; i++) {
      f = fields[i];
      if (String(f.id) === String(TWC_CUSTOM_FIELD_ID)) {
        return f.value == null ? "" : String(f.value).trim();
      }
    }
    return "";
  }

  function twcIsWatched(val) {
    return (
      String(val || "").trim().toLowerCase() ===
      String(TWC_WATCHED_VALUE).trim().toLowerCase()
    );
  }

  function twcUpdateContactWatched(uid) {
    return fetch(TWC_API_BASE + "/contacts/" + encodeURIComponent(uid), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Version: TWC_API_VERSION,
        Authorization: "Bearer " + TWC_BEARER_TOKEN
      },
      body: JSON.stringify({
        customFields: [
          {
            id: TWC_CUSTOM_FIELD_ID,
            field_value: TWC_WATCHED_VALUE
          }
        ]
      })
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error(
            "PUT failed: " + res.status + " " + String(t || "").slice(0, 200)
          );
        });
      }
      return res.json();
    });
  }

  /* =========================
     SCROLL LOCK
  ========================== */
  var twcPrevOverflow = null;

  function twcLockScroll() {
    try {
      twcPrevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } catch (e) {}
  }

  function twcUnlockScroll() {
    try {
      document.body.style.overflow = twcPrevOverflow == null ? "" : twcPrevOverflow;
    } catch (e) {}
  }

  /* =========================
     TRACKER DOCK (BOTTOM-LEFT)
  ========================== */
  function twcInjectDockStylesOnce() {
    if (document.getElementById(TWC_DOCK_STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = TWC_DOCK_STYLE_ID;
    style.textContent =
      "#" + TWC_DOCK_ID + "{position:fixed;left:18px;bottom:18px;z-index:999990;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;}" +
      "#" + TWC_DOCK_ID + " .twc-dock-btn{width:58px;height:58px;border-radius:18px;border:1px solid rgba(210,180,140,.45);background:linear-gradient(135deg,#111,#222);color:#d2b48c;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 18px 45px rgba(0,0,0,.35);position:relative;}" +
      "#" + TWC_DOCK_ID + " .twc-dock-badge{position:absolute;top:-8px;right:-8px;width:26px;height:26px;border-radius:999px;background:linear-gradient(135deg,#d2b48c,#b89b74);color:#111;font-weight:900;font-size:12px;display:flex;align-items:center;justify-content:center;border:2px solid #111;}" +
      "#" + TWC_DOCK_ID + " .twc-dock-panel{position:absolute;left:0;bottom:70px;width:min(520px,calc(100vw - 36px));max-height:min(70vh,560px);background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,.35);border:1px solid rgba(0,0,0,.08);display:none;}" +
      "#" + TWC_DOCK_ID + " .twc-dock-panel.active{display:block;}" +
      "#" + TWC_DOCK_ID + " .twc-dock-head{background:linear-gradient(135deg,#111,#222);color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #d2b48c;gap:10px;}" +
      "#" + TWC_DOCK_ID + " .twc-dock-head-title{font-weight:900;font-size:14px;color:#e8d8c0;}" +
      "#" + TWC_DOCK_ID + " .twc-dock-close{width:36px;height:36px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;cursor:pointer;}" +
      "#" + TWC_DOCK_ID + " .twc-dock-body{padding:14px 14px;overflow:auto;background:#f7f7f7;max-height:calc(min(70vh,560px) - 120px);-webkit-overflow-scrolling:touch;}" +
      "#" + TWC_DOCK_ID + " .twc-step{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:12px 12px;margin-bottom:10px;}" +
      "#" + TWC_DOCK_ID + " .twc-step-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;}" +
      "#" + TWC_DOCK_ID + " .twc-step-title{font-weight:900;font-size:13px;color:#111;line-height:1.25;}" +
      "#" + TWC_DOCK_ID + " .twc-step-min{font-weight:900;font-size:12px;color:#111;background:linear-gradient(135deg,#d2b48c,#b89b74);padding:6px 10px;border-radius:999px;white-space:nowrap;}" +
      "#" + TWC_DOCK_ID + " .twc-step-links{margin-top:10px;font-size:13px;line-height:1.5;color:#333;}" +
      "#" + TWC_DOCK_ID + " .twc-step-links a{color:#b89b74;font-weight:800;text-decoration:none;border-bottom:1px dotted rgba(184,155,116,.6);}" +
      "#" + TWC_DOCK_ID + " .twc-step-done{margin-top:10px;display:flex;align-items:center;gap:10px;}" +
      "#" + TWC_DOCK_ID + " .twc-cb{width:26px;height:26px;border-radius:10px;border:2px solid #d2b48c;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:900;}" +
      "#" + TWC_DOCK_ID + " .twc-cb.checked{background:#d2b48c;color:#111;}" +
      "#" + TWC_DOCK_ID + " .twc-dock-foot{background:#fff;border-top:1px solid rgba(0,0,0,.08);padding:12px 14px;}" +
      "#" + TWC_DOCK_ID + " .twc-progress-line{display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:900;color:#111;margin-bottom:8px;}" +
      "#" + TWC_DOCK_ID + " .twc-bar{height:10px;background:#e8e8e8;border-radius:999px;overflow:hidden;}" +
      "#" + TWC_DOCK_ID + " .twc-bar > div{height:100%;width:0%;background:linear-gradient(90deg,#d2b48c,#b89b74);}" +
      "@media (max-width:480px){" +
      "#" + TWC_DOCK_ID + "{left:12px;bottom:12px;}" +
      "#" + TWC_DOCK_ID + " .twc-dock-btn{width:54px;height:54px;border-radius:16px;}" +
      "}";

    (document.head || document.documentElement).appendChild(style);
  }

  function twcGetDockSteps() {
    return [
      {
        id: "1",
        title: "Introduction and Quick Start",
        mins: "5 minutes",
        html:
          'Watch The <a target="_blank" href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/home/posts/68bb852022feb0ae2704b09a">Start Here Video</a>.'
      },
      {
        id: "2",
        title: "Decide On Your Product Offer",
        mins: "30 minutes",
        html:
          'Watch in order: ' +
          '<a target="_blank" href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/47f8eebb-636e-4490-ac4b-ebf7ca613286?source=communities&group_slug=the-wealth-creator">Digital & Affiliate Marketing 101</a>, ' +
          '<a target="_blank" href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/35a97775-c30b-4a64-9932-b46e065f59c2?source=communities&group_slug=the-wealth-creator">Onboarding Call</a>, ' +
          '<a target="_blank" href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/94a2da82-51cd-4607-a46f-dd86fa2af408?source=communities&group_slug=the-wealth-creator">Choose Your Path Flowchart</a>.'
      },
      {
        id: "3",
        title: "Attend an Onboarding Call",
        mins: "30 minutes",
        html:
          'Choose a day: <a target="_blank" href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/events">Events</a>. ' +
          'Or self-onboard: <a target="_blank" href="https://www.loom.com/share/333c685b104d426a828c485b06dedd46">Watch</a>. ' +
          'Then: <a target="_blank" href="https://thewealthcreator.co/firm-page">FIRM</a> (code: Firmfree) + <a target="_blank" href="https://thewealthcreator.co/branding">Branding Form</a>.'
      },
      {
        id: "4",
        title: "Create a Social Media account and Post your FIRST Post!",
        mins: "1 hour",
        html:
          'Use the <a target="_blank" href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/80ef2315-2298-42b3-9635-92fe122dc05d">Instagram Modules</a> ' +
          'and the <a target="_blank" href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/80ef2315-2298-42b3-9635-92fe122dc05d/posts/57904857-4c4f-4f93-9cab-a2f18389d523?source=communities&group_slug=the-wealth-creator">2 Weeks of Content</a>.'
      },
      {
        id: "5",
        title: "YOUR Business is Delivered",
        mins: "5 minutes",
        html:
          'Watch: <a target="_blank" href="https://www.loom.com/share/730a88aad18e4fe88dfd839ff85fba46">Next steps video</a>. ' +
          'If not delivered, email <a href="mailto:support@thecreatorsco.biz">support@thecreatorsco.biz</a>.'
      },
      {
        id: "6",
        title: "Continue Learning",
        mins: "2 hours",
        html:
          'Watch the <a target="_blank" href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/learning">code modules</a>, then the <a target="_blank" href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/learning">wealth creator modules</a>.'
      },
      {
        id: "7",
        title: "Attend 3 Mentorship Calls",
        mins: "3 hours",
        html:
          'Join calls: <a target="_blank" href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/events">Events</a> ' +
          'or watch <a target="_blank" href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/channels/Past-Coaching-Calls-8cT3N">Recordings</a>.'
      }
    ];
  }

  function twcGetCompletedStepsSet() {
    try {
      return new Set(JSON.parse(localStorage.getItem("twcCompletedSteps")) || []);
    } catch (e) {
      return new Set();
    }
  }

  function twcSaveCompletedStepsSet(setObj) {
    try {
      localStorage.setItem("twcCompletedSteps", JSON.stringify(Array.from(setObj)));
    } catch (e) {}
  }

  function twcMountDockTracker() {
    if (document.getElementById(TWC_DOCK_ID)) return;

    twcInjectDockStylesOnce();

    var root = document.createElement("div");
    root.id = TWC_DOCK_ID;

    root.innerHTML =
      '<button class="twc-dock-btn" type="button" aria-label="Open tracker">' +
      '  <span style="font-weight:900;font-size:16px;">✓</span>' +
      '  <span class="twc-dock-badge" id="twcDockBadge">!</span>' +
      "</button>" +
      '<div class="twc-dock-panel" id="twcDockPanel">' +
      '  <div class="twc-dock-head">' +
      '    <div class="twc-dock-head-title">TWC Success Tracker</div>' +
      '    <button class="twc-dock-close" type="button" aria-label="Close">✕</button>' +
      "  </div>" +
      '  <div class="twc-dock-body" id="twcDockBody"></div>' +
      '  <div class="twc-dock-foot">' +
      '    <div class="twc-progress-line"><span>Progress</span><span id="twcDockProgressText">0/7</span></div>' +
      '    <div class="twc-bar"><div id="twcDockProgressBar"></div></div>' +
      "  </div>" +
      "</div>";

    document.body.appendChild(root);

    var btn = root.querySelector(".twc-dock-btn");
    var panel = document.getElementById("twcDockPanel");
    var closeBtn = root.querySelector(".twc-dock-close");
    var body = document.getElementById("twcDockBody");

    function renderDock() {
      var steps = twcGetDockSteps();
      var completed = twcGetCompletedStepsSet();

      var html = "";
      for (var i = 0; i < steps.length; i++) {
        var s = steps[i];
        var isDone = completed.has(String(s.id));
        html +=
          '<div class="twc-step" data-step="' +
          s.id +
          '">' +
          '  <div class="twc-step-top">' +
          '    <div class="twc-step-title">' +
          (i + 1) +
          ". " +
          s.title +
          "</div>" +
          '    <div class="twc-step-min">' +
          s.mins +
          "</div>" +
          "  </div>" +
          '  <div class="twc-step-links">' +
          s.html +
          "</div>" +
          '  <div class="twc-step-done">' +
          '    <div class="twc-cb ' +
          (isDone ? "checked" : "") +
          '" data-step="' +
          s.id +
          '">' +
          (isDone ? "✓" : "") +
          "</div>" +
          '    <div style="font-weight:800;font-size:12px;color:#111;">Mark complete</div>' +
          "  </div>" +
          "</div>";
      }

      body.innerHTML = html;

      var cbs = body.querySelectorAll(".twc-cb");
      for (var j = 0; j < cbs.length; j++) {
        cbs[j].addEventListener("click", function (evt) {
          var stepId = evt.currentTarget.getAttribute("data-step");
          var completed2 = twcGetCompletedStepsSet();
          if (completed2.has(stepId)) completed2.delete(stepId);
          else completed2.add(stepId);
          twcSaveCompletedStepsSet(completed2);
          renderDock();
        });
      }

      var doneCount = twcGetCompletedStepsSet().size;
      var txt = document.getElementById("twcDockProgressText");
      var bar = document.getElementById("twcDockProgressBar");
      var badge = document.getElementById("twcDockBadge");

      if (txt) txt.textContent = doneCount + "/7";
      if (bar) bar.style.width = Math.round((doneCount / 7) * 100) + "%";
      if (badge) badge.style.display = doneCount < 7 ? "flex" : "none";
    }

    function togglePanel(forceOpen) {
      if (!panel) return;
      var isOpen = panel.classList.contains("active");
      if (forceOpen === true) isOpen = false;
      if (forceOpen === false) isOpen = true;

      if (isOpen) panel.classList.remove("active");
      else panel.classList.add("active");
    }

    btn.addEventListener("click", function () {
      togglePanel();
    });

    closeBtn.addEventListener("click", function () {
      togglePanel(false);
    });

    document.addEventListener("click", function (evt) {
      if (!panel || !panel.classList.contains("active")) return;
      if (root.contains(evt.target)) return;
      panel.classList.remove("active");
    });

    renderDock();
    twcLog("Tracker dock mounted.");
  }

  /* =========================
     MISSION ACCOMPLISHED POPUP
     (dismiss -> then show dock)
  ========================== */
  function twcInjectMissionStylesOnce() {
    if (document.getElementById(TWC_MISSION_STYLES_ID)) return;

    var style = document.createElement("style");
    style.id = TWC_MISSION_STYLES_ID;
    style.textContent =
      "#" + TWC_MISSION_ID + "{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);padding:18px;}" +
      "#" + TWC_MISSION_ID + " .twc-m-card{width:min(520px,100%);background:#0b1220;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 25px 70px rgba(0,0,0,.55);padding:18px 18px 16px 18px;}" +
      "#" + TWC_MISSION_ID + " .twc-m-title{font:900 18px/1.2 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;margin:0 0 8px 0;}" +
      "#" + TWC_MISSION_ID + " .twc-m-body{font:14px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;color:rgba(255,255,255,.86);margin:0;}" +
      "#" + TWC_MISSION_ID + " .twc-m-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:14px;}" +
      "#" + TWC_MISSION_ID + " .twc-m-btn{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;border-radius:12px;padding:10px 14px;font:900 13px/1 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;cursor:pointer;}" +
      "#" + TWC_MISSION_ID + " .twc-m-btn.primary{background:linear-gradient(135deg,#d2b48c,#b89b74);border-color:rgba(210,180,140,.45);color:#111;}" +
      "@media (max-width:480px){" +
      "#" + TWC_MISSION_ID + "{padding:10px;}" +
      "#" + TWC_MISSION_ID + " .twc-m-card{border-radius:16px;}" +
      "}";

    (document.head || document.documentElement).appendChild(style);
  }

  function twcShowMissionAccomplished(onDismiss) {
    twcInjectMissionStylesOnce();

    if (document.getElementById(TWC_MISSION_ID)) return;

    var overlay = document.createElement("div");
    overlay.id = TWC_MISSION_ID;

    var card = document.createElement("div");
    card.className = "twc-m-card";

    var title = document.createElement("div");
    title.className = "twc-m-title";
    title.textContent = "Mission accomplished";

    var body = document.createElement("p");
    body.className = "twc-m-body";
    body.textContent =
      "You have completed the journey. Your tracker is now available at the bottom-left of the page.";

    var actions = document.createElement("div");
    actions.className = "twc-m-actions";

    var btnOk = document.createElement("button");
    btnOk.className = "twc-m-btn primary";
    btnOk.type = "button";
    btnOk.textContent = "Got it";

    function teardown() {
      try {
        overlay.remove();
      } catch (e) {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }
      if (typeof onDismiss === "function") onDismiss();
    }

    btnOk.addEventListener("click", teardown);

    actions.appendChild(btnOk);
    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  /* =========================
     TUTORIAL OVERLAY (NOT CLOSABLE)
     - No close button
     - No ESC close
     - No click outside close
     - Only Finish Journey proceeds
  ========================== */
  function twcInjectTutorialStylesOnce() {
    if (document.getElementById(TWC_TUTORIAL_STYLES_ID)) return;

    var style = document.createElement("style");
    style.id = TWC_TUTORIAL_STYLES_ID;

    style.textContent =
      "#" + TWC_TUTORIAL_OVERLAY_ID + "{position:fixed;inset:0;z-index:999998;display:flex;align-items:center;justify-content:center;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " *{box-sizing:border-box;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-stage{position:relative;width:100%;height:100%;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;display:flex;align-items:center;justify-content:center;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-bg{position:fixed;top:0;left:0;width:100%;height:100%;z-index:1;overflow:hidden;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-bg-img{width:100%;height:100%;background-image:url('" + TWC_BG_IMAGE_URL + "');background-size:cover;background-position:center;background-repeat:no-repeat;filter:brightness(.82);}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-bg-ol{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.25);}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-box{position:relative;z-index:2;width:min(980px,100%);max-height:92vh;display:flex;flex-direction:column;overflow:hidden;border-radius:20px;border:1px solid rgba(255,255,255,.18);box-shadow:0 25px 80px rgba(0,0,0,.55);background:rgba(255,255,255,.95);margin:10px;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-head{background:#d2b48c;color:#fff;padding:16px 18px;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-head-row{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-h-title{font-weight:900;font-size:18px;line-height:1.2;margin:0;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-h-step{font-weight:900;font-size:13px;opacity:.95;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-h-bar{height:6px;background:rgba(255,255,255,.35);border-radius:999px;overflow:hidden;margin-top:10px;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-h-bar > div{height:100%;width:0%;background:#fff;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-body{display:flex;flex:1;overflow:hidden;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-video{flex:1;padding:16px;background:#f8fafc;display:flex;flex-direction:column;min-height:340px;border-right:1px solid #e2e8f0;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-v-title{font-weight:900;font-size:16px;color:#111;margin:0 0 10px 0;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-v-wrap{flex:1;background:#000;border-radius:14px;overflow:hidden;position:relative;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " video{width:100%;height:100%;display:block;object-fit:cover;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-v-desc{margin-top:10px;background:#edf2f7;border:1px solid #e2e8f0;border-radius:12px;padding:12px;color:#333;font-size:13px;line-height:1.45;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-steps{width:320px;padding:14px;background:#fff;overflow:auto;-webkit-overflow-scrolling:touch;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-s-title{font-weight:900;font-size:15px;color:#111;margin:0 0 10px 0;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-step{padding:12px;border:2px solid #e2e8f0;border-radius:14px;margin-bottom:10px;cursor:pointer;transition:all .18s ease;background:#fff;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-step.active{border-color:#d2b48c;background:rgba(210,180,140,.06);}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-step:hover{transform:translateY(-1px);}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-step-name{font-weight:900;font-size:13px;color:#111;margin:0 0 6px 0;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-foot{padding:14px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-btn{padding:12px 16px;border-radius:14px;font-weight:900;font-size:13px;border:none;cursor:pointer;min-width:140px;display:flex;align-items:center;justify-content:center;gap:8px;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-btn.prev{background:#e2e8f0;color:#111;border:1px solid #cbd5e0;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-btn.next{background:linear-gradient(135deg,#d2b48c,#b89b74);color:#111;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-btn:disabled{opacity:.6;cursor:not-allowed;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-error{margin-left:auto;color:#b91c1c;font-weight:900;font-size:12px;}" +

      /* iPhone / mobile optimization */
      "@media (max-width:768px){" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-box{width:100%;height:100%;max-height:100vh;border-radius:0;margin:0;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-body{flex-direction:column;overflow:auto;-webkit-overflow-scrolling:touch;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-video{border-right:none;border-bottom:1px solid #e2e8f0;min-height:auto;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-v-wrap{height:260px;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-steps{width:100%;max-height:260px;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-foot{position:sticky;bottom:0;}" +
      "}" +
      "@media (max-width:480px){" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-head{padding-top:calc(14px + env(safe-area-inset-top));}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-foot{padding-bottom:calc(14px + env(safe-area-inset-bottom));}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-v-wrap{height:220px;}" +
      "#" + TWC_TUTORIAL_OVERLAY_ID + " .twc-btn{min-width:140px;width:100%;}" +
      "}";

    (document.head || document.documentElement).appendChild(style);
  }

  function twcRemoveTutorialOverlay() {
    var el = document.getElementById(TWC_TUTORIAL_OVERLAY_ID);
    if (el) {
      try {
        el.remove();
      } catch (e) {
        if (el.parentNode) el.parentNode.removeChild(el);
      }
    }
    twcUnlockScroll();
  }

  function twcShowTutorialOverlay(uid) {
    if (document.getElementById(TWC_TUTORIAL_OVERLAY_ID)) return;

    twcInjectTutorialStylesOnce();
    twcLockScroll();

    var overlay = document.createElement("div");
    overlay.id = TWC_TUTORIAL_OVERLAY_ID;

    var currentStep = 0; // 0..4
    var totalSteps = 5;

    function buildStepsHtml(activeIndex) {
      var html = "";
      for (var i = 0; i < totalSteps; i++) {
        html +=
          '<div class="twc-step ' +
          (i === activeIndex ? "active" : "") +
          '" data-step="' +
          i +
          '">' +
          '<div class="twc-step-name">' +
          (i + 1) +
          ". " +
          TWC_STEP_TITLES[i] +
          "</div>" +
          "</div>";
      }
      return html;
    }

    function updateHeaderProgress(root) {
      var bar = root.querySelector("#twcHeaderBarFill");
      var stepText = root.querySelector("#twcHeaderStepText");
      var pct = Math.round(((currentStep + 1) / totalSteps) * 100);
      if (bar) bar.style.width = pct + "%";
      if (stepText) stepText.textContent = "Step " + (currentStep + 1) + "/" + totalSteps;
    }

    function render() {
      overlay.innerHTML =
        '<div class="twc-stage">' +
        '  <div class="twc-bg">' +
        '    <div class="twc-bg-img"></div>' +
        '    <div class="twc-bg-ol"></div>' +
        "  </div>" +
        '  <div class="twc-box" role="dialog" aria-modal="true">' +
        '    <div class="twc-head">' +
        '      <div class="twc-head-row">' +
        '        <div class="twc-h-title">New Member Journey</div>' +
        '        <div class="twc-h-step" id="twcHeaderStepText">Step 1/5</div>' +
        "      </div>" +
        '      <div class="twc-h-bar"><div id="twcHeaderBarFill"></div></div>' +
        "    </div>" +
        '    <div class="twc-body">' +
        '      <div class="twc-video">' +
        '        <div class="twc-v-title" id="twcVideoTitle"></div>' +
        '        <div class="twc-v-wrap">' +
        '          <video id="twcVideo" controls playsinline webkit-playsinline preload="metadata">' +
        '            <source id="twcVideoSource" src="" type="video/mp4" />' +
        "          </video>" +
        "        </div>" +
        '        <div class="twc-v-desc" id="twcVideoDesc"></div>' +
        "      </div>" +
        '      <div class="twc-steps">' +
        '        <div class="twc-s-title">Course Steps</div>' +
        '        <div id="twcStepsList">' +
        buildStepsHtml(currentStep) +
        "        </div>" +
        "      </div>" +
        "    </div>" +
        '    <div class="twc-foot">' +
        '      <button class="twc-btn prev" id="twcPrevBtn" type="button">Previous</button>' +
        '      <button class="twc-btn next" id="twcNextBtn" type="button">Next</button>' +
        '      <div class="twc-error" id="twcErrMsg" style="display:none;"></div>' +
        "    </div>" +
        "  </div>" +
        "</div>";

      document.body.appendChild(overlay);

      var titleEl = overlay.querySelector("#twcVideoTitle");
      var descEl = overlay.querySelector("#twcVideoDesc");
      var videoEl = overlay.querySelector("#twcVideo");
      var sourceEl = overlay.querySelector("#twcVideoSource");
      var prevBtn = overlay.querySelector("#twcPrevBtn");
      var nextBtn = overlay.querySelector("#twcNextBtn");
      var stepsList = overlay.querySelector("#twcStepsList");

      function setError(msg) {
        var err = overlay.querySelector("#twcErrMsg");
        if (!err) return;
        if (!msg) {
          err.style.display = "none";
          err.textContent = "";
        } else {
          err.style.display = "block";
          err.textContent = msg;
        }
      }

      function updateUI() {
        if (titleEl) titleEl.textContent = TWC_STEP_TITLES[currentStep];
        if (descEl) descEl.textContent = TWC_STEP_DESCRIPTIONS[currentStep];

        if (sourceEl) sourceEl.src = TWC_VIDEO_URLS[currentStep];
        if (videoEl) {
          try {
            videoEl.load();
          } catch (e) {}
        }

        if (prevBtn) prevBtn.disabled = currentStep === 0;

        if (nextBtn) {
          if (currentStep === totalSteps - 1) {
            nextBtn.textContent = "Finish Journey";
          } else {
            nextBtn.textContent = "Next";
          }
        }

        if (stepsList) stepsList.innerHTML = buildStepsHtml(currentStep);

        updateHeaderProgress(overlay);
      }

      function goToStep(idx) {
        if (idx < 0) idx = 0;
        if (idx > totalSteps - 1) idx = totalSteps - 1;
        currentStep = idx;
        setError("");
        updateUI();
      }

      if (prevBtn) {
        prevBtn.addEventListener("click", function () {
          goToStep(currentStep - 1);
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener("click", function () {
          setError("");

          if (currentStep < totalSteps - 1) {
            goToStep(currentStep + 1);
            return;
          }

          // FINISH JOURNEY: call API now
          nextBtn.disabled = true;
          nextBtn.textContent = "Finishing...";

          twcUpdateContactWatched(uid)
            .then(function () {
              twcLog("Finish Journey: marked Watched successfully.");
              twcRemoveTutorialOverlay();

              // show Mission Accomplished, then mount dock after dismissal
              twcShowMissionAccomplished(function () {
                twcMountDockTracker();
              });
            })
            .catch(function (err) {
              twcLog("Finish Journey: failed PUT: " + (err && err.message ? err.message : err));
              nextBtn.disabled = false;
              nextBtn.textContent = "Finish Journey";
              setError("Could not save completion. Please try again.");
            });
        });
      }

      if (stepsList) {
        stepsList.addEventListener("click", function (evt) {
          var node = evt.target;
          while (node && node !== stepsList) {
            if (node.getAttribute && node.getAttribute("data-step") != null) {
              var idxStr = node.getAttribute("data-step");
              var idx = parseInt(idxStr, 10);
              if (!isNaN(idx)) goToStep(idx);
              break;
            }
            node = node.parentNode;
          }
        });
      }

      // Initial UI
      updateUI();
    }

    render();
    twcLog("Tutorial overlay shown (not closable).");
  }

  /* =========================
     FLOW
  ========================== */
  function twcRunFlow() {
    if (TWC_FIRED) return;
    TWC_FIRED = true;

    var uid = twcGetUidFromLocalStorage();
    if (!uid) {
      TWC_FIRED = false;
      twcLog("UID not found. Flow aborted.");
      return;
    }

    TWC_ACTIVE_UID = uid;
    twcLog("UID found: " + uid + " — fetching contact…");

    twcGetContact(uid)
      .then(function (resp) {
        var fieldVal = twcGetCustomFieldValue(resp);
        twcLog("Custom field value: " + (fieldVal || "(empty)"));

        if (twcIsWatched(fieldVal)) {
          twcLog("Watched => show dock only.");
          twcMountDockTracker();
          return;
        }

        twcLog("Not watched => show tutorial overlay.");
        twcShowTutorialOverlay(uid);
      })
      .catch(function (err) {
        TWC_FIRED = false;
        twcLog("Flow error: " + (err && err.message ? err.message : err));
      });
  }

  /* =========================
     OBSERVERS
  ========================== */
  function twcWaitForTargetThenTriggerOnViewport() {
    var intersectionObserver = null;
    var mutationObserver = null;

    function cleanup() {
      if (intersectionObserver) intersectionObserver.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
    }

    function attachIntersection(el) {
      if (!el) return;

      if (intersectionObserver) intersectionObserver.disconnect();

      intersectionObserver = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
              twcLog("Target in viewport => running flow.");
              twcRunFlow();
              cleanup();
              break;
            }
          }
        },
        { threshold: 0.25 }
      );

      intersectionObserver.observe(el);
      twcLog("IntersectionObserver attached.");
    }

    var now = document.querySelector(TWC_TARGET_SELECTOR);
    if (now) {
      twcLog("Target found immediately.");
      attachIntersection(now);
      return;
    }

    twcLog("Waiting for target via MutationObserver…");

    mutationObserver = new MutationObserver(function () {
      var t = document.querySelector(TWC_TARGET_SELECTOR);
      if (t) {
        twcLog("Target found via MutationObserver.");
        attachIntersection(t);
      }
    });

    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Start immediately
  twcWaitForTargetThenTriggerOnViewport();

