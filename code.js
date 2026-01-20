console.log ("script is working 44")


  /* =========================
     WISP/TWC CONFIG
  ========================== */
  var WISP_TWC_TARGET_CUSTOM_FIELD_ID = "pMR80x1BrnpsGE0ULX6e";
  var WISP_TWC_WATCHED_VALUE = "Watched";

  var WISP_TWC_API_BASE = "https://services.leadconnectorhq.com";
  var WISP_TWC_API_VERSION = "2021-07-28";
  var WISP_TWC_BEARER_TOKEN = "pit-7a2aa063-5698-4490-a39c-d167acbeb4e4";

  var WISP_TWC_DEBUG = true;

  /* =========================
     LOGGING
  ========================== */
  function WISP_TWC_log(msg) {
    if (!WISP_TWC_DEBUG) return;
    try {
      console.log("[WISP_TWC]", msg);
    } catch (e) {}
  }

  /* =========================
     SAFE HELPERS
  ========================== */
  function WISP_TWC_safeRemove(el) {
    try {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    } catch (e) {}
  }

  function WISP_TWC_injectFontAwesomeOnce() {
    try {
      if (document.getElementById("wisp-twc-fa")) return;
      var link = document.createElement("link");
      link.id = "wisp-twc-fa";
      link.rel = "stylesheet";
      link.href =
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
      (document.head || document.documentElement).appendChild(link);
    } catch (e) {}
  }

  /* =========================
     UID DISCOVERY (Firebase)
  ========================== */
  function WISP_TWC_getUidFromLocalStorage() {
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
     API
  ========================== */
  function WISP_TWC_apiGetContact(uid) {
    return fetch(WISP_TWC_API_BASE + "/contacts/" + encodeURIComponent(uid), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Version: WISP_TWC_API_VERSION,
        Authorization: "Bearer " + WISP_TWC_BEARER_TOKEN,
      },
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error(
            "GET failed: " +
              res.status +
              " " +
              String(t || "").slice(0, 180)
          );
        });
      }
      return res.json();
    });
  }

  function WISP_TWC_apiPutWatched(uid) {
    return fetch(WISP_TWC_API_BASE + "/contacts/" + encodeURIComponent(uid), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Version: WISP_TWC_API_VERSION,
        Authorization: "Bearer " + WISP_TWC_BEARER_TOKEN,
      },
      body: JSON.stringify({
        customFields: [
          {
            id: WISP_TWC_TARGET_CUSTOM_FIELD_ID,
            field_value: WISP_TWC_WATCHED_VALUE,
          },
        ],
      }),
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error(
            "PUT failed: " +
              res.status +
              " " +
              String(t || "").slice(0, 180)
          );
        });
      }
      return res.json();
    });
  }

  function WISP_TWC_extractCustomFieldValue(contactResp) {
    var fields =
      (contactResp &&
        contactResp.contact &&
        contactResp.contact.customFields) ||
      [];
    var i, f;
    for (i = 0; i < fields.length; i++) {
      f = fields[i];
      if (String(f.id) === WISP_TWC_TARGET_CUSTOM_FIELD_ID) {
        return f.value == null ? "" : String(f.value).trim();
      }
    }
    return "";
  }

  function WISP_TWC_isWatched(val) {
    return (
      String(val || "").trim().toLowerCase() ===
      String(WISP_TWC_WATCHED_VALUE).trim().toLowerCase()
    );
  }

  /* =========================
     CSS (SCOPED)
     - We scope everything under #wisp-twc-tutorial-overlay or #wisp-twc-chat-root
     - We avoid global body/html styling to not wreck the community page
  ========================== */
  function WISP_TWC_injectStylesOnce() {
    if (document.getElementById("wisp-twc-styles")) return;

    var css = []
      .concat([
        ":root{--twc-gold:#d2b48c;--twc-gold-dark:#b89b74;--twc-gold-light:#e8d8c0;--twc-black:#1a1a1a;--twc-white:#ffffff;--twc-gray:#f8f8f8;--twc-gray-dark:#e8e8e8;--twc-text:#2c2c2c;--twc-text-light:#666666;--shadow:0 15px 35px rgba(0,0,0,0.1),0 5px 15px rgba(0,0,0,0.07);--shadow-heavy:0 20px 50px rgba(0,0,0,0.15),0 10px 25px rgba(0,0,0,0.1);--radius:18px;--radius-sm:14px;--radius-lg:24px;--transition:all .3s cubic-bezier(.4,0,.2,1);}",

        /* Tutorial overlay wrapper */
        "#wisp-twc-tutorial-overlay{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;}",
        "#wisp-twc-tutorial-overlay *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}",
        "#wisp-twc-bg-overlay{position:absolute;inset:0;background-image:url('https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/694b465f147f516b70fc6e85.jpg');background-size:cover;background-position:center;filter:brightness(.25) blur(6px);opacity:.9;z-index:1;transform:scale(1.02);}",
        "#wisp-twc-tracker-shell{position:relative;z-index:2;width:100%;max-width:1200px;height:90vh;max-height:850px;background:var(--twc-white);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-heavy);display:flex;flex-direction:column;border:1px solid rgba(210,180,140,.15);}",

        /* Main widget styles (ported from your HTML, lightly scoped) */
        "#wisp-twc-tracker-shell .twc-header{background:linear-gradient(135deg,var(--twc-black) 0%,#222 100%);color:#fff;padding:22px 35px;display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid var(--twc-gold);flex-shrink:0;min-height:85px;position:relative;overflow:hidden;}",
        "#wisp-twc-tracker-shell .twc-header::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--twc-gold),transparent);}",
        "#wisp-twc-tracker-shell .twc-header h2{font-size:1.5rem;font-weight:800;color:var(--twc-gold-light);letter-spacing:-.5px;display:flex;align-items:center;gap:12px;text-shadow:0 2px 4px rgba(0,0,0,.3);margin:0;}",
        "#wisp-twc-tracker-shell .twc-header h2::before{content:'🏆';font-size:1.3rem;}",
        "#wisp-twc-tracker-shell .progress-container{min-width:200px;background:rgba(255,255,255,.05);padding:12px 16px;border-radius:12px;border:1px solid rgba(210,180,140,.2);}",
        "#wisp-twc-tracker-shell .progress-text{font-size:.9rem;margin-bottom:10px;display:flex;justify-content:space-between;font-weight:600;gap:20px;}",
        "#wisp-twc-tracker-shell .progress-text span:first-child{color:var(--twc-gold-light);opacity:.9;}",
        "#wisp-twc-tracker-shell .progress-text span:last-child{color:var(--twc-gold);font-weight:700;}",
        "#wisp-twc-tracker-shell .progress-bar-bg{width:100%;height:10px;background:rgba(255,255,255,.1);border-radius:6px;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,.3);}",
        "#wisp-twc-tracker-shell .progress-bar-fill{height:100%;background:linear-gradient(90deg,var(--twc-gold),#e0c090);width:0%;transition:width .8s cubic-bezier(.34,1.56,.64,1);border-radius:6px;position:relative;box-shadow:0 0 15px rgba(210,180,140,.3);}",

        "#wisp-twc-tracker-shell .twc-main{display:flex;flex:1;overflow:hidden;min-height:0;background:linear-gradient(to right,#fff 0%,#fcfcfc 100%);}",
        "#wisp-twc-tracker-shell .twc-content{flex:1;padding:30px;overflow-y:auto;display:flex;flex-direction:column;min-height:0;}",
        "#wisp-twc-tracker-shell .content-header{margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid var(--twc-gray-dark);}",
        "#wisp-twc-tracker-shell .content-header h1{font-size:1.8rem;margin:0 0 10px 0;font-weight:800;line-height:1.2;color:var(--twc-black);letter-spacing:-.5px;background:linear-gradient(135deg,var(--twc-black),#444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}",
        "#wisp-twc-tracker-shell .content-header h1::after{content:'';display:block;width:60px;height:4px;background:var(--twc-gold);margin-top:15px;border-radius:2px;}",
        "#wisp-twc-tracker-shell .video-wrapper{width:100%;aspect-ratio:16/9;background:#000;border-radius:var(--radius-sm);overflow:hidden;margin-bottom:30px;position:relative;flex-shrink:0;box-shadow:0 10px 30px rgba(0,0,0,.2);border:1px solid rgba(0,0,0,.3);}",
        "#wisp-twc-tracker-shell .video-wrapper video{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;}",

        "#wisp-twc-tracker-shell .twc-sidebar{width:380px;background:linear-gradient(to bottom,#fafafa 0%,#f5f5f5 100%);border-left:1px solid var(--twc-gray-dark);padding:30px;overflow-y:auto;min-height:0;}",
        "#wisp-twc-tracker-shell .twc-sidebar h4{font-size:.8rem;color:var(--twc-text-light);margin:0 0 20px 0;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;position:relative;padding-bottom:10px;}",
        "#wisp-twc-tracker-shell .twc-sidebar h4::after{content:'';position:absolute;bottom:0;left:0;width:40px;height:2px;background:var(--twc-gold);}",

        "#wisp-twc-tracker-shell .step-card{padding:18px;background:#fff;border:1px solid var(--twc-gray-dark);border-radius:var(--radius-sm);margin-bottom:15px;cursor:pointer;display:flex;align-items:center;gap:15px;transition:var(--transition);position:relative;overflow:hidden;}",
        "#wisp-twc-tracker-shell .step-card::before{content:'';position:absolute;top:0;left:0;width:4px;height:100%;background:transparent;transition:var(--transition);}",
        "#wisp-twc-tracker-shell .step-card:hover{transform:translateY(-3px);box-shadow:0 8px 25px rgba(0,0,0,.1);border-color:var(--twc-gold-light);}",
        "#wisp-twc-tracker-shell .step-card:hover::before{background:var(--twc-gold);}",
        "#wisp-twc-tracker-shell .step-card.active{background:linear-gradient(135deg,var(--twc-black),#2a2a2a);color:#fff;border-color:var(--twc-gold);box-shadow:0 8px 25px rgba(0,0,0,.2);}",
        "#wisp-twc-tracker-shell .step-card.active::before{background:var(--twc-gold);}",
        "#wisp-twc-tracker-shell .step-num{width:36px;height:36px;border-radius:50%;background:var(--twc-gray);display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0;font-size:.9rem;color:var(--twc-text);transition:var(--transition);}",
        "#wisp-twc-tracker-shell .step-card.active .step-num{background:var(--twc-gold);color:var(--twc-black);transform:scale(1.1);}",
        "#wisp-twc-tracker-shell .step-title{font-size:1rem;font-weight:600;white-space:normal;line-height:1.4;}",

        "#wisp-twc-tracker-shell .step-progress-container{position:relative;height:22px;background:rgba(0,0,0,.06);border-radius:12px;margin-top:12px;overflow:hidden;}",
        "#wisp-twc-tracker-shell .step-progress-fill{height:100%;background:linear-gradient(90deg,var(--twc-gold),var(--twc-gold-dark));width:0%;transition:width .6s cubic-bezier(.34,1.56,.64,1);border-radius:12px;}",
        "#wisp-twc-tracker-shell .step-progress-text{position:absolute;top:50%;left:12px;transform:translateY(-50%);font-size:.75rem;font-weight:700;color:var(--twc-black);z-index:1;white-space:nowrap;}",
        "#wisp-twc-tracker-shell .step-progress-text.inside-fill{color:var(--twc-black);text-align:center;width:100%;left:0;}",
        "#wisp-twc-tracker-shell .step-card.active .step-progress-container{background:rgba(255,255,255,.12);}",

        "#wisp-twc-tracker-shell .twc-footer{padding:20px 35px;background:linear-gradient(to right,#fafafa,#f5f5f5);border-top:1px solid var(--twc-gray-dark);display:flex;justify-content:space-between;gap:12px;flex-shrink:0;}",
        "#wisp-twc-tracker-shell .btn{padding:16px 28px;border-radius:var(--radius-sm);font-weight:700;cursor:pointer;border:none;font-size:.95rem;transition:var(--transition);min-width:140px;}",
        "#wisp-twc-tracker-shell .btn:disabled{opacity:.4;cursor:not-allowed;}",
        "#wisp-twc-tracker-shell .btn-prev{background:var(--twc-gray);color:var(--twc-text);border:1px solid var(--twc-gray-dark);}",
        "#wisp-twc-tracker-shell .btn-next{background:linear-gradient(135deg,var(--twc-gold),var(--twc-gold-dark));color:var(--twc-black);}",
        "#wisp-twc-tracker-shell .btn-complete{background:linear-gradient(135deg,#27ae60,#219955);color:#fff;}",

        /* Mission modal */
        "#wisp-twc-mission-modal{position:fixed;inset:0;z-index:1000000;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .25s ease;}",
        "#wisp-twc-mission-modal .mission-content{background:linear-gradient(135deg,#fff 0%,#fafafa 100%);border:3px solid var(--twc-gold);box-shadow:0 25px 60px rgba(0,0,0,0.3),0 0 0 1px rgba(210,180,140,0.5);border-radius:var(--radius-lg);max-width:550px;width:100%;padding:34px;text-align:center;}",
        "#wisp-twc-mission-modal .mission-title{color:var(--twc-black);margin:0 0 14px 0;font-size:1.8rem;font-weight:800;letter-spacing:-.5px;}",
        "#wisp-twc-mission-modal .mission-text{color:var(--twc-text);margin:0 0 22px 0;line-height:1.7;font-size:1.05rem;}",
        "#wisp-twc-mission-modal .mission-btn{background:linear-gradient(135deg,var(--twc-gold),var(--twc-gold-dark));color:var(--twc-black);border:none;padding:16px 38px;border-radius:var(--radius-sm);font-weight:800;font-size:1.05rem;cursor:pointer;transition:var(--transition);box-shadow:0 8px 25px rgba(184,155,116,0.4);}",

        /* Bottom-left tracker widget */
        "#wisp-twc-chat-root{position:fixed;left:25px;bottom:25px;z-index:999998;display:none;}",
        "#wisp-twc-chat-root *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}",
        "#wisp-twc-chat-toggle{width:65px;height:65px;background:linear-gradient(135deg,var(--twc-black),#222);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--twc-gold);font-size:26px;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,0.3),0 0 0 2px rgba(210,180,140,0.3);transition:var(--transition);border:2px solid var(--twc-gold);position:relative;}",
        "#wisp-twc-chat-toggle.active{color:var(--twc-gold-light);transform:rotate(45deg);}",
        "#wisp-twc-chat-badge{position:absolute;top:-5px;right:-5px;background:linear-gradient(135deg,var(--twc-gold),#e0b870);color:var(--twc-black);font-size:12px;width:24px;height:24px;border-radius:50%;display:none;align-items:center;justify-content:center;font-weight:900;border:2px solid var(--twc-black);}",

        "#wisp-twc-chat-widget{position:absolute;bottom:80px;left:0;width:880px;max-height:650px;background:#fff;border-radius:var(--radius-lg);box-shadow:var(--shadow-heavy);display:none;flex-direction:column;overflow:hidden;border:1px solid var(--twc-gray-dark);opacity:0;transform:translateY(20px) scale(.98);transition:opacity .3s ease,transform .3s ease;}",
        "#wisp-twc-chat-widget.active{display:flex;opacity:1;transform:translateY(0) scale(1);}",
        "#wisp-twc-chat-widget .widget-header{background:linear-gradient(135deg,var(--twc-black) 0%,#222 100%);color:#fff;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid var(--twc-gold);}",
        "#wisp-twc-chat-widget .widget-header h1{margin:0;font-size:18px;font-weight:800;color:var(--twc-gold-light);}",
        "#wisp-twc-chat-widget .close-widget{background:rgba(210,180,140,.2);border:1px solid rgba(210,180,140,.3);color:var(--twc-gold-light);font-size:18px;cursor:pointer;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:var(--transition);}",
        "#wisp-twc-chat-widget .widget-body{flex:1;overflow-y:auto;background:linear-gradient(to bottom,#fafafa 0%,#f5f5f5 100%);}",
        "#wisp-twc-chat-widget .step-row{display:flex;border-bottom:1px solid var(--twc-gray-dark);background:#fff;}",
        "#wisp-twc-chat-widget .step-header{display:flex;align-items:center;padding:18px;width:240px;background:linear-gradient(to right,var(--twc-gray) 0%,#f0f0f0 100%);border-right:1px solid var(--twc-gray-dark);font-weight:700;color:var(--twc-black);flex-shrink:0;}",
        "#wisp-twc-chat-widget .step-number{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:linear-gradient(135deg,var(--twc-gold),var(--twc-gold-dark));color:var(--twc-black);border-radius:50%;margin-right:12px;font-size:14px;font-weight:900;flex-shrink:0;}",
        "#wisp-twc-chat-widget .step-title{font-size:15px;font-weight:700;white-space:normal;line-height:1.4;}",
        "#wisp-twc-chat-widget .step-content{padding:18px;flex-grow:1;line-height:1.6;font-size:14px;color:var(--twc-text);}",
        "#wisp-twc-chat-widget .step-time{padding:18px;width:160px;display:flex;flex-direction:column;justify-content:center;align-items:center;background:var(--twc-gray);border-left:1px solid var(--twc-gray-dark);flex-shrink:0;}",
        "#wisp-twc-chat-widget .time-badge{background:linear-gradient(135deg,var(--twc-gold),var(--twc-gold-dark));color:var(--twc-black);padding:8px 14px;border-radius:20px;font-weight:700;font-size:13px;text-align:center;min-width:100px;}",
        "#wisp-twc-chat-widget .completion-status{display:flex;align-items:center;margin-top:10px;gap:10px;cursor:pointer;}",
        "#wisp-twc-chat-widget .checkbox{width:22px;height:22px;border:2px solid var(--twc-gold);border-radius:6px;display:flex;align-items:center;justify-content:center;background:#fff;}",
        "#wisp-twc-chat-widget .checkbox.checked{background:var(--twc-gold);}",
        "#wisp-twc-chat-widget .checkbox.checked:after{content:'✓';color:var(--twc-black);font-weight:900;font-size:14px;}",

        /* Mobile */
        "@media (max-width: 900px){#wisp-twc-tracker-shell{height:85vh;max-height:750px;}#wisp-twc-tracker-shell .twc-main{flex-direction:column;}#wisp-twc-tracker-shell .twc-sidebar{width:100%;border-left:none;border-top:1px solid var(--twc-gray-dark);max-height:35vh;}#wisp-twc-tracker-shell .twc-content{max-height:45vh;}#wisp-twc-chat-widget{width:95vw;max-height:75vh;}}",
        "@media (max-width: 390px){#wisp-twc-chat-root{left:10px;bottom:10px;}#wisp-twc-chat-toggle{width:48px;height:48px;font-size:17px;}#wisp-twc-chat-widget{bottom:65px;width:calc(100vw - 20px);}#wisp-twc-tracker-shell .twc-header{padding:12px 15px;min-height:60px;}#wisp-twc-tracker-shell .twc-header h2{font-size:.95rem;}#wisp-twc-tracker-shell .twc-content{padding:15px 12px;}#wisp-twc-tracker-shell .twc-sidebar{padding:15px 12px;}}",
      ])
      .join("");

    var style = document.createElement("style");
    style.id = "wisp-twc-styles";
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(style);
  }

  /* =========================
     BUILD: FIRST POPUP (Tutorial Overlay)
  ========================== */
  function WISP_TWC_buildTutorialOverlay() {
    if (document.getElementById("wisp-twc-tutorial-overlay")) return;

    var overlay = document.createElement("div");
    overlay.id = "wisp-twc-tutorial-overlay";

    var bg = document.createElement("div");
    bg.id = "wisp-twc-bg-overlay";

    var shell = document.createElement("div");
    shell.id = "wisp-twc-tracker-shell";

    var inner = document.createElement("div");
    inner.id = "twc-tracker-widget"; // keep the same ID your tracker expects

    shell.appendChild(inner);
    overlay.appendChild(bg);
    overlay.appendChild(shell);

    document.body.appendChild(overlay);
  }

  function WISP_TWC_removeTutorialOverlay() {
    WISP_TWC_safeRemove(document.getElementById("wisp-twc-tutorial-overlay"));
  }

  /* =========================
     BUILD: BOTTOM-LEFT TRACKER
  ========================== */
  function WISP_TWC_buildBottomLeftTrackerOnce() {
    if (document.getElementById("wisp-twc-chat-root")) return;

    var root = document.createElement("div");
    root.id = "wisp-twc-chat-root";

    // Widget shell
    var widget = document.createElement("div");
    widget.id = "wisp-twc-chat-widget";

    var widgetHeader = document.createElement("div");
    widgetHeader.className = "widget-header";

    var headerLeft = document.createElement("div");
    var h1 = document.createElement("h1");
    h1.textContent = "TWC New Member Success Tracker";
    headerLeft.appendChild(h1);

    var closeBtn = document.createElement("button");
    closeBtn.className = "close-widget";
    closeBtn.type = "button";
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';

    widgetHeader.appendChild(headerLeft);
    widgetHeader.appendChild(closeBtn);

    var widgetBody = document.createElement("div");
    widgetBody.className = "widget-body";

    // Body content (ported from your chat widget, with corrected Step 7 markup)
    widgetBody.innerHTML =
      '<div class="widget-container">' +
      WISP_TWC_chatStepRow(1, "Introduction and Quick Start", "5 minutes",
        '<ul><li>Watch The <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/home/posts/68bb852022feb0ae2704b09a" target="_blank" class="link">Start Here Video</a></li></ul>') +
      WISP_TWC_chatStepRow(2, "Decide On Your Product Offer", "30 minutes",
        '<p>Watch the following videos in order then follow the flow chart:</p>' +
        '<ul>' +
        '<li><a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/47f8eebb-636e-4490-ac4b-ebf7ca613286?source=communities&group_slug=the-wealth-creator" target="_blank" class="link">Digital & Affiliate Marketing 101</a></li>' +
        '<li><a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/35a97775-c30b-4a64-9932-b46e065f59c2?source=communities&group_slug=the-wealth-creator" target="_blank" class="link">Onboarding Call - Launch Your Business</a></li>' +
        '<li><a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/94a2da82-51cd-4607-a46f-dd86fa2af408?source=communities&group_slug=the-wealth-creator" target="_blank" class="link">Choose Your Path Flowchart</a></li>' +
        '</ul>') +
      WISP_TWC_chatStepRow(3, "Attend an Onboarding Call", "30 minutes",
        '<ul>' +
        '<li>Choose a day that works for you <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/events" target="_blank" class="link">LINK</a></li>' +
        '<li>If you cannot attend a live onboarding, complete self onboarding: <a href="https://www.loom.com/share/333c685b104d426a828c485b06dedd46" target="_blank" class="link">WATCH NOW</a></li>' +
        '</ul>') +
      WISP_TWC_chatStepRow(4, "Create a Social Media account and Post your FIRST Post!", "1 hour",
        '<ul>' +
        '<li>The <a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/80ef2315-2298-42b3-9635-92fe122dc05d" target="_blank" class="link">Instagram Modules</a> will show you how to create a new account and post</li>' +
        '<li>You can also access the <a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/80ef2315-2298-42b3-9635-92fe122dc05d/posts/57904857-4c4f-4f93-9cab-a2f18389d523?source=communities&group_slug=the-wealth-creator" target="_blank" class="link">2 Weeks of Content Done FOR You</a> content and use it to start posting!</li>' +
        '</ul>') +
      WISP_TWC_chatStepRow(5, "YOUR Business is Delivered", "5 minutes",
        '<p>I got my <span class="highlight">"Congrats!! Your business is ready!"</span> email with my links - <strong>now what??</strong></p>' +
        '<ul><li>Watch this <a href="https://www.loom.com/share/730a88aad18e4fe88dfd839ff85fba46" target="_blank" class="link">Next steps video HERE</a></li></ul>') +
      WISP_TWC_chatStepRow(6, "Continue Learning", "2 hours",
        '<ul>' +
        '<li>First watch The <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/learning" target="_blank" class="link">code modules</a> that apply to you</li>' +
        '<li>Then watch the <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/learning" target="_blank" class="link">wealth creator modules</a> and start learning more advanced training that apply to you and your business.</li>' +
        '</ul>') +
      WISP_TWC_chatStepRow(7, "Attend 3 Mentorship Calls", "3 hours",
        '<p>Hop on our <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/events" target="_blank" class="link">mentorship calls</a> every Tuesday and Thursday at 12 pm cst, 1 pm est. OR Watch <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/channels/Past-Coaching-Calls-8cT3N" target="_blank" class="link">Mentorship Call Recordings</a></p>' +
        '<ul><li>Mentorship Call 1</li><li>Mentorship Call 2</li><li>Mentorship Call 3</li></ul>') +
      '</div>';

    widget.appendChild(widgetHeader);
    widget.appendChild(widgetBody);

    // Toggle button
    var toggleBtn = document.createElement("button");
    toggleBtn.id = "wisp-twc-chat-toggle";
    toggleBtn.type = "button";
    toggleBtn.innerHTML =
      '<i class="fas fa-tasks"></i><span id="wisp-twc-chat-badge">!</span>';

    root.appendChild(widget);
    root.appendChild(toggleBtn);
    document.body.appendChild(root);

    // Events
    closeBtn.addEventListener("click", function () {
      widget.classList.remove("active");
      toggleBtn.classList.remove("active");
    });

    toggleBtn.addEventListener("click", function () {
      var isOpen = widget.classList.contains("active");
      if (isOpen) {
        widget.classList.remove("active");
        toggleBtn.classList.remove("active");
      } else {
        widget.classList.add("active");
        toggleBtn.classList.add("active");
      }
    });

    // Checkbox behavior (local only)
    var checkboxes = widget.querySelectorAll(".checkbox");
    for (var i = 0; i < checkboxes.length; i++) {
      checkboxes[i].addEventListener("click", function (e) {
        var step = e.target.getAttribute("data-step");
        if (!step) return;
        var key = "twcChatStep_" + step;
        var checked = localStorage.getItem(key) === "1";
        if (checked) {
          localStorage.setItem(key, "0");
          e.target.classList.remove("checked");
        } else {
          localStorage.setItem(key, "1");
          e.target.classList.add("checked");
        }
      });
    }

    // Load checkbox state
    for (var j = 0; j < checkboxes.length; j++) {
      var s = checkboxes[j].getAttribute("data-step");
      if (localStorage.getItem("twcChatStep_" + s) === "1") {
        checkboxes[j].classList.add("checked");
      }
    }
  }

  function WISP_TWC_chatStepRow(stepNum, title, timeText, html) {
    return (
      '<div class="step-row" data-step="' +
      stepNum +
      '">' +
      '<div class="step-header"><span class="step-number">' +
      stepNum +
      "</span><span class=\"step-title\">" +
      title +
      "</span></div>" +
      '<div class="step-content">' +
      html +
      "</div>" +
      '<div class="step-time">' +
      '<div class="time-badge">' +
      timeText +
      "</div>" +
      '<div class="completion-status">' +
      '<div class="checkbox" data-step="' +
      stepNum +
      '"></div>' +
      '<span class="status-label">Mark complete</span>' +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function WISP_TWC_showBottomLeftTracker() {
    WISP_TWC_buildBottomLeftTrackerOnce();
    var root = document.getElementById("wisp-twc-chat-root");
    if (root) root.style.display = "block";
  }

  function WISP_TWC_hideBottomLeftTracker() {
    var root = document.getElementById("wisp-twc-chat-root");
    if (root) root.style.display = "none";
  }

  /* =========================
     MISSION ACCOMPLISHED POPUP (from your HTML modal copy)
  ========================== */
  function WISP_TWC_showMissionAccomplished(onDone) {
    if (document.getElementById("wisp-twc-mission-modal")) return;

    var modal = document.createElement("div");
    modal.id = "wisp-twc-mission-modal";

    var content = document.createElement("div");
    content.className = "mission-content";

    content.innerHTML =
      '<div style="font-size:4rem;margin-bottom:18px;">🏆</div>' +
      '<h2 class="mission-title">Mission Accomplished!</h2>' +
      '<p class="mission-text">' +
      "You've successfully completed the Community Intro<br><br>" +
      'Your next adventure begins with the <strong style="color: var(--twc-gold-dark);">TWC New Member Success Tracker</strong> which will guide you on the exact steps you need to have your business built and start seeing results fast!' +
      "</p>" +
      '<button type="button" class="mission-btn" id="wisp-twc-mission-continue">Continue to Tracker →</button>';

    modal.appendChild(content);
    document.body.appendChild(modal);

    setTimeout(function () {
      modal.style.opacity = "1";
    }, 10);

    function finish() {
      modal.style.opacity = "0";
      setTimeout(function () {
        WISP_TWC_safeRemove(modal);
        if (typeof onDone === "function") onDone();
      }, 250);
    }

    // Continue button
    var btn = document.getElementById("wisp-twc-mission-continue");
    if (btn) btn.addEventListener("click", finish);

    // Clicking outside also proceeds (matches your HTML behavior)
    modal.addEventListener("click", function (e) {
      if (e.target === modal) finish();
    });
  }

  /* =========================
     TWCTracker (First popup)
     - derived from your HTML tracker class
     - finishJourney is overridden to call API PUT first
  ========================== */
  function WISP_TWC_TWCTracker(uid) {
    this.uid = uid;
    this.currentStep = 1;
    this.totalSteps = 7;

    this.videoProgress =
      JSON.parse(localStorage.getItem("twcVideoProgress") || "{}") || {};
    this.completedSteps =
      JSON.parse(localStorage.getItem("twcCompletedSteps") || "[]") || [];

    this.steps = [
      {
        title: "Introduction & Quick Start",
        video:
          "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ec82b156e0a73e0ee9321.mp4",
        hasVideo: true,
      },
      {
        title: "Your Investment",
        video:
          "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ec82ec7f17f7304d24b48.mp4",
        hasVideo: true,
      },
      {
        title: "Your First 48 Hours",
        video:
          "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ecd64eecbfa6d734ad1da.mp4",
        hasVideo: true,
      },
      {
        title: "TWC Community & Training",
        video:
          "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ecd70d4fb906bf95c4d1a.mp4",
        hasVideo: true,
      },
      {
        title: "Your Role VS Our Role",
        video:
          "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ed3268ec5c94bb3d29f3a.mp4",
        hasVideo: true,
      },
      {
        title: "Next Steps",
        video:
          "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ed326acaab06b41a46e1e.mp4",
        hasVideo: true,
      },
      {
        title: "Start Here",
        video:
          "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696fd50572b8e1ce031c6edc.mp4",
        hasVideo: true,
      },
    ];

    this._initProgress();
    this.render();
  }

  WISP_TWC_TWCTracker.prototype._initProgress = function () {
    for (var i = 1; i <= this.totalSteps; i++) {
      if (!this.videoProgress[i]) this.videoProgress[i] = { progress: 0 };
    }
    localStorage.setItem("twcVideoProgress", JSON.stringify(this.videoProgress));
  };

  WISP_TWC_TWCTracker.prototype._calcTotalProgress = function () {
    var total = 0;
    for (var i = 1; i <= this.totalSteps; i++) {
      total += this.videoProgress[i].progress || 0;
    }
    return Math.round(total / this.totalSteps);
  };

  WISP_TWC_TWCTracker.prototype._updateProgress = function (stepIndex0, p) {
    var stepKey = stepIndex0 + 1;
    var progress = Math.min(Math.round(p), 100);

    if (progress > (this.videoProgress[stepKey].progress || 0)) {
      this.videoProgress[stepKey].progress = progress;
      localStorage.setItem("twcVideoProgress", JSON.stringify(this.videoProgress));
      this._refreshUIOnly();
    }
  };

  WISP_TWC_TWCTracker.prototype._refreshUIOnly = function () {
    var total = this._calcTotalProgress();
    var mainBar = document.getElementById("main-bar-fill");
    var mainText = document.getElementById("main-percent-text");
    if (mainBar) mainBar.style.width = total + "%";
    if (mainText) mainText.textContent = total + "% Complete";

    for (var i = 1; i <= this.totalSteps; i++) {
      var fill = document.getElementById("step-fill-" + i);
      var percentText = document.getElementById("step-percent-" + i);
      var prog = this.videoProgress[i].progress || 0;

      if (fill) fill.style.width = prog + "%";
      if (percentText) {
        percentText.textContent = prog + "%";
        if (prog > 40) percentText.className = "step-progress-text inside-fill";
        else percentText.className = "step-progress-text";
      }
    }
  };

  WISP_TWC_TWCTracker.prototype.goToStep = function (stepNum) {
    // Lock steps until previous is 100% watched
    if (stepNum > 1) {
      var prevKey = stepNum - 1;
      var prevProg = (this.videoProgress[prevKey] && this.videoProgress[prevKey].progress) || 0;
      if (prevProg < 100) {
        return;
      }
    }

    this.currentStep = stepNum;
    this.render();

    var contentArea = document.querySelector("#wisp-twc-tracker-shell .twc-content");
    if (contentArea) contentArea.scrollTop = 0;
  };

  WISP_TWC_TWCTracker.prototype.finishJourney = function () {
    var self = this;
    var btn = document.getElementById("wisp-twc-finish-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving...";
    }

    // PUT watched ONLY here (your requirement)
    WISP_TWC_apiPutWatched(self.uid)
      .then(function (resp) {
        WISP_TWC_log("PUT watched succeded: " + String(resp && resp.succeded));
        WISP_TWC_removeTutorialOverlay();
        WISP_TWC_showMissionAccomplished(function () {
          WISP_TWC_showBottomLeftTracker();
        });
      })
      .catch(function (err) {
        WISP_TWC_log("PUT watched error: " + (err && err.message ? err.message : err));
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Finish Journey";
        }
        try {
          alert("Could not save progress. Please try again.");
        } catch (e) {}
      });
  };

  WISP_TWC_TWCTracker.prototype.render = function () {
    var container = document.getElementById("twc-tracker-widget");
    if (!container) return;

    var currentData = this.steps[this.currentStep - 1];
    var totalProgress = this._calcTotalProgress();
    var isLastStep = this.currentStep === this.totalSteps;

    var sidebarHtml = "";
    for (var i = 0; i < this.steps.length; i++) {
      var stepIndex = i + 1;
      var progress = (this.videoProgress[stepIndex] && this.videoProgress[stepIndex].progress) || 0;
      var isCurrent = this.currentStep === stepIndex;

      var isLocked = i > 0 && (((this.videoProgress[i] && this.videoProgress[i].progress) || 0) < 100);
      var clickAttr = isLocked ? "" : 'onclick="window.WISP_TWC_tracker.goToStep(' + stepIndex + ')"';

      sidebarHtml +=
        '<div class="step-card ' + (isCurrent ? "active" : "") + ' ' + (isLocked ? "locked" : "") + '" ' + clickAttr + ">" +
        '<div class="step-num">' + stepIndex + "</div>" +
        '<div style="flex:1;">' +
        '<div class="step-title">' + this.steps[i].title + "</div>" +
        '<div class="step-progress-container">' +
        '<div id="step-fill-' + stepIndex + '" class="step-progress-fill" style="width:' + progress + '%"></div>' +
        '<div id="step-percent-' + stepIndex + '" class="step-progress-text ' + (progress > 40 ? "inside-fill" : "") + '">' + progress + "%</div>" +
        "</div>" +
        "</div>" +
        "</div>";
    }

    container.innerHTML =
      '<div class="twc-header">' +
      "<h2>TWC New Member Success Tracker</h2>" +
      '<div class="progress-container">' +
      '<div class="progress-text"><span>Step ' +
      this.currentStep +
      "/" +
      this.totalSteps +
      '</span><span id="main-percent-text">' +
      totalProgress +
      "% Complete</span></div>" +
      '<div class="progress-bar-bg"><div id="main-bar-fill" class="progress-bar-fill" style="width:' +
      totalProgress +
      '%"></div></div>' +
      "</div>" +
      "</div>" +
      '<div class="twc-main">' +
      '<div class="twc-content">' +
      '<div class="content-header"><h1>' +
      currentData.title +
      "</h1></div>" +
      '<div class="video-wrapper">' +
      (currentData.hasVideo
        ? '<video id="main-video" controls playsinline src="' +
          currentData.video +
          '"></video>'
        : "") +
      "</div>" +
      "</div>" +
      '<div class="twc-sidebar">' +
      '<h4>Curriculum</h4>' +
      sidebarHtml +
      "</div>" +
      "</div>" +
      '<div class="twc-footer">' +
      '<button class="btn btn-prev" ' +
      (this.currentStep === 1 ? "disabled" : "") +
      ' onclick="window.WISP_TWC_tracker.goToStep(' +
      (this.currentStep - 1) +
      ')">Back</button>' +
      (isLastStep
        ? '<button id="wisp-twc-finish-btn" class="btn btn-complete" onclick="window.WISP_TWC_tracker.finishJourney()">Finish Journey</button>'
        : '<button class="btn btn-next" onclick="window.WISP_TWC_tracker.goToStep(' +
          (this.currentStep + 1) +
          ')">Next Step</button>') +
      "</div>";

    var video = document.getElementById("main-video");
    var self = this;
    if (video) {
      video.ontimeupdate = function () {
        if (!video.duration || isNaN(video.duration)) return;
        self._updateProgress(self.currentStep - 1, (video.currentTime / video.duration) * 100);
      };
      video.onended = function () {
        self._updateProgress(self.currentStep - 1, 100);
      };
    }

    this._refreshUIOnly();
  };

  /* =========================
     MASTER FLOW
     - Always GET contact on page load
     - Decide overlay vs tracker
  ========================== */
  function WISP_TWC_start() {
    WISP_TWC_injectFontAwesomeOnce();
    WISP_TWC_injectStylesOnce();

    var uid = WISP_TWC_getUidFromLocalStorage();
    if (!uid) {
      WISP_TWC_log("UID not found. Stopping.");
      return;
    }

    WISP_TWC_log("UID found: " + uid + " — checking watched status...");

    WISP_TWC_apiGetContact(uid)
      .then(function (resp) {
        var fieldVal = WISP_TWC_extractCustomFieldValue(resp);
        WISP_TWC_log("Custom field value: " + (fieldVal || "(empty)"));

        if (WISP_TWC_isWatched(fieldVal)) {
          // Watched => show tracker bottom-left only
          WISP_TWC_hideBottomLeftTracker(); // reset
          WISP_TWC_removeTutorialOverlay();
          WISP_TWC_showBottomLeftTracker();
          return;
        }

        // Not watched => show first tutorial popup ONLY (not closeable)
        WISP_TWC_hideBottomLeftTracker();
        WISP_TWC_buildTutorialOverlay();

        // Mount tracker
        window.WISP_TWC_tracker = new WISP_TWC_TWCTracker(uid);
      })
      .catch(function (err) {
        WISP_TWC_log("GET contact failed: " + (err && err.message ? err.message : err));
      });
  }

  // Start immediately
  try {
    WISP_TWC_start();
  } catch (e) {
    WISP_TWC_log("Fatal error: " + (e && e.message ? e.message : e));
  }

