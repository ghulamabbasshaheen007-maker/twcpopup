

  /* =========================
     TWC CONFIG (edit if needed)
  ========================== */
  var TWCX_CUSTOM_FIELD_ID = "pMR80x1BrnpsGE0ULX6e";
  var TWCX_WATCHED_VALUE = "Watched";

  var TWCX_API_BASE = "https://services.leadconnectorhq.com";
  var TWCX_API_VERSION = "2021-07-28";
  var TWCX_BEARER_TOKEN = "pit-7a2aa063-5698-4490-a39c-d167acbeb4e4";

  /* =========================
     INTERNAL STATE
  ========================== */
  var TWCX_hasInitialized = false;
  var TWCX_trackerInstance = null;

  function TWCX_log(msg) {
    try {
      console.log("[TWCX]", msg);
    } catch (e) {}
  }

  /* =========================
     UID FETCH (localStorage)
  ========================== */
  function TWCX_getUidFromLocalStorage() {
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
     API CALLS
  ========================== */
  function TWCX_apiGetContact(uid) {
    return fetch(TWCX_API_BASE + "/contacts/" + encodeURIComponent(uid), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Version: TWCX_API_VERSION,
        Authorization: "Bearer " + TWCX_BEARER_TOKEN,
      },
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error(
            "GET failed: " + res.status + " " + String(t || "").slice(0, 180)
          );
        });
      }
      return res.json();
    });
  }

  function TWCX_apiPutWatched(uid) {
    return fetch(TWCX_API_BASE + "/contacts/" + encodeURIComponent(uid), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Version: TWCX_API_VERSION,
        Authorization: "Bearer " + TWCX_BEARER_TOKEN,
      },
      body: JSON.stringify({
        customFields: [
          {
            id: TWCX_CUSTOM_FIELD_ID,
            field_value: TWCX_WATCHED_VALUE,
          },
        ],
      }),
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error(
            "PUT failed: " + res.status + " " + String(t || "").slice(0, 180)
          );
        });
      }
      return res.json();
    });
  }

  function TWCX_getCustomFieldValue(contactResp) {
    var fields =
      (contactResp &&
        contactResp.contact &&
        contactResp.contact.customFields) ||
      [];
    var i, f;

    for (i = 0; i < fields.length; i++) {
      f = fields[i];
      if (String(f.id) === String(TWCX_CUSTOM_FIELD_ID)) {
        return f.value == null ? "" : String(f.value).trim();
      }
    }
    return "";
  }

  function TWCX_isWatched(val) {
    return (
      String(val || "").trim().toLowerCase() ===
      String(TWCX_WATCHED_VALUE).trim().toLowerCase()
    );
  }

  /* =========================
     STYLE INJECTION (SCOPED)
     - Keeps your exact UI structure
     - Fixes iPhone footer/button visibility
  ========================== */
  function TWCX_ensureStyles() {
    if (document.getElementById("TWCX_styles")) return;

    var css = `
/* ========= TWCX SCOPED ROOTS ========= */
#TWCX_overlay_root, #TWCX_chat_root { font-family: 'Inter','Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif; }
#TWCX_overlay_root * , #TWCX_chat_root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

:root {
  --twc-gold: #d2b48c;
  --twc-gold-dark: #b89b74;
  --twc-gold-light: #e8d8c0;
  --twc-black: #1a1a1a;
  --twc-white: #ffffff;
  --twc-gray: #f8f8f8;
  --twc-gray-dark: #e8e8e8;
  --twc-text: #2c2c2c;
  --twc-text-light: #666666;
  --shadow: 0 15px 35px rgba(0,0,0,0.1), 0 5px 15px rgba(0,0,0,0.07);
  --shadow-heavy: 0 20px 50px rgba(0,0,0,0.15), 0 10px 25px rgba(0,0,0,0.1);
  --radius: 18px;
  --radius-sm: 14px;
  --radius-lg: 24px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ========= OVERLAY (FIRST POPUP) ========= */
#TWCX_overlay_root{
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  padding-left: max(15px, env(safe-area-inset-left));
  padding-right: max(15px, env(safe-area-inset-right));
  padding-top: max(15px, env(safe-area-inset-top));
  padding-bottom: max(15px, env(safe-area-inset-bottom));
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

#TWCX_overlay_root .bg-overlay{
  position: fixed;
  inset: 0;
  background-image: url('https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/694b465f147f516b70fc6e85.jpg');
  background-size: cover;
  background-position: center;
  filter: brightness(0.25) blur(6px);
  opacity: 0.9;
  z-index: 1;
  transform: scale(1.02);
}

#TWCX_overlay_root #twc-tracker-widget{
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1200px;
  height: min(90vh, 850px);
  max-height: 850px;
  background: var(--twc-white);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-heavy);
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(210, 180, 140, 0.15);
}

/* HEADER */
#TWCX_overlay_root .twc-header{
  background: linear-gradient(135deg, var(--twc-black) 0%, #222222 100%);
  color: white;
  padding: 22px 35px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 4px solid var(--twc-gold);
  flex-shrink: 0;
  min-height: 85px;
  position: relative;
  overflow: hidden;
}
#TWCX_overlay_root .twc-header h2{
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--twc-gold-light);
  letter-spacing: -0.5px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
}
#TWCX_overlay_root .twc-header h2::before{ content: '🏆'; font-size: 1.3rem; }
#TWCX_overlay_root .progress-container{
  min-width: 200px;
  background: rgba(255,255,255,0.05);
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(210, 180, 140, 0.2);
}
#TWCX_overlay_root .progress-text{
  font-size: 0.9rem;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  gap: 20px;
}
#TWCX_overlay_root .progress-bar-bg{
  width: 100%;
  height: 10px;
  background: rgba(255,255,255,0.1);
  border-radius: 6px;
  overflow: hidden;
}
#TWCX_overlay_root .progress-bar-fill{
  height: 100%;
  background: linear-gradient(90deg, var(--twc-gold), #e0c090);
  width: 0%;
  transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  border-radius: 6px;
}

/* MAIN */
#TWCX_overlay_root .twc-main{
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
  background: linear-gradient(to right, #ffffff 0%, #fcfcfc 100%);
}
#TWCX_overlay_root .twc-content{
  flex: 1;
  padding: 30px;
  overflow-y: auto;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
}
#TWCX_overlay_root .content-header{ margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid var(--twc-gray-dark); }
#TWCX_overlay_root .content-header h1{
  font-size: 1.8rem;
  margin: 0 0 10px 0;
  font-weight: 800;
  line-height: 1.2;
  color: var(--twc-black);
}
#TWCX_overlay_root .video-wrapper{
  width: 100%;
  aspect-ratio: 16/9;
  background: #000;
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: 30px;
  position: relative;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}
#TWCX_overlay_root .video-wrapper video{
  position:absolute; inset:0;
  width:100%; height:100%;
  object-fit: cover;
}
#TWCX_overlay_root .instruction-card{
  background: linear-gradient(to right, var(--twc-gray) 0%, #f0f0f0 100%);
  border-left: 5px solid var(--twc-gold);
  padding: 25px;
  border-radius: var(--radius-sm);
}

/* SIDEBAR */
#TWCX_overlay_root .twc-sidebar{
  width: 380px;
  background: linear-gradient(to bottom, #fafafa 0%, #f5f5f5 100%);
  border-left: 1px solid var(--twc-gray-dark);
  padding: 30px;
  overflow-y: auto;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
}
#TWCX_overlay_root .step-card{
  padding: 18px;
  background: #fff;
  border: 1px solid var(--twc-gray-dark);
  border-radius: var(--radius-sm);
  margin-bottom: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 15px;
}
#TWCX_overlay_root .step-card.active{
  background: linear-gradient(135deg, var(--twc-black), #2a2a2a);
  color: #fff;
  border-color: var(--twc-gold);
}
#TWCX_overlay_root .step-num{
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--twc-gray);
  display:flex; align-items:center; justify-content:center;
  font-weight:800; font-size:0.9rem;
}
#TWCX_overlay_root .step-card.active .step-num{ background: var(--twc-gold); color: var(--twc-black); }
#TWCX_overlay_root .step-title{ font-size: 1rem; font-weight: 600; line-height: 1.4; }

/* FOOTER (buttons) - critical */
#TWCX_overlay_root .twc-footer{
  padding: 20px 35px;
  background: linear-gradient(to right, #fafafa, #f5f5f5);
  border-top: 1px solid var(--twc-gray-dark);
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
}
#TWCX_overlay_root .btn{
  padding: 16px 28px;
  border-radius: var(--radius-sm);
  font-weight: 700;
  cursor: pointer;
  border: none;
  font-size: 0.95rem;
  min-width: 140px;
  display:flex; align-items:center; justify-content:center;
  touch-action: manipulation;
}
#TWCX_overlay_root .btn:disabled{ opacity:0.4; cursor:not-allowed; }
#TWCX_overlay_root .btn-prev{
  background: var(--twc-gray);
  color: var(--twc-text);
  border: 1px solid var(--twc-gray-dark);
}
#TWCX_overlay_root .btn-next{
  background: linear-gradient(135deg, var(--twc-gold), var(--twc-gold-dark));
  color: var(--twc-black);
}
#TWCX_overlay_root .btn-complete{
  background: linear-gradient(135deg, #27ae60, #219955);
  color: #fff;
}

/* iPhone/mobile layout */
@media (max-width: 768px){
  #TWCX_overlay_root{ padding: 10px; }
  #TWCX_overlay_root .bg-overlay{ display:none; }
  #TWCX_overlay_root #twc-tracker-widget{
    height: auto;
    max-height: 85vh;
    min-height: 600px;
  }
  #TWCX_overlay_root .twc-main{ flex-direction: column; }
  #TWCX_overlay_root .twc-sidebar{
    width:100%;
    border-left:none;
    border-top:1px solid var(--twc-gray-dark);
    padding: 20px 15px;
    max-height: 35vh;
  }
  #TWCX_overlay_root .twc-content{
    padding: 20px 15px;
    max-height: 45vh;
  }
  #TWCX_overlay_root .twc-header{
    padding: 15px 20px;
    min-height: 70px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  #TWCX_overlay_root .twc-header h2{ font-size: 1.1rem; }
  #TWCX_overlay_root .progress-container{ width:100%; min-width: unset; }
  #TWCX_overlay_root .twc-footer{
    padding: 15px;
    flex-wrap: wrap;
  }
  #TWCX_overlay_root .btn{
    min-width: calc(50% - 6px);
    padding: 12px 15px;
    font-size: 0.85rem;
    flex: 1;
  }
  #TWCX_overlay_root .btn-complete{
    width: 100%;
    min-width: 100%;
  }
}
@media (max-width: 390px){
  #TWCX_overlay_root #twc-tracker-widget{ max-height: 85vh; border-radius: 15px; }
  #TWCX_overlay_root .twc-content{ max-height: 45vh; }
  #TWCX_overlay_root .twc-sidebar{ max-height: 30vh; }
}

/* ========= MISSION ACCOMPLISHED MODAL ========= */
#TWCX_mission_modal{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index: 2147483647;
  opacity: 0;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(10px);
  padding: 20px;
  padding-left: max(15px, env(safe-area-inset-left));
  padding-right: max(15px, env(safe-area-inset-right));
  padding-top: max(15px, env(safe-area-inset-top));
  padding-bottom: max(15px, env(safe-area-inset-bottom));
}
#TWCX_mission_modal .congratulations-modal-content{
  background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
  padding: 40px;
  border-radius: var(--radius-lg);
  max-width: 550px;
  width: 92%;
  text-align:center;
  box-shadow: var(--shadow-heavy);
  border: 3px solid var(--twc-gold);
}
#TWCX_mission_modal #continueToChecklist{
  background: linear-gradient(135deg, var(--twc-gold), var(--twc-gold-dark));
  color: var(--twc-black);
  border: none;
  padding: 16px 40px;
  border-radius: var(--radius-sm);
  font-weight: 800;
  font-size: 1.1rem;
  cursor: pointer;
  margin-top: 10px;
  touch-action: manipulation;
}
@media (max-width: 390px){
  #TWCX_mission_modal .congratulations-modal-content{ padding: 22px; }
  #TWCX_mission_modal #continueToChecklist{ width:100%; }
}

/* ========= CHAT/TRACKER WIDGET (BOTTOM LEFT) ========= */
#TWCX_chat_root{
  position: fixed;
  left: max(15px, env(safe-area-inset-left));
  bottom: max(15px, env(safe-area-inset-bottom));
  z-index: 2147483645;
}
#TWCX_chat_root .chat-widget-container{
  display: none;
}
#TWCX_chat_root .chat-toggle-btn{
  width: 65px;
  height: 65px;
  background: linear-gradient(135deg, var(--twc-black), #222222);
  border-radius: 50%;
  display:flex;
  align-items:center;
  justify-content:center;
  color: var(--twc-gold);
  font-size: 22px;
  cursor: pointer;
  border: 2px solid var(--twc-gold);
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  touch-action: manipulation;
}
#TWCX_chat_root .tracker-widget{
  position: absolute;
  left: 0;
  bottom: 80px;
  width: min(880px, calc(100vw - 30px));
  max-height: 70vh;
  background: #fff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-heavy);
  display: none;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--twc-gray-dark);
}
#TWCX_chat_root .tracker-widget.active{ display:flex; }
#TWCX_chat_root .widget-header{
  background: linear-gradient(135deg, var(--twc-black) 0%, #222222 100%);
  color: white;
  padding: 18px 20px;
  display:flex;
  justify-content: space-between;
  align-items:center;
  border-bottom: 4px solid var(--twc-gold);
}
#TWCX_chat_root .close-widget{
  background: rgba(210, 180, 140, 0.2);
  border: 1px solid rgba(210, 180, 140, 0.3);
  color: var(--twc-gold-light);
  font-size: 18px;
  cursor: pointer;
  width: 38px;
  height: 38px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius: 50%;
  touch-action: manipulation;
}
#TWCX_chat_root .widget-body{ overflow-y:auto; -webkit-overflow-scrolling: touch; background: #fafafa; }
#TWCX_chat_root .step-row{ display:flex; border-bottom: 1px solid var(--twc-gray-dark); background:#fff; }
#TWCX_chat_root .step-header{ width: 240px; padding: 18px; background: var(--twc-gray); font-weight:700; }
#TWCX_chat_root .step-content{ padding: 18px; flex:1; font-size: 14px; line-height: 1.6; }
#TWCX_chat_root .step-time{ width: 160px; padding: 18px; background: var(--twc-gray); border-left: 1px solid var(--twc-gray-dark); }
#TWCX_chat_root .time-badge{ background: linear-gradient(135deg, var(--twc-gold), var(--twc-gold-dark)); padding: 8px 14px; border-radius: 20px; font-weight:700; text-align:center; }
#TWCX_chat_root .completion-status{ display:flex; align-items:center; gap:10px; margin-top: 12px; }
#TWCX_chat_root .checkbox{ width: 22px; height: 22px; border:2px solid var(--twc-gold); border-radius: 6px; cursor:pointer; display:flex; align-items:center; justify-content:center; }

/* ===== WIDGET FIXES (ONLY) ===== */
#TWCX_chat_root .checkbox{
  pointer-events: auto;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}
#TWCX_chat_root .completion-status{ pointer-events: auto; }
#TWCX_chat_root .checkbox.checked{ background: var(--twc-gold); }
#TWCX_chat_root .checkbox.checked:after{ content:"✓"; font-weight:900; color: var(--twc-black); }
/* Progress UI (injected by JS; these styles are safe even if missing) */
#TWCX_chat_root .widget-progress{
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255,255,255,0.85);
  font-weight: 700;
}
#TWCX_chat_root .widget-progress-bar-bg{
  margin-top: 8px;
  width: 180px;
  height: 8px;
  background: rgba(255,255,255,0.12);
  border-radius: 6px;
  overflow: hidden;
}
#TWCX_chat_root .widget-progress-bar-fill{
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, var(--twc-gold), var(--twc-gold-dark));
  transition: width 0.35s ease;
}

@media (max-width: 900px){
  #TWCX_chat_root .tracker-widget{ width: calc(100vw - 30px); max-height: 75vh; }
  #TWCX_chat_root .step-row{ flex-direction: column; }
  #TWCX_chat_root .step-header, #TWCX_chat_root .step-content, #TWCX_chat_root .step-time{ width:100%; border-left:none; }
  #TWCX_chat_root .widget-progress-bar-bg{ width: 140px; }
}
`;

    var styleEl = document.createElement("style");
    styleEl.id = "TWCX_styles";
    styleEl.type = "text/css";
    styleEl.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(styleEl);
  }

  /* =========================
     CHAT WIDGET DOM (bottom-left)
     - Always created once
  ========================== */
  function TWCX_ensureChatRoot() {
    if (document.getElementById("TWCX_chat_root")) return;

    var root = document.createElement("div");
    root.id = "TWCX_chat_root";

    root.innerHTML = `
      <div class="chat-widget-container" id="chatWidgetContainer" style="display:none;">
        <div class="tracker-widget" id="trackerWidget">
          <div class="widget-header">
            <div class="header-content" id="twcxWidgetHeaderContent">
              <h1 style="margin:0;font-size:16px;font-weight:800;color:var(--twc-gold-light);">TWC New Member Success Tracker</h1>
            </div>
            <button class="close-widget" id="closeWidgetBtn" type="button">×</button>
          </div>
          <div class="widget-body">
            <div class="widget-container">
              <div class="step-row" data-step="1">
                <div class="step-header"><span class="step-number">1</span> <span class="step-title">Introduction and Quick Start</span></div>
                <div class="step-content">
                  <ul style="margin:0;padding-left:18px;">
                    <li>Watch The <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/home/posts/68bb852022feb0ae2704b09a" target="_blank" rel="noopener" class="link">Start Here Video</a></li>
                  </ul>
                </div>
                <div class="step-time">
                  <div class="time-badge">5 minutes</div>
                  <div class="completion-status"><div class="checkbox" data-step="1" role="button" tabindex="0" aria-label="Toggle step 1 completion"></div><span class="status-label">Mark complete</span></div>
                </div>
              </div>

              <div class="step-row" data-step="2">
                <div class="step-header"><span class="step-number">2</span> <span class="step-title">Decide On Your Product Offer</span></div>
                <div class="step-content">
                  <p style="margin:0 0 8px 0;">Watch the following videos in order then follow the flow chart:</p>
                  <ul style="margin:0;padding-left:18px;">
                    <li><a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/47f8eebb-636e-4490-ac4b-ebf7ca613286?source=communities&group_slug=the-wealth-creator" target="_blank" rel="noopener" class="link">Digital & Affiliate Marketing 101</a></li>
                    <li><a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/35a97775-c30b-4a64-9932-b46e065f59c2?source=communities&group_slug=the-wealth-creator" target="_blank" rel="noopener" class="link">Onboarding Call - Launch Your Business</a></li>
                    <li><a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/94a2da82-51cd-4607-a46f-dd86fa2af408?source=communities&group_slug=the-wealth-creator" target="_blank" rel="noopener" class="link">Choose Your Path Flowchart</a></li>
                  </ul>
                </div>
                <div class="step-time">
                  <div class="time-badge">30 minutes</div>
                  <div class="completion-status"><div class="checkbox" data-step="2" role="button" tabindex="0" aria-label="Toggle step 2 completion"></div><span class="status-label">Mark complete</span></div>
                </div>
              </div>

              <div class="step-row" data-step="3">
                <div class="step-header"><span class="step-number">3</span> <span class="step-title">Attend an Onboarding Call</span></div>
                <div class="step-content">
                  <ul style="margin:0;padding-left:18px;">
                    <li>Choose a day that works for you <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/events" target="_blank" rel="noopener" class="link">LINK</a></li>
                    <li>If you cannot attend a live onboarding, complete self onboarding: <a href="https://www.loom.com/share/333c685b104d426a828c485b06dedd46" target="_blank" rel="noopener" class="link">WATCH NOW</a></li>
                  </ul>
                </div>
                <div class="step-time">
                  <div class="time-badge">30 minutes</div>
                  <div class="completion-status"><div class="checkbox" data-step="3" role="button" tabindex="0" aria-label="Toggle step 3 completion"></div><span class="status-label">Mark complete</span></div>
                </div>
              </div>

              <div class="step-row" data-step="4">
                <div class="step-header"><span class="step-number">4</span> <span class="step-title">Create a Social Media account and Post your FIRST Post!</span></div>
                <div class="step-content">
                  <ul style="margin:0;padding-left:18px;">
                    <li>The <a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/80ef2315-2298-42b3-9635-92fe122dc05d" target="_blank" rel="noopener" class="link">Instagram Modules</a> will show you how to create a new account and post</li>
                  </ul>
                </div>
                <div class="step-time">
                  <div class="time-badge">1 hour</div>
                  <div class="completion-status"><div class="checkbox" data-step="4" role="button" tabindex="0" aria-label="Toggle step 4 completion"></div><span class="status-label">Mark complete</span></div>
                </div>
              </div>

              <div class="step-row" data-step="5">
                <div class="step-header"><span class="step-number">5</span> <span class="step-title">YOUR Business is Delivered</span></div>
                <div class="step-content">
                  <ul style="margin:0;padding-left:18px;">
                    <li>Watch this <a href="https://www.loom.com/share/730a88aad18e4fe88dfd839ff85fba46" target="_blank" rel="noopener" class="link">Next steps video HERE</a></li>
                  </ul>
                </div>
                <div class="step-time">
                  <div class="time-badge">5 minutes</div>
                  <div class="completion-status"><div class="checkbox" data-step="5" role="button" tabindex="0" aria-label="Toggle step 5 completion"></div><span class="status-label">Mark complete</span></div>
                </div>
              </div>

              <div class="step-row" data-step="6">
                <div class="step-header"><span class="step-number">6</span> <span class="step-title">Continue Learning</span></div>
                <div class="step-content">
                  <ul style="margin:0;padding-left:18px;">
                    <li>First watch The <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/learning" target="_blank" rel="noopener" class="link">code modules</a> that apply to you</li>
                  </ul>
                </div>
                <div class="step-time">
                  <div class="time-badge">2 hours</div>
                  <div class="completion-status"><div class="checkbox" data-step="6" role="button" tabindex="0" aria-label="Toggle step 6 completion"></div><span class="status-label">Mark complete</span></div>
                </div>
              </div>

              <div class="step-row" data-step="7">
                <div class="step-header"><span class="step-number">7</span> <span class="step-title">Attend 3 Mentorship Calls</span></div>
                <div class="step-content">
                  <p style="margin:0;">Hop on our <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/events" target="_blank" rel="noopener" class="link">mentorship calls</a> every Tuesday and Thursday.</p>
                </div>
                <div class="step-time">
                  <div class="time-badge">3 hours</div>
                  <div class="completion-status"><div class="checkbox" data-step="7" role="button" tabindex="0" aria-label="Toggle step 7 completion"></div><span class="status-label">Mark complete</span></div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <button class="chat-toggle-btn" id="chatToggleBtn" type="button" aria-label="Open tracker">≡</button>
      </div>
    `;

    document.body.appendChild(root);
  }

  /* =========================
     WIDGET FIX HELPERS (WIDGET ONLY)
  ========================== */
  function TWCX_widgetGetCompletedSet() {
    var arr;
    try {
      arr = JSON.parse(localStorage.getItem("twcCompletedSteps")) || [];
    } catch (e) {
      arr = [];
    }
    // normalize to strings
    var out = {};
    for (var i = 0; i < arr.length; i++) out[String(arr[i])] = true;
    return out;
  }

  function TWCX_widgetSaveCompletedSet(setObj) {
    var keys = [];
    for (var k in setObj) {
      if (Object.prototype.hasOwnProperty.call(setObj, k) && setObj[k]) keys.push(String(k));
    }
    // keep stable order
    keys.sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
    localStorage.setItem("twcCompletedSteps", JSON.stringify(keys));
  }

  function TWCX_widgetRender() {
    var root = document.getElementById("TWCX_chat_root");
    if (!root) return;

    var widget = document.getElementById("trackerWidget");
    if (!widget) return;

    var checkboxes = widget.querySelectorAll('.checkbox[data-step]');
    var totalSteps = checkboxes.length || 7;

    var completed = TWCX_widgetGetCompletedSet();
    var completedCount = 0;

    for (var i = 0; i < checkboxes.length; i++) {
      var cb = checkboxes[i];
      var step = String(cb.getAttribute("data-step") || "").trim();
      var isDone = !!completed[step];

      if (isDone) completedCount++;

      if (isDone) cb.classList.add("checked");
      else cb.classList.remove("checked");

      // update label text beside checkbox
      var statusLabel = cb.parentNode ? cb.parentNode.querySelector(".status-label") : null;
      if (statusLabel) statusLabel.textContent = isDone ? "Completed" : "Mark complete";
    }

    var percent = totalSteps ? Math.round((completedCount / totalSteps) * 100) : 0;

    // Inject progress UI into widget header (widget-only)
    var headerContent = document.getElementById("twcxWidgetHeaderContent") || widget.querySelector(".header-content");
    if (headerContent && !headerContent.querySelector("#twcxWidgetProgressWrap")) {
      var wrap = document.createElement("div");
      wrap.id = "twcxWidgetProgressWrap";
      wrap.innerHTML =
        '<div class="widget-progress" id="twcxWidgetProgressText">Progress: 0/0 (0%)</div>' +
        '<div class="widget-progress-bar-bg"><div class="widget-progress-bar-fill" id="twcxWidgetProgressFill"></div></div>';
      headerContent.appendChild(wrap);
    }

    var progText = document.getElementById("twcxWidgetProgressText");
    var progFill = document.getElementById("twcxWidgetProgressFill");
    if (progText) progText.textContent = "Progress: " + completedCount + "/" + totalSteps + " (" + percent + "%)";
    if (progFill) progFill.style.width = percent + "%";
  }

  function TWCX_widgetBindCheckboxesOnce() {
    var widget = document.getElementById("trackerWidget");
    if (!widget || widget.__twcxCheckboxBound) return;
    widget.__twcxCheckboxBound = true;

    // Click + keyboard toggle
    widget.addEventListener("click", function (e) {
      var target = e.target;
      if (!target) return;

      // allow clicking on checkbox only (no interference with links)
      if (target.classList && target.classList.contains("checkbox")) {
        e.preventDefault();
        e.stopPropagation();

        var step = String(target.getAttribute("data-step") || "").trim();
        if (!step) return;

        var completed = TWCX_widgetGetCompletedSet();
        completed[step] = !completed[step];
        TWCX_widgetSaveCompletedSet(completed);
        TWCX_widgetRender();
      }
    }, true);

    widget.addEventListener("keydown", function (e) {
      var target = e.target;
      if (!target || !target.classList || !target.classList.contains("checkbox")) return;

      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        e.stopPropagation();

        var step = String(target.getAttribute("data-step") || "").trim();
        if (!step) return;

        var completed = TWCX_widgetGetCompletedSet();
        completed[step] = !completed[step];
        TWCX_widgetSaveCompletedSet(completed);
        TWCX_widgetRender();
      }
    }, true);

    // If progress changes from the main popup (video ended), re-render widget
    window.addEventListener("storage", function (ev) {
      if (ev && (ev.key === "twcCompletedSteps" || ev.key === "twcVideoProgress")) {
        TWCX_widgetRender();
      }
    });
  }

  function TWCX_showChatWidgetOnly() {
    TWCX_ensureChatRoot();

    var container = document.getElementById("chatWidgetContainer");
    if (container) container.style.display = "block";

    // Wire minimal open/close
    var toggleBtn = document.getElementById("chatToggleBtn");
    var widget = document.getElementById("trackerWidget");
    var closeBtn = document.getElementById("closeWidgetBtn");

    if (toggleBtn && widget && !toggleBtn.__twcxBound) {
      toggleBtn.__twcxBound = true;
      toggleBtn.addEventListener("click", function () {
        widget.classList.toggle("active");
        // render when opened (ensures correct progress display)
        if (widget.classList.contains("active")) TWCX_widgetRender();
      });
    }
    if (closeBtn && widget && !closeBtn.__twcxBound) {
      closeBtn.__twcxBound = true;
      closeBtn.addEventListener("click", function () {
        widget.classList.remove("active");
      });
    }

    // ===== WIDGET FIX: bind + render =====
    TWCX_widgetBindCheckboxesOnce();
    TWCX_widgetRender();
  }

  /* =========================
     MISSION ACCOMPLISHED MODAL
     (from your HTML finishJourney)
  ========================== */
  function TWCX_showMissionAccomplished(onDone) {
    var existing = document.getElementById("TWCX_mission_modal");
    if (existing) {
      try {
        existing.remove();
      } catch (e) {}
    }

    var modal = document.createElement("div");
    modal.id = "TWCX_mission_modal";

    var content = document.createElement("div");
    content.className = "congratulations-modal-content";
    content.innerHTML =
      '<div style="font-size:4rem;margin-bottom:25px;">🏆</div>' +
      '<h2 style="color:var(--twc-black);margin:0 0 20px 0;font-size:1.8rem;font-weight:800;letter-spacing:-0.5px;">Mission Accomplished!</h2>' +
      '<p style="color:var(--twc-text);margin:0 0 30px 0;line-height:1.7;font-size:1.1rem;">' +
      "You've successfully completed the Community Intro<br><br>" +
      'Your next adventure begins with the <strong style="color: var(--twc-gold-dark);">TWC New Member Success Tracker</strong> which will guide you on the exact steps you need to have your business built and start seeing results fast!' +
      "</p>" +
      '<button id="continueToChecklist" type="button">Continue to Tracker →</button>';

    modal.appendChild(content);
    document.body.appendChild(modal);

    setTimeout(function () {
      modal.style.opacity = "1";
    }, 10);

    function closeIt() {
      modal.style.opacity = "0";
      setTimeout(function () {
        try {
          modal.remove();
        } catch (e) {}
        if (typeof onDone === "function") onDone();
      }, 300);
    }

    var btn = content.querySelector("#continueToChecklist");
    if (btn) btn.addEventListener("click", closeIt);

    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeIt();
    });
  }

  /* =========================
     OVERLAY ROOT (FIRST POPUP)
  ========================== */
  function TWCX_createOverlayRootIfMissing() {
    if (document.getElementById("TWCX_overlay_root")) return;

    var root = document.createElement("div");
    root.id = "TWCX_overlay_root";

    root.innerHTML = `
      <div class="bg-overlay"></div>
      <div id="twc-tracker-widget"></div>
    `;

    document.body.appendChild(root);
  }

  function TWCX_removeOverlayRoot() {
    var root = document.getElementById("TWCX_overlay_root");
    if (root) {
      try {
        root.remove();
      } catch (e) {}
    }
  }

  /* =========================
     MAIN TRACKER CLASS (from your HTML)
     - Same popup structure
     - Finish Journey calls API then shows Mission Accomplished
  ========================== */
  function TWCTracker() {
    this.currentStep = 1;
    this.totalSteps = 7;
    this.videoProgress = JSON.parse(localStorage.getItem("twcVideoProgress")) || {};
    this.completedSteps = new Set(
      JSON.parse(localStorage.getItem("twcCompletedSteps")) || []
    );

    this.steps = [
      { title: "Introduction & Quick Start", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ec82b156e0a73e0ee9321.mp4", hasVideo: true },
      { title: "Your Investment", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ec82ec7f17f7304d24b48.mp4", hasVideo: true },
      { title: "Your First 48 Hours", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ecd64eecbfa6d734ad1da.mp4", hasVideo: true },
      { title: "TWC Community & Training", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ecd70d4fb906bf95c4d1a.mp4", hasVideo: true },
      { title: "Your Role VS Our Role", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ed3268ec5c94bb3d29f3a.mp4", hasVideo: true },
      { title: "Next Steps", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ed326acaab06b41a46e1e.mp4", hasVideo: true },
      { title: "Start Here", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696fd50572b8e1ce031c6edc.mp4", hasVideo: true },
    ];

    this.initializeProgress();
    this.render();
  }

  TWCTracker.prototype.initializeProgress = function () {
    var i;
    for (i = 1; i <= this.totalSteps; i++) {
      if (!this.videoProgress[i]) this.videoProgress[i] = { progress: 0 };
    }
  };

  TWCTracker.prototype.calculateTotalProgress = function () {
    var total = 0;
    var i;
    for (i = 1; i <= this.totalSteps; i++) {
      total += this.videoProgress[i].progress || 0;
    }
    return Math.round(total / this.totalSteps);
  };

  TWCTracker.prototype.updateProgress = function (stepIndex, p) {
    var stepKey = stepIndex + 1;
    var progress = Math.min(Math.round(p), 100);

    if (progress > (this.videoProgress[stepKey].progress || 0)) {
      this.videoProgress[stepKey].progress = progress;
      localStorage.setItem("twcVideoProgress", JSON.stringify(this.videoProgress));

      if (progress === 100) {
        this.completedSteps.add(String(stepKey));
        localStorage.setItem(
          "twcCompletedSteps",
          JSON.stringify(Array.from(this.completedSteps))
        );
      }

      this.refreshUIOnly();

      // WIDGET ONLY: if widget exists, re-render progress/checkmarks
      try { TWCX_widgetRender(); } catch (e) {}
    }
  };

  TWCTracker.prototype.refreshUIOnly = function () {
    var total = this.calculateTotalProgress();

    var mainBar = document.getElementById("main-bar-fill");
    var mainText = document.getElementById("main-percent-text");
    if (mainBar) mainBar.style.width = total + "%";
    if (mainText) mainText.textContent = total + "% Complete";
  };

  TWCTracker.prototype.goToStep = function (stepNum) {
    if (stepNum > 1) {
      var prevStepKey = stepNum - 1;
      var prevStepProgress = (this.videoProgress[prevStepKey] || {}).progress || 0;
      if (prevStepProgress < 100) {
        this.showLockMessage(stepNum);
        return;
      }
    }
    this.currentStep = stepNum;
    this.render();
  };

  TWCTracker.prototype.showLockMessage = function (stepNum) {
    var existingLock = document.querySelector("#twc-tracker-widget .lock-overlay");
    if (existingLock) {
      try { existingLock.remove(); } catch (e) {}
    }

    var videoWrapper = document.querySelector("#twc-tracker-widget .video-wrapper");
    if (!videoWrapper) return;

    var lockOverlay = document.createElement("div");
    lockOverlay.className = "lock-overlay";
    lockOverlay.innerHTML =
      '<div class="lock-icon">🔒</div>' +
      '<div class="lock-message"><strong>Complete Step ' +
      (stepNum - 1) +
      " first!</strong><br><br>Please watch the previous video completely (100%) before moving to Step " +
      stepNum +
      ".</div>";

    videoWrapper.appendChild(lockOverlay);

    setTimeout(function () {
      if (lockOverlay && lockOverlay.parentNode) {
        try { lockOverlay.remove(); } catch (e) {}
      }
    }, 3000);
  };

  TWCTracker.prototype.finishJourney = function () {
    var uid = TWCX_getUidFromLocalStorage();
    if (!uid) {
      TWCX_log("No UID found at finishJourney. Aborting.");
      return;
    }

    TWCX_log("Finish Journey clicked -> setting Watched via API...");

    TWCX_apiPutWatched(uid)
      .then(function () {
        TWCX_log("Watched set successfully.");
        TWCX_showMissionAccomplished(function () {
          TWCX_removeOverlayRoot();
          TWCX_showChatWidgetOnly();
        });
      })
      .catch(function (err) {
        TWCX_log("PUT error: " + (err && err.message ? err.message : err));
      });
  };

  TWCTracker.prototype.render = function () {
    var container = document.getElementById("twc-tracker-widget");
    if (!container) return;

    var currentData = this.steps[this.currentStep - 1];
    var totalProgress = this.calculateTotalProgress();
    var isLastStep = this.currentStep === this.totalSteps;

    var html =
      '<div class="twc-header">' +
      "<h2>TWC New Member Success Tracker</h2>" +
      '<div class="progress-container">' +
      '<div class="progress-text">' +
      "<span>Step " +
      this.currentStep +
      "/" +
      this.totalSteps +
      '</span><span id="main-percent-text">' +
      totalProgress +
      "% Complete</span>" +
      "</div>" +
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
        ? '<video id="main-video" controls playsinline webkit-playsinline src="' +
          currentData.video +
          '"></video>'
        : '<div class="video-placeholder"><div style="font-size:2.5rem;">✅</div><h3 style="margin-top:10px;">Ready to Complete</h3></div>') +
      "</div>" +
      '<div class="instruction-card" style="visibility:hidden;">' +
      '<h4 style="margin:0 0 8px 0; font-size:0.9rem;">Next Step:</h4>' +
      '<p style="margin:0; color:var(--twc-text-light); font-size:0.85rem;">Watch the video above and follow the roadmap to unlock your full potential.</p>' +
      "</div>" +
      "</div>" +
      '<div class="twc-sidebar">' +
      '<h4 style="font-size:0.75rem; color:#999; margin:0 0 15px 0; text-transform:uppercase; letter-spacing:0.5px;">Curriculum</h4>';

    var i;
    for (i = 0; i < this.steps.length; i++) {
      var progress = (this.videoProgress[i + 1] || {}).progress || 0;
      var isLocked = i > 0 && (((this.videoProgress[i] || {}).progress || 0) < 100);
      var isCurrent = this.currentStep === i + 1;

      html +=
        '<div class="step-card ' +
        (isCurrent ? "active " : "") +
        (isLocked ? "locked" : "") +
        '" ' +
        (isLocked ? "" : 'data-step="' + (i + 1) + '"') +
        ">" +
        '<div class="step-num">' +
        (i + 1) +
        "</div>" +
        '<div style="flex:1; overflow:hidden;">' +
        '<div class="step-title">' +
        this.steps[i].title +
        "</div>" +
        '<div style="margin-top:10px;height:10px;background:rgba(0,0,0,0.06);border-radius:6px;overflow:hidden;">' +
        '<div style="height:100%;width:' +
        progress +
        '%;background:linear-gradient(90deg,var(--twc-gold),var(--twc-gold-dark));"></div>' +
        "</div>" +
        '<div style="margin-top:6px;font-size:12px;color:var(--twc-text-light);font-weight:600;">' +
        progress +
        "%</div>" +
        "</div>" +
        "</div>";
    }

    html +=
      "</div>" +
      "</div>" +
      '<div class="twc-footer">' +
      '<button class="btn btn-prev" type="button" ' +
      (this.currentStep === 1 ? "disabled" : "") +
      ' id="twcBtnBack">Back</button>' +
      (isLastStep
        ? '<button class="btn btn-complete" type="button" id="twcBtnFinish">Finish Journey</button>'
        : '<button class="btn btn-next" type="button" id="twcBtnNext">Next Step</button>') +
      "</div>";

    container.innerHTML = html;

    var cards = container.querySelectorAll(".step-card[data-step]");
    var self = this;
    for (i = 0; i < cards.length; i++) {
      cards[i].addEventListener("click", function () {
        var s = parseInt(this.getAttribute("data-step"), 10);
        if (!isNaN(s)) self.goToStep(s);
      });
    }

    var backBtn = document.getElementById("twcBtnBack");
    if (backBtn) {
      backBtn.addEventListener("click", function () {
        self.goToStep(self.currentStep - 1);
      });
    }

    var nextBtn = document.getElementById("twcBtnNext");
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        self.goToStep(self.currentStep + 1);
      });
    }

    var finishBtn = document.getElementById("twcBtnFinish");
    if (finishBtn) {
      finishBtn.addEventListener("click", function () {
        self.finishJourney();
      });
    }

    var video = document.getElementById("main-video");
    if (video) {
      video.ontimeupdate = function () {
        if (!video.duration) return;
        self.updateProgress(self.currentStep - 1, (video.currentTime / video.duration) * 100);
      };
      video.onended = function () {
        self.updateProgress(self.currentStep - 1, 100);
      };
    } else if (!currentData.hasVideo) {
      self.updateProgress(self.currentStep - 1, 100);
    }
  };

  /* =========================
     INIT FLOW
     - On load: GET contact -> decide UI
  ========================== */
  function TWCX_init() {
    if (TWCX_hasInitialized) return;
    TWCX_hasInitialized = true;

    TWCX_ensureStyles();
    TWCX_ensureChatRoot();

    var uid = TWCX_getUidFromLocalStorage();
    if (!uid) {
      TWCX_log("UID not found. Script will not show onboarding.");
      return;
    }

    TWCX_log("UID found: " + uid + " -> checking Watched status via API...");

    TWCX_apiGetContact(uid)
      .then(function (resp) {
        var fieldVal = TWCX_getCustomFieldValue(resp);
        var watched = TWCX_isWatched(fieldVal);

        if (watched) {
          TWCX_log("Watched = true -> show tracker widget bottom-left only.");
          TWCX_showChatWidgetOnly();
          return;
        }

        TWCX_log("Watched = false -> show onboarding popup.");
        TWCX_createOverlayRootIfMissing();

        TWCX_trackerInstance = new TWCTracker();
        window.TWCX_tracker = TWCX_trackerInstance;
      })
      .catch(function (err) {
        TWCX_log("GET error: " + (err && err.message ? err.message : err));
      });
  }

  try {
    TWCX_init();
  } catch (e) {
    TWCX_log("Init crashed: " + (e && e.message ? e.message : e));
  }
