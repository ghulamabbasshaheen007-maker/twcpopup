console.log("Script is working test 61")

/* =========================
     TWC CONFIG (edit if needed)
  ========================== */
  var TWCX_CUSTOM_FIELD_ID = "FEBOI7ZLEjFVMf5O5Yad";
  var TWCX_WATCHED_VALUE = "Watched";

  var TWCX_API_BASE = "https://services.leadconnectorhq.com";
  var TWCX_API_VERSION = "2021-07-28";
  var TWCX_BEARER_TOKEN = "pit-97180738-816d-49f8-a6fa-0f9d9b616c72";

  /* Percentage of a video that counts as "watched". Browsers rarely fire a
     timeupdate at exactly 100, so 95 plus the ended event is the reliable pair. */
  var TWCX_COMPLETE_AT = 95;

  /* Storage keys. Video tracker and checklist widget MUST stay separate. */
  var TWCX_KEY_VIDEO_PROGRESS = "twcVideoProgress";
  var TWCX_KEY_VIDEO_DONE = "twcCompletedSteps";
  var TWCX_KEY_CHECKLIST_DONE = "twcChecklistCompleted";

  /* =========================
     INTERNAL STATE
  ========================== */
  var TWCX_hasInitialized = false;
  var TWCX_trackerInstance = null;
  var TWCX_resolvedContactId = null;

  function TWCX_log(msg) {
    try {
      console.log("[TWCX]", msg);
    } catch (e) {}
  }

  /* =========================
     STORAGE HELPERS
  ========================== */
  function TWCX_readJSON(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key));
      return v == null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  function TWCX_writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      TWCX_log("write failed for " + key);
    }
  }

  function TWCX_clampPercent(n) {
    n = Math.round(Number(n) || 0);
    if (n < 0) n = 0;
    if (n > 100) n = 100;
    return n;
  }

  /* Accepts legacy shapes (plain numbers, missing keys, corrupt values) */
  function TWCX_normalizeProgress(raw, total) {
    var out = {};
    var i, v;

    if (!raw || typeof raw !== "object") raw = {};

    for (i = 1; i <= total; i++) {
      v = raw[i];
      if (typeof v === "number") out[i] = { progress: TWCX_clampPercent(v) };
      else if (v && typeof v === "object") out[i] = { progress: TWCX_clampPercent(v.progress) };
      else out[i] = { progress: 0 };
    }
    return out;
  }

  /* =========================
     CONTACT ID RESOLUTION
     Order: firebase uid -> event.contactId -> contactId inside event.token JWT
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

  function TWCX_safeParse(raw) {
    var out = raw;
    var i;
    for (i = 0; i < 3; i++) {
      if (typeof out !== "string") break;
      try {
        out = JSON.parse(out);
      } catch (e) {
        break;
      }
    }
    return out && typeof out === "object" ? out : null;
  }

  function TWCX_decodeJwtPayload(token) {
    try {
      var parts = String(token).split(".");
      if (parts.length < 2) return null;

      var b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";

      return JSON.parse(atob(b64));
    } catch (e) {
      return null;
    }
  }

  /* Reads the portal "event" object (loginSuccessful payload) */
  function TWCX_getEventObject() {
    var i, k, obj;

    try {
      obj = TWCX_safeParse(localStorage.getItem("event"));
      if (obj && (obj.contactId || obj.token)) return obj;
    } catch (e) {}

    try {
      for (i = 0; i < localStorage.length; i++) {
        k = localStorage.key(i);
        if (!k || String(k).toLowerCase().indexOf("event") === -1) continue;

        obj = TWCX_safeParse(localStorage.getItem(k));
        if (obj && (obj.contactId || obj.token)) return obj;
      }
    } catch (e) {}

    return null;
  }

  function TWCX_collectContactIdCandidates() {
    var list = [];

    function push(v) {
      v = v == null ? "" : String(v).trim();
      if (v && list.indexOf(v) === -1) list.push(v);
    }

    push(TWCX_getUidFromLocalStorage());

    var evt = TWCX_getEventObject();
    if (evt) {
      push(evt.contactId);

      var payload = evt.token ? TWCX_decodeJwtPayload(evt.token) : null;
      if (payload && payload.clientPortalMeta) {
        push(payload.clientPortalMeta.contactId);
      }
    }

    TWCX_log("candidates: " + JSON.stringify(list));
    return list;
  }

  /* Tries each candidate against the API, stops on the first real contact */
  function TWCX_resolveContact() {
    var candidates = TWCX_collectContactIdCandidates();

    if (!candidates.length) {
      return Promise.reject(new Error("No contact id found in localStorage"));
    }

    var idx = 0;

    function attempt() {
      if (idx >= candidates.length) {
        return Promise.reject(new Error("All contact id candidates failed"));
      }

      var id = candidates[idx++];

      return TWCX_apiGetContact(id)
        .then(function (resp) {
          if (!resp || !resp.contact) throw new Error("Contact not found in response");
          TWCX_resolvedContactId = id;
          TWCX_log("resolved contact id: " + id);
          return resp;
        })
        .catch(function (err) {
          TWCX_log(
            "candidate failed (" + id + "): " + (err && err.message ? err.message : err)
          );
          return attempt();
        });
    }

    return attempt();
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
  ========================== */
  function TWCX_ensureStyles() {
    if (document.getElementById("TWCX_styles")) return;

    var fontAwesomeLink = document.createElement("link");
    fontAwesomeLink.rel = "stylesheet";
    fontAwesomeLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    fontAwesomeLink.integrity = "sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==";
    fontAwesomeLink.crossOrigin = "anonymous";
    fontAwesomeLink.referrerPolicy = "no-referrer";
    (document.head || document.documentElement).appendChild(fontAwesomeLink);

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

#TWCX_overlay_root .twc-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--twc-gold), transparent);
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

#TWCX_overlay_root .progress-text span:first-child {
  color: var(--twc-gold-light);
  opacity: 0.9;
}

#TWCX_overlay_root .progress-text span:last-child {
  color: var(--twc-gold);
  font-weight: 700;
}

#TWCX_overlay_root .progress-bar-bg{
  width: 100%;
  height: 10px;
  background: rgba(255,255,255,0.1);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
}

#TWCX_overlay_root .progress-bar-fill{
  height: 100%;
  background: linear-gradient(90deg, var(--twc-gold), #e0c090);
  width: 0%;
  transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  border-radius: 6px;
  position: relative;
  box-shadow: 0 0 15px rgba(210, 180, 140, 0.3);
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
  display: flex;
  flex-direction: column;
  background: transparent;
}

#TWCX_overlay_root .content-header{ margin-bottom: 25px; padding-bottom: 18px; border-bottom: 2px solid var(--twc-gray-dark); }

#TWCX_overlay_root .content-header h1{
  font-size: 1.8rem;
  margin: 0 0 10px 0;
  font-weight: 800;
  line-height: 1.2;
  color: var(--twc-black);
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, var(--twc-black), #444);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

#TWCX_overlay_root .content-header h1::after {
  content: '';
  display: block;
  width: 60px;
  height: 4px;
  background: var(--twc-gold);
  margin-top: 15px;
  border-radius: 2px;
}

#TWCX_overlay_root .video-wrapper{
  width: 100%;
  aspect-ratio: 16/9;
  background: #000;
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: 20px;
  position: relative;
  flex-shrink: 0;
  background-image: linear-gradient(45deg, #0a0a0a, #000);
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  border: 1px solid rgba(0,0,0,0.3);
}

#TWCX_overlay_root .video-wrapper video, #TWCX_overlay_root .video-placeholder{
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  object-fit: contain;
  background: #000;
}

#TWCX_overlay_root .video-placeholder{
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--twc-gold-light);
  text-align: center;
  background: linear-gradient(135deg, #1a1a1a, #0a0a0a);
}

#TWCX_overlay_root .video-placeholder div:first-child {
  font-size: 3rem;
  margin-bottom: 15px;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}

#TWCX_overlay_root .video-placeholder h3 {
  font-size: 1.4rem;
  font-weight: 600;
  margin-top: 15px;
  color: var(--twc-gold);
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
  box-shadow: -5px 0 15px rgba(0,0,0,0.03);
}

#TWCX_overlay_root .twc-sidebar h4 {
  font-size: 0.8rem;
  color: var(--twc-text-light);
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: 700;
  position: relative;
  padding-bottom: 10px;
}

#TWCX_overlay_root .twc-sidebar h4::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 40px;
  height: 2px;
  background: var(--twc-gold);
}

/* DESKTOP STEP CARD STYLES */
#TWCX_overlay_root .step-card{
  padding: 18px;
  background: white;
  border: 1px solid var(--twc-gray-dark);
  border-radius: var(--radius-sm);
  margin-bottom: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: var(--transition);
  position: relative;
  overflow: hidden;
}

#TWCX_overlay_root .step-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: transparent;
  transition: var(--transition);
}

#TWCX_overlay_root .step-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.1);
  border-color: var(--twc-gold-light);
}

#TWCX_overlay_root .step-card:hover::before {
  background: var(--twc-gold);
}

#TWCX_overlay_root .step-card.active{
  background: linear-gradient(135deg, var(--twc-black), #2a2a2a);
  color: white;
  border-color: var(--twc-gold);
  box-shadow: 0 8px 25px rgba(0,0,0,0.2);
}

#TWCX_overlay_root .step-card.active::before {
  background: var(--twc-gold);
}

#TWCX_overlay_root .step-card.done .step-num{
  background: #27ae60;
  color: #fff;
}

#TWCX_overlay_root .step-num{
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--twc-gray);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex-shrink: 0;
  font-size: 0.9rem;
  color: var(--twc-text);
  border: 2px solid transparent;
  transition: var(--transition);
}

#TWCX_overlay_root .step-card:hover .step-num {
  background: var(--twc-gold-light);
}

#TWCX_overlay_root .active .step-num{
  background: var(--twc-gold);
  color: var(--twc-black);
  border-color: rgba(255,255,255,0.3);
  transform: scale(1.1);
}

#TWCX_overlay_root .step-title{
  font-size: 1rem;
  font-weight: 600;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  letter-spacing: -0.2px;
  line-height: 1.4;
}

#TWCX_overlay_root .active .step-title {
  font-weight: 700;
}

#TWCX_overlay_root .step-progress-container {
  position: relative;
  height: 22px;
  background: rgba(0,0,0,0.06);
  border-radius: 12px;
  margin-top: 12px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
}

#TWCX_overlay_root .step-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--twc-gold), var(--twc-gold-dark));
  width: 0%;
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(184, 155, 116, 0.3);
}

#TWCX_overlay_root .step-progress-text {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--twc-black);
  z-index: 1;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(255,255,255,0.6);
  transition: left 0.3s ease;
}

#TWCX_overlay_root .step-progress-text.inside-fill {
  left: 50%;
  transform: translate(-50%, -50%);
  text-shadow: 0 1px 2px rgba(255,255,255,0.85);
}

#TWCX_overlay_root .active .step-progress-text {
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.45);
}

#TWCX_overlay_root .active .step-progress-text.inside-fill {
  color: var(--twc-black);
  text-shadow: 0 1px 2px rgba(255,255,255,0.85);
}

#TWCX_overlay_root .active .step-progress-container {
  background: rgba(255,255,255,0.12);
}

/* FOOTER */
#TWCX_overlay_root .twc-footer{
  padding: 18px 35px;
  background: linear-gradient(to right, #fafafa, #f5f5f5);
  border-top: 1px solid var(--twc-gray-dark);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

#TWCX_overlay_root .footer-hint{
  flex: 1;
  text-align: center;
  font-size: 0.82rem;
  color: var(--twc-text-light);
  font-weight: 600;
  min-width: 160px;
}

#TWCX_overlay_root .footer-hint.ready{ color: #27ae60; }

#TWCX_overlay_root .btn{
  padding: 16px 28px;
  border-radius: var(--radius-sm);
  font-weight: 700;
  cursor: pointer;
  border: none;
  font-size: 0.95rem;
  min-width: 140px;
  display:flex;
  align-items:center;
  justify-content:center;
  touch-action: manipulation;
  transition: var(--transition);
  letter-spacing: -0.3px;
  position: relative;
  overflow: hidden;
  gap: 8px;
}

#TWCX_overlay_root .btn-prev{
  background: var(--twc-gray);
  color: var(--twc-text);
  border: 1px solid var(--twc-gray-dark);
}

#TWCX_overlay_root .btn-prev:hover:not(:disabled) {
  background: #e8e8e8;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

#TWCX_overlay_root .btn-next{
  background: linear-gradient(135deg, var(--twc-gold), var(--twc-gold-dark));
  color: var(--twc-black);
  box-shadow: 0 5px 15px rgba(210, 180, 140, 0.3);
}

#TWCX_overlay_root .btn-next:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(210, 180, 140, 0.4);
  background: linear-gradient(135deg, #d8b990, #c4a57c);
}

#TWCX_overlay_root .btn-complete{
  background: linear-gradient(135deg, #27ae60, #219955);
  color: white;
  box-shadow: 0 5px 15px rgba(39, 174, 96, 0.3);
}

#TWCX_overlay_root .btn-complete:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(39, 174, 96, 0.4);
  background: linear-gradient(135deg, #2ecc71, #27ae60);
}

#TWCX_overlay_root .btn:disabled{
  opacity: 0.45;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

/* Custom Scrollbar */
#TWCX_overlay_root .twc-content::-webkit-scrollbar,
#TWCX_overlay_root .twc-sidebar::-webkit-scrollbar { width: 8px; }

#TWCX_overlay_root .twc-content::-webkit-scrollbar-track,
#TWCX_overlay_root .twc-sidebar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

#TWCX_overlay_root .twc-content::-webkit-scrollbar-thumb,
#TWCX_overlay_root .twc-sidebar::-webkit-scrollbar-thumb {
  background: var(--twc-gold);
  border-radius: 4px;
  border: 2px solid #f1f1f1;
}

#TWCX_overlay_root .twc-content::-webkit-scrollbar-thumb:hover,
#TWCX_overlay_root .twc-sidebar::-webkit-scrollbar-thumb:hover {
  background: var(--twc-gold-dark);
}

/* Lock and error overlays */
#TWCX_overlay_root .lock-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  text-align: center;
  padding: 25px;
  z-index: 10;
  border-radius: var(--radius-sm);
}

#TWCX_overlay_root .lock-icon {
  font-size: 2.6rem;
  margin-bottom: 15px;
  color: var(--twc-gold);
}

#TWCX_overlay_root .lock-message {
  font-size: 1rem;
  max-width: 420px;
  line-height: 1.5;
}

#TWCX_overlay_root .lock-message strong { color: var(--twc-gold); font-weight: 700; }

#TWCX_overlay_root .lock-overlay .btn{
  margin-top: 20px;
  padding: 12px 22px;
  min-width: 0;
  font-size: 0.85rem;
  background: var(--twc-gold);
  color: var(--twc-black);
}

#TWCX_overlay_root .step-card.locked {
  opacity: 0.6;
  cursor: not-allowed;
}

#TWCX_overlay_root .step-card.locked:hover {
  transform: none;
  box-shadow: none;
  border-color: var(--twc-gray-dark);
}

#TWCX_overlay_root .step-card.locked:hover::before { background: transparent; }

#TWCX_overlay_root .step-card.locked .step-num {
  background: var(--twc-gray-dark);
  color: #999;
}

#TWCX_overlay_root .lock-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.7rem;
  color: #999;
  display: flex;
  align-items: center;
  gap: 4px;
}

#TWCX_overlay_root .lock-indicator i { font-size: 0.6rem; }

/* iPhone/mobile layout for overlay */
@media (max-width: 768px){
  #TWCX_overlay_root{ padding: 10px; }
  #TWCX_overlay_root .bg-overlay{ display:none; }
  #TWCX_overlay_root #twc-tracker-widget{
    height: auto;
    max-height: 90vh;
    min-height: 0;
  }
  #TWCX_overlay_root .twc-main{ flex-direction: column; }
  #TWCX_overlay_root .twc-sidebar{
    width:100%;
    border-left:none;
    border-top:1px solid var(--twc-gray-dark);
    padding: 15px;
    max-height: 22vh;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    align-items: center;
  }
  #TWCX_overlay_root .twc-sidebar h4 { display: none; }
  #TWCX_overlay_root .step-card {
    width: 55px;
    height: 55px;
    padding: 0;
    margin-bottom: 0;
    gap: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    flex-direction: column;
    position: relative;
    background: transparent;
    border: 2px solid var(--twc-gray-dark);
  }
  #TWCX_overlay_root .step-card .step-title,
  #TWCX_overlay_root .step-card .step-progress-container,
  #TWCX_overlay_root .step-card .lock-indicator,
  #TWCX_overlay_root .step-card::before { display: none !important; }
  #TWCX_overlay_root .step-num {
    width: 55px !important;
    height: 55px !important;
    font-size: 1.3rem !important;
    font-weight: 900;
    margin: 0;
    border-radius: 50%;
    position: relative;
    z-index: 2;
    background: var(--twc-gray);
    color: var(--twc-text);
    border: none;
  }
  #TWCX_overlay_root .step-card.active {
    background: transparent;
    border: 2px solid var(--twc-gold);
    box-shadow: 0 5px 15px rgba(210, 180, 140, 0.3);
  }
  #TWCX_overlay_root .step-card.active .step-num {
    background: var(--twc-gold);
    color: var(--twc-black);
    transform: scale(1.1);
  }
  #TWCX_overlay_root .twc-content{ padding: 18px 15px; max-height: 48vh; }
  #TWCX_overlay_root .twc-header{
    padding: 15px 20px;
    min-height: 70px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  #TWCX_overlay_root .twc-header h2{ font-size: 1.1rem; white-space: normal; line-height: 1.3; }
  #TWCX_overlay_root .progress-container{ width:100%; min-width: unset; padding: 10px 12px; }
  #TWCX_overlay_root .progress-text { gap: 10px; font-size: 0.8rem; }
  #TWCX_overlay_root .content-header h1 { font-size: 1.3rem; }
  #TWCX_overlay_root .content-header h1::after { margin-top: 10px; }
  #TWCX_overlay_root .video-wrapper { margin-bottom: 15px; }
  #TWCX_overlay_root .twc-footer{ padding: 14px 15px; }
  #TWCX_overlay_root .footer-hint{ order: 3; width: 100%; flex: 0 0 100%; }
  #TWCX_overlay_root .btn{
    min-width: calc(50% - 6px);
    padding: 12px 15px;
    font-size: 0.85rem;
    flex: 1;
  }
}

@media (max-width: 390px){
  #TWCX_overlay_root #twc-tracker-widget{ border-radius: 15px; }
  #TWCX_overlay_root .twc-sidebar{ max-height: 20vh; padding: 12px; gap: 8px; }
  #TWCX_overlay_root .step-card { width: 48px; height: 48px; }
  #TWCX_overlay_root .step-num { width: 48px !important; height: 48px !important; font-size: 1.2rem !important; }
  #TWCX_overlay_root .twc-header { padding: 12px 15px; min-height: 60px; }
  #TWCX_overlay_root .twc-header h2 { font-size: 0.95rem; }
  #TWCX_overlay_root .progress-container { padding: 8px 10px; }
  #TWCX_overlay_root .progress-text { font-size: 0.75rem; }
  #TWCX_overlay_root .twc-content { padding: 15px 12px; }
  #TWCX_overlay_root .content-header h1 { font-size: 1.1rem; }
  #TWCX_overlay_root .twc-footer { padding: 12px 15px; gap: 8px; }
  #TWCX_overlay_root .btn { padding: 11px 12px; font-size: 0.8rem; min-width: 0; }
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
  padding: 18px 45px;
  border-radius: var(--radius-sm);
  font-weight: 800;
  font-size: 1.1rem;
  cursor: pointer;
  margin-top: 10px;
  touch-action: manipulation;
  transition: var(--transition);
  letter-spacing: -0.3px;
  box-shadow: 0 8px 25px rgba(184, 155, 116, 0.4);
}

#TWCX_mission_modal #continueToChecklist:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 12px 35px rgba(184, 155, 116, 0.5);
}

@media (max-width: 390px){
  #TWCX_mission_modal .congratulations-modal-content{ padding: 22px; }
  #TWCX_mission_modal #continueToChecklist{ width:100%; padding: 16px 20px; }
}

/* ========= CHAT/TRACKER WIDGET ========= */
#TWCX_chat_root{
  position: fixed;
  right: max(25px, env(safe-area-inset-right));
  bottom: max(25px, env(safe-area-inset-bottom));
  z-index: 2147483645;
}

#TWCX_chat_root .chat-widget-container{ display: none; }

#TWCX_chat_root .chat-toggle-btn {
  width: 65px;
  height: 65px;
  background: linear-gradient(135deg, var(--twc-black), #222222);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--twc-gold);
  font-size: 26px;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(210, 180, 140, 0.3);
  transition: var(--transition);
  border: 2px solid var(--twc-gold);
  position: relative;
  animation: pulse-gold 2s infinite;
}

@keyframes pulse-gold {
  0% { box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(210, 180, 140, 0.3); }
  70% { box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), 0 0 0 15px rgba(210, 180, 140, 0); }
  100% { box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(210, 180, 140, 0.3); }
}

#TWCX_chat_root .chat-toggle-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4), 0 0 0 3px rgba(210, 180, 140, 0.5);
}

#TWCX_chat_root .chat-toggle-btn.active {
  background: linear-gradient(135deg, var(--twc-black), #1a1a1a);
  color: var(--twc-gold-light);
  animation: none;
}

#TWCX_chat_root .chat-toggle-btn .badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: linear-gradient(135deg, var(--twc-gold), #e0b870);
  color: var(--twc-black);
  font-size: 12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  animation: bounce 1s infinite;
  border: 2px solid var(--twc-black);
  box-shadow: 0 3px 10px rgba(0,0,0,0.2);
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

#TWCX_chat_root .tracker-widget {
  position: absolute;
  bottom: 80px;
  right: 0;
  width: 880px;
  max-width: calc(100vw - 40px);
  max-height: 650px;
  background-color: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-heavy);
  display: none;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--twc-gray-dark);
  opacity: 0;
  transform: translateY(20px) scale(0.98);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

#TWCX_chat_root .tracker-widget.active {
  display: flex;
  opacity: 1;
  transform: translateY(0) scale(1);
}

#TWCX_chat_root .widget-header {
  background: linear-gradient(135deg, var(--twc-black) 0%, #222222 100%);
  color: white;
  padding: 22px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 4px solid var(--twc-gold);
  flex-shrink: 0;
}

#TWCX_chat_root .header-content h1 {
  font-size: 22px;
  font-weight: 800;
  color: var(--twc-gold-light);
  letter-spacing: -0.5px;
  margin: 0;
}

#TWCX_chat_root .close-widget {
  background: rgba(210, 180, 140, 0.2);
  border: 1px solid rgba(210, 180, 140, 0.3);
  color: var(--twc-gold-light);
  font-size: 20px;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: var(--transition);
  flex-shrink: 0;
}

#TWCX_chat_root .close-widget:hover {
  background: rgba(210, 180, 140, 0.3);
  transform: rotate(90deg);
}

#TWCX_chat_root .widget-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0;
  background: linear-gradient(to bottom, #fafafa 0%, #f5f5f5 100%);
}

#TWCX_chat_root .widget-container { background-color: transparent; }

#TWCX_chat_root .step-row {
  display: flex;
  border-bottom: 1px solid var(--twc-gray-dark);
  background: white;
}

#TWCX_chat_root .step-row:hover { background-color: #fcfcfc; }

#TWCX_chat_root .step-header {
  display: flex;
  align-items: center;
  padding: 22px;
  width: 240px;
  background: linear-gradient(to right, var(--twc-gray) 0%, #f0f0f0 100%);
  border-right: 1px solid var(--twc-gray-dark);
  font-weight: 700;
  color: var(--twc-black);
  flex-shrink: 0;
}

#TWCX_chat_root .step-content {
  padding: 22px;
  flex-grow: 1;
  line-height: 1.7;
  font-size: 15px;
  color: var(--twc-text);
  min-width: 0;
}

#TWCX_chat_root .step-content p { margin: 0 0 8px 0; }

#TWCX_chat_root .step-time {
  padding: 22px;
  width: 170px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: var(--twc-gray);
  border-left: 1px solid var(--twc-gray-dark);
  flex-shrink: 0;
}

#TWCX_chat_root .time-badge {
  background: linear-gradient(135deg, var(--twc-gold), var(--twc-gold-dark));
  color: var(--twc-black);
  padding: 10px 18px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 14px;
  text-align: center;
  min-width: 110px;
  box-shadow: 0 4px 10px rgba(184, 155, 116, 0.2);
}

#TWCX_chat_root .time-estimate {
  margin-top: 10px;
  font-size: 13px;
  color: var(--twc-text-light);
  text-align: center;
  font-weight: 500;
}

#TWCX_chat_root .step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--twc-gold), var(--twc-gold-dark));
  color: var(--twc-black);
  border-radius: 50%;
  margin-right: 12px;
  font-size: 14px;
  font-weight: 900;
  box-shadow: 0 3px 8px rgba(184, 155, 116, 0.3);
  flex-shrink: 0;
}

#TWCX_chat_root .step-title {
  font-size: 16px;
  font-weight: 700;
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  line-height: 1.4;
}

#TWCX_chat_root ul { padding-left: 22px; margin: 12px 0 0 0; list-style: none; }

#TWCX_chat_root li {
  margin-bottom: 10px;
  position: relative;
  font-size: 15px;
  line-height: 1.6;
}

#TWCX_chat_root li::before {
  content: '•';
  color: var(--twc-gold);
  font-weight: bold;
  display: inline-block;
  width: 1em;
  margin-left: -1em;
  font-size: 1.2em;
}

#TWCX_chat_root .link {
  color: var(--twc-gold-dark);
  text-decoration: none;
  border-bottom: 1px dotted var(--twc-gold);
  transition: var(--transition);
  font-weight: 600;
  word-break: break-word;
}

#TWCX_chat_root .link:hover {
  color: var(--twc-black);
  border-bottom: 2px solid var(--twc-gold);
}

#TWCX_chat_root .highlight {
  background-color: var(--twc-gold-light);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--twc-black);
  font-weight: 600;
}

#TWCX_chat_root .note {
  background: linear-gradient(to right, var(--twc-gray) 0%, #f0f0f0 100%);
  border-left: 5px solid var(--twc-gold);
  padding: 18px 20px;
  margin: 18px 0 0 0;
  font-size: 14px;
  color: var(--twc-text);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

#TWCX_chat_root .step-separator {
  background: linear-gradient(135deg, var(--twc-black), #222222);
  color: var(--twc-gold-light);
  padding: 20px 25px;
  font-weight: 800;
  display: flex;
  align-items: center;
  font-size: 16px;
  border-left: 5px solid var(--twc-gold);
}

#TWCX_chat_root .step-separator .step-number {
  background: var(--twc-gold);
  color: var(--twc-black);
}

#TWCX_chat_root .widget-footer {
  background: linear-gradient(to right, var(--twc-gray) 0%, #f0f0f0 100%);
  padding: 25px 30px;
  text-align: center;
  border-top: 1px solid var(--twc-gray-dark);
}

#TWCX_chat_root .widget-footer > a {
  color: var(--twc-gold-dark);
  text-decoration: none;
  font-weight: 700;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: var(--transition);
  padding: 10px 20px;
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid var(--twc-gray-dark);
}

#TWCX_chat_root .widget-footer > a:hover {
  color: var(--twc-black);
  transform: translateY(-2px);
  border-color: var(--twc-gold-light);
}

#TWCX_chat_root .completion-status {
  display: flex;
  align-items: center;
  margin-top: 15px;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

#TWCX_chat_root .checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid var(--twc-gold);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
  background: white;
  flex-shrink: 0;
}

#TWCX_chat_root .checkbox:hover {
  border-color: var(--twc-gold-dark);
  transform: scale(1.1);
}

#TWCX_chat_root .checkbox.checked {
  background: var(--twc-gold);
  border-color: var(--twc-gold);
}

#TWCX_chat_root .checkbox.checked:after {
  content: "✓";
  color: var(--twc-black);
  font-weight: 900;
  font-size: 14px;
}

#TWCX_chat_root .status-label {
  font-size: 13px;
  color: var(--twc-text-light);
  font-weight: 600;
  transition: var(--transition);
}

#TWCX_chat_root .completion-status:hover .status-label { color: var(--twc-black); }

#TWCX_chat_root .progress-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
}

#TWCX_chat_root .progress-text {
  font-size: 14px;
  color: var(--twc-text-light);
  margin-bottom: 12px;
  font-weight: 600;
}

#TWCX_chat_root .progress-text span { color: var(--twc-black); font-weight: 800; }

#TWCX_chat_root .progress-bar {
  width: 250px;
  max-width: 100%;
  height: 10px;
  background-color: var(--twc-gray-dark);
  border-radius: 6px;
  overflow: hidden;
}

#TWCX_chat_root .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--twc-gold), var(--twc-gold-dark));
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  width: 0%;
  border-radius: 6px;
}

#TWCX_chat_root .widget-body::-webkit-scrollbar { width: 10px; }
#TWCX_chat_root .widget-body::-webkit-scrollbar-track { background: #f1f1f1; }
#TWCX_chat_root .widget-body::-webkit-scrollbar-thumb {
  background: var(--twc-gold);
  border-radius: 4px;
  border: 2px solid #f1f1f1;
}

@media (max-width: 900px) {
  #TWCX_chat_root .tracker-widget {
    width: 95vw;
    max-height: 80vh;
    bottom: 85px;
  }
  #TWCX_chat_root .step-row { flex-direction: column; }
  #TWCX_chat_root .step-header,
  #TWCX_chat_root .step-content,
  #TWCX_chat_root .step-time {
    width: 100%;
    padding: 18px;
  }
  #TWCX_chat_root .step-header {
    border-right: none;
    border-bottom: 1px solid var(--twc-gray-dark);
  }
  #TWCX_chat_root .step-time {
    border-left: none;
    border-top: 1px solid var(--twc-gray-dark);
    flex-direction: row;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
  }
  #TWCX_chat_root .time-estimate { margin-top: 0; font-size: 12px; }
  #TWCX_chat_root .completion-status { margin-top: 0; }
  #TWCX_chat_root .chat-toggle-btn { width: 58px; height: 58px; font-size: 22px; }
  #TWCX_chat_root .widget-header { padding: 18px 20px; }
  #TWCX_chat_root .header-content h1 { font-size: 17px; }
  #TWCX_chat_root .widget-footer { padding: 20px 15px; }
}

@media (max-width: 390px) {
  #TWCX_chat_root .chat-toggle-btn { width: 50px; height: 50px; font-size: 18px; }
  #TWCX_chat_root .tracker-widget {
    width: calc(100vw - 20px);
    max-height: 72vh;
    bottom: 68px;
  }
}
`;

    var styleEl = document.createElement("style");
    styleEl.id = "TWCX_styles";
    styleEl.type = "text/css";
    styleEl.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(styleEl);
  }

  /* =========================
     CHAT WIDGET DOM (CHECKLIST)
  ========================== */
  function TWCX_ensureChatRoot() {
    if (document.getElementById("TWCX_chat_root")) return;

    var root = document.createElement("div");
    root.id = "TWCX_chat_root";

    root.innerHTML = `
      <div class="chat-widget-container" id="chatWidgetContainer" style="display:none;">
        <div class="tracker-widget" id="trackerWidget">
            <div class="widget-header">
                <div class="header-content">
                    <h1>TWC New Member Success Tracker</h1>
                </div>
                <button class="close-widget" id="closeWidgetBtn" type="button" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="widget-body">
                <div class="widget-container">
                    <div class="step-row" data-step="1">
                        <div class="step-header">
                            <span class="step-number">1</span>
                            <span class="step-title">Introduction and Quick Start</span>
                        </div>
                        <div class="step-content">
                            <ul>
                                <li>Watch The <a href="https://www.loom.com/share/5ecaccc94eea46adb3a827804054e98a" target="_blank" rel="noopener" class="link">Start Here Video</a></li>
                            </ul>
                        </div>
                        <div class="step-time">
                            <div class="time-badge">5 minutes</div>
                            <div class="time-estimate">Estimated time</div>
                            <div class="completion-status">
                                <div class="checkbox" data-step="1" role="checkbox" tabindex="0" aria-checked="false"></div>
                                <span class="status-label">Mark complete</span>
                            </div>
                        </div>
                    </div>

                    <div class="step-row" data-step="2">
                        <div class="step-header">
                            <span class="step-number">2</span>
                            <span class="step-title">Decide On Your Product Offer</span>
                        </div>
                        <div class="step-content">
                            <p>Watch the following videos in order then follow the flow chart:</p>
                            <ul>
                                <li><a href="https://community.thewealthcreator.co/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/47f8eebb-636e-4490-ac4b-ebf7ca613286?source=communities&group_slug=the-wealth-creator" target="_blank" rel="noopener" class="link">Digital &amp; Affiliate Marketing 101</a></li>
                                <li><a href="https://community.thewealthcreator.co/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/35a97775-c30b-4a64-9932-b46e065f59c2?source=communities&group_slug=the-wealth-creator" target="_blank" rel="noopener" class="link">Onboarding Call, Launch Your Business</a></li>
                                <li><a href="https://community.thewealthcreator.co/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/94a2da82-51cd-4607-a46f-dd86fa2af408?source=communities&group_slug=the-wealth-creator" target="_blank" rel="noopener" class="link">Choose Your Path Flowchart</a></li>
                            </ul>
                        </div>
                        <div class="step-time">
                            <div class="time-badge">30 minutes</div>
                            <div class="time-estimate">Estimated time</div>
                            <div class="completion-status">
                                <div class="checkbox" data-step="2" role="checkbox" tabindex="0" aria-checked="false"></div>
                                <span class="status-label">Mark complete</span>
                            </div>
                        </div>
                    </div>

                    <div class="step-row" data-step="3">
                        <div class="step-header">
                            <span class="step-number">3</span>
                            <span class="step-title">Attend an Onboarding Call</span>
                        </div>
                        <div class="step-content">
                            <ul>
                                <li>Choose a day that works for you <a href="https://community.thewealthcreator.co/communities/groups/the-wealth-creator/events" target="_blank" rel="noopener" class="link">LINK</a></li>
                                <li>If you cannot attend a live onboarding, complete self onboarding: <a href="https://www.loom.com/share/333c685b104d426a828c485b06dedd46" target="_blank" rel="noopener" class="link">WATCH NOW</a></li>
                            </ul>
                            <div class="note">
                                <p>If you do the self onboarding, sign up for FIRM here: <a href="https://thewealthcreator.co/firm-page" target="_blank" rel="noopener" class="link">thewealthcreator.co/firm-page</a></p>
                                <p><span class="highlight">Discount code: Firmfree</span></p>
                                <p>AND complete the <a href="https://thewealthcreator.co/branding" target="_blank" rel="noopener" class="link">BRANDING FORM</a></p>
                            </div>
                        </div>
                        <div class="step-time">
                            <div class="time-badge">30 minutes</div>
                            <div class="time-estimate">Estimated time</div>
                            <div class="completion-status">
                                <div class="checkbox" data-step="3" role="checkbox" tabindex="0" aria-checked="false"></div>
                                <span class="status-label">Mark complete</span>
                            </div>
                        </div>
                    </div>

                    <div class="step-separator">
                        <span class="step-number">&rarr;</span>
                        <span>AFTER Onboarding</span>
                    </div>

                    <div class="step-row" data-step="4">
                        <div class="step-header">
                            <span class="step-number">4</span>
                            <span class="step-title">Create a Social Media account and Post your FIRST Post!</span>
                        </div>
                        <div class="step-content">
                            <ul>
                                <li>The <a href="https://community.thewealthcreator.co/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/80ef2315-2298-42b3-9635-92fe122dc05d?source=communities&group_slug=the-wealth-creator" target="_blank" rel="noopener" class="link">Instagram Modules</a> will show you how to create a new account and post</li>
                                <li>You can also access the <a href="https://community.thewealthcreator.co/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/80ef2315-2298-42b3-9635-92fe122dc05d/posts/57904857-4c4f-4f93-9cab-a2f18389d523?source=communities&group_slug=the-wealth-creator" target="_blank" rel="noopener" class="link">2 Weeks of Content Done FOR You</a> content and use it to start posting!</li>
                            </ul>
                        </div>
                        <div class="step-time">
                            <div class="time-badge">1 hour</div>
                            <div class="time-estimate">Estimated time</div>
                            <div class="completion-status">
                                <div class="checkbox" data-step="4" role="checkbox" tabindex="0" aria-checked="false"></div>
                                <span class="status-label">Mark complete</span>
                            </div>
                        </div>
                    </div>

                    <div class="step-row" data-step="5">
                        <div class="step-header">
                            <span class="step-number">5</span>
                            <span class="step-title">YOUR Business is Delivered</span>
                        </div>
                        <div class="step-content">
                            <p>I got my <span class="highlight">"Congrats!! Your business is ready!"</span> email with my links, <strong>now what??</strong></p>
                            <ul>
                                <li>Watch this <a href="https://www.loom.com/share/730a88aad18e4fe88dfd839ff85fba46" target="_blank" rel="noopener" class="link">Next steps video HERE</a></li>
                            </ul>
                            <div class="note">
                                <p>If your business is NOT delivered within 3 business days AFTER attending an Onboarding call and completing BOTH <a href="https://thewealthcreator.co/firm-page" target="_blank" rel="noopener" class="link">FIRM sign up</a> and <a href="https://thewealthcreator.co/branding" target="_blank" rel="noopener" class="link">Branding Form</a>, please email us at <a href="mailto:support@thecreatorsco.biz" class="link">support@thecreatorsco.biz</a></p>
                            </div>
                        </div>
                        <div class="step-time">
                            <div class="time-badge">5 minutes</div>
                            <div class="time-estimate">Estimated time</div>
                            <div class="completion-status">
                                <div class="checkbox" data-step="5" role="checkbox" tabindex="0" aria-checked="false"></div>
                                <span class="status-label">Mark complete</span>
                            </div>
                        </div>
                    </div>

                    <div class="step-row" data-step="6">
                        <div class="step-header">
                            <span class="step-number">6</span>
                            <span class="step-title">Continue Learning</span>
                        </div>
                        <div class="step-content">
                            <ul>
                                <li>First watch the <a href="https://community.thewealthcreator.co/communities/groups/the-wealth-creator/learning" target="_blank" rel="noopener" class="link">code modules</a> that apply to you</li>
                                <li>Then watch the <a href="https://community.thewealthcreator.co/communities/groups/the-wealth-creator/learning" target="_blank" rel="noopener" class="link">wealth creator modules</a> and start learning more advanced training that applies to you and your business.</li>
                            </ul>
                        </div>
                        <div class="step-time">
                            <div class="time-badge">2 hours</div>
                            <div class="time-estimate">Estimated time</div>
                            <div class="completion-status">
                                <div class="checkbox" data-step="6" role="checkbox" tabindex="0" aria-checked="false"></div>
                                <span class="status-label">Mark complete</span>
                            </div>
                        </div>
                    </div>

                    <div class="step-row" data-step="7">
                        <div class="step-header">
                            <span class="step-number">7</span>
                            <span class="step-title">Attend 3 Mentorship Calls</span>
                        </div>
                        <div class="step-content">
                            <p>Hop on our <a href="https://community.thewealthcreator.co/communities/groups/the-wealth-creator/events" target="_blank" rel="noopener" class="link">mentorship calls</a> every Tuesday and Thursday at 12 pm CST, 1 pm EST. OR watch <a href="https://community.thewealthcreator.co/communities/groups/the-wealth-creator/channels/Past-Coaching-Calls-8cT3N" target="_blank" rel="noopener" class="link">Mentorship Call Recordings</a></p>
                            <ul>
                                <li>Mentorship Call 1</li>
                                <li>Mentorship Call 2</li>
                                <li>Mentorship Call 3</li>
                            </ul>
                        </div>
                        <div class="step-time">
                            <div class="time-badge">3 hours</div>
                            <div class="time-estimate">Estimated time</div>
                            <div class="completion-status">
                                <div class="checkbox" data-step="7" role="checkbox" tabindex="0" aria-checked="false"></div>
                                <span class="status-label">Mark complete</span>
                            </div>
                        </div>
                    </div>

                    <div class="widget-footer">
                        <a href="mailto:support@thecreatorsco.biz">
                            <i class="fas fa-envelope"></i> Questions? support@thecreatorsco.biz
                        </a>
                        <div class="progress-container">
                            <div class="progress-text">Overall Progress: <span id="progressText">0/7</span> steps completed</div>
                            <div class="progress-bar">
                                <div class="progress-fill" id="progressBar"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <button class="chat-toggle-btn" id="chatToggleBtn" type="button" aria-label="Open success tracker">
            <i class="fas fa-tasks"></i>
            <span class="badge" id="notificationBadge" style="display: none;">!</span>
        </button>
      </div>
    `;

    document.body.appendChild(root);
  }

  /* =========================
     CHECKLIST WIDGET LOGIC
  ========================== */
  function TWCX_widgetGetCompletedSet() {
    var arr = TWCX_readJSON(TWCX_KEY_CHECKLIST_DONE, []);
    var out = {};
    var i;
    if (!(arr instanceof Array)) arr = [];
    for (i = 0; i < arr.length; i++) out[String(arr[i])] = true;
    return out;
  }

  function TWCX_widgetSaveCompletedSet(setObj) {
    var keys = [];
    var k;
    for (k in setObj) {
      if (Object.prototype.hasOwnProperty.call(setObj, k) && setObj[k]) keys.push(String(k));
    }
    keys.sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
    TWCX_writeJSON(TWCX_KEY_CHECKLIST_DONE, keys);
  }

  function TWCX_widgetCountCompleted() {
    var completed = TWCX_widgetGetCompletedSet();
    var n = 0;
    var k;
    for (k in completed) {
      if (Object.prototype.hasOwnProperty.call(completed, k) && completed[k]) n++;
    }
    return n;
  }

  function TWCX_widgetRender() {
    var root = document.getElementById("TWCX_chat_root");
    if (!root) return;

    var checkboxes = root.querySelectorAll(".checkbox[data-step]");
    var totalSteps = checkboxes.length || 7;
    var completed = TWCX_widgetGetCompletedSet();
    var completedCount = 0;
    var i, cb, step, isDone, statusLabel;

    for (i = 0; i < checkboxes.length; i++) {
      cb = checkboxes[i];
      step = String(cb.getAttribute("data-step") || "").trim();
      isDone = !!completed[step];

      if (isDone) completedCount++;

      if (isDone) cb.classList.add("checked");
      else cb.classList.remove("checked");

      cb.setAttribute("aria-checked", isDone ? "true" : "false");

      statusLabel = cb.parentNode ? cb.parentNode.querySelector(".status-label") : null;
      if (statusLabel) statusLabel.textContent = isDone ? "Completed" : "Mark complete";
    }

    var percent = totalSteps ? Math.round((completedCount / totalSteps) * 100) : 0;
    var progressBar = document.getElementById("progressBar");
    var progressText = document.getElementById("progressText");
    var badge = document.getElementById("notificationBadge");
    var widget = document.getElementById("trackerWidget");
    var isOpen = !!(widget && widget.classList.contains("active"));

    if (progressBar) progressBar.style.width = percent + "%";
    if (progressText) progressText.textContent = completedCount + "/" + totalSteps;

    if (badge) {
      badge.style.display = !isOpen && completedCount < totalSteps ? "flex" : "none";
      badge.textContent = String(totalSteps - completedCount);
    }
  }

  function TWCX_widgetToggleStep(step) {
    step = String(step || "").trim();
    if (!step) return;

    var completed = TWCX_widgetGetCompletedSet();
    completed[step] = !completed[step];
    TWCX_widgetSaveCompletedSet(completed);
    TWCX_widgetRender();
  }

  function TWCX_widgetBindOnce() {
    var widget = document.getElementById("trackerWidget");
    if (!widget || widget.__twcxBound) return;
    widget.__twcxBound = true;

    /* One delegated handler covers the checkbox and its label */
    widget.addEventListener("click", function (e) {
      var node = e.target;
      while (node && node !== widget) {
        if (node.classList && node.classList.contains("completion-status")) {
          var cb = node.querySelector(".checkbox[data-step]");
          if (cb) {
            e.preventDefault();
            TWCX_widgetToggleStep(cb.getAttribute("data-step"));
          }
          return;
        }
        node = node.parentNode;
      }
    });

    widget.addEventListener("keydown", function (e) {
      var t = e.target;
      if (!t || !t.classList || !t.classList.contains("checkbox")) return;
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        TWCX_widgetToggleStep(t.getAttribute("data-step"));
      }
    });

    window.addEventListener("storage", function (ev) {
      if (ev && ev.key === TWCX_KEY_CHECKLIST_DONE) TWCX_widgetRender();
    });
  }

  function TWCX_initChatWidgetInteractions() {
    var toggleBtn = document.getElementById("chatToggleBtn");
    var widget = document.getElementById("trackerWidget");
    var closeBtn = document.getElementById("closeWidgetBtn");

    function openWidget() {
      if (!widget || !toggleBtn) return;
      widget.classList.add("active");
      toggleBtn.classList.add("active");
      TWCX_widgetRender();
    }

    function closeWidget() {
      if (!widget || !toggleBtn) return;
      widget.classList.remove("active");
      toggleBtn.classList.remove("active");
      TWCX_widgetRender();
    }

    if (toggleBtn && widget && !toggleBtn.__twcxBound) {
      toggleBtn.__twcxBound = true;
      toggleBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (widget.classList.contains("active")) closeWidget();
        else openWidget();
      });
    }

    if (closeBtn && !closeBtn.__twcxBound) {
      closeBtn.__twcxBound = true;
      closeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        closeWidget();
      });
    }

    /* Outside click and Escape, bound exactly once for the page */
    if (!window.__twcxOutsideBound) {
      window.__twcxOutsideBound = true;

      document.addEventListener("click", function (event) {
        var w = document.getElementById("trackerWidget");
        var b = document.getElementById("chatToggleBtn");
        if (!w || !b || !w.classList.contains("active")) return;
        if (w.contains(event.target) || b.contains(event.target)) return;
        if (window.innerWidth > 900) return;
        w.classList.remove("active");
        b.classList.remove("active");
        TWCX_widgetRender();
      });

      document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        var w = document.getElementById("trackerWidget");
        var b = document.getElementById("chatToggleBtn");
        if (!w || !b || !w.classList.contains("active")) return;
        w.classList.remove("active");
        b.classList.remove("active");
        TWCX_widgetRender();
      });
    }
  }

  function TWCX_showChatWidgetOnly() {
    TWCX_ensureChatRoot();

    var container = document.getElementById("chatWidgetContainer");
    if (container) container.style.display = "block";

    TWCX_initChatWidgetInteractions();
    TWCX_widgetBindOnce();
    TWCX_widgetRender();
  }

  /* =========================
     MISSION ACCOMPLISHED MODAL
  ========================== */
  function TWCX_showMissionAccomplished(onDone) {
    var existing = document.getElementById("TWCX_mission_modal");
    if (existing) {
      try { existing.remove(); } catch (e) {}
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
      '<button id="continueToChecklist" type="button">Continue to Tracker &rarr;</button>';

    modal.appendChild(content);
    document.body.appendChild(modal);

    setTimeout(function () { modal.style.opacity = "1"; }, 10);

    function closeIt() {
      modal.style.opacity = "0";
      setTimeout(function () {
        try { modal.remove(); } catch (e) {}
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
    root.innerHTML =
      '<div class="bg-overlay"></div>' +
      '<div id="twc-tracker-widget"></div>';

    document.body.appendChild(root);
  }

  function TWCX_removeOverlayRoot() {
    var root = document.getElementById("TWCX_overlay_root");
    if (root) {
      try { root.remove(); } catch (e) {}
    }
  }

  function TWCX_escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* =========================
     MAIN VIDEO TRACKER
  ========================== */
  function TWCTracker() {
    this.totalSteps = 7;

    this.steps = [
      { title: "Introduction & Quick Start", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ec82b156e0a73e0ee9321.mp4", hasVideo: true },
      { title: "Your Investment", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ec82ec7f17f7304d24b48.mp4", hasVideo: true },
      { title: "Your First 48 Hours", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ecd64eecbfa6d734ad1da.mp4", hasVideo: true },
      { title: "TWC Community & Training", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ecd70d4fb906bf95c4d1a.mp4", hasVideo: true },
      { title: "Your Role VS Our Role", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ed3268ec5c94bb3d29f3a.mp4", hasVideo: true },
      { title: "Next Steps", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ed326acaab06b41a46e1e.mp4", hasVideo: true },
      { title: "Start Here", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696fd50572b8e1ce031c6edc.mp4", hasVideo: true }
    ];

    this.totalSteps = this.steps.length;
    this.videoProgress = TWCX_normalizeProgress(
      TWCX_readJSON(TWCX_KEY_VIDEO_PROGRESS, {}),
      this.totalSteps
    );

    /* Resume on the first step that is not finished yet */
    this.currentStep = this.firstIncompleteStep();
    this._renderedMobile = null;
    this._finishing = false;

    this.render();
    this.bindContainerOnce();
    this.bindResizeOnce();
  }

  TWCTracker.prototype.isMobile = function () {
    return window.innerWidth <= 768;
  };

  TWCTracker.prototype.progressOf = function (stepNum) {
    var s = this.videoProgress[stepNum];
    return s ? TWCX_clampPercent(s.progress) : 0;
  };

  TWCTracker.prototype.isStepComplete = function (stepNum) {
    return this.progressOf(stepNum) >= TWCX_COMPLETE_AT;
  };

  TWCTracker.prototype.firstIncompleteStep = function () {
    var i;
    for (i = 1; i <= this.totalSteps; i++) {
      if (!this.isStepComplete(i)) return i;
    }
    return this.totalSteps;
  };

  TWCTracker.prototype.isStepUnlocked = function (stepNum) {
    var i;
    if (stepNum <= 1) return true;
    for (i = 1; i < stepNum; i++) {
      if (!this.isStepComplete(i)) return false;
    }
    return true;
  };

  TWCTracker.prototype.calculateTotalProgress = function () {
    var total = 0;
    var i;
    for (i = 1; i <= this.totalSteps; i++) total += this.progressOf(i);
    return Math.round(total / this.totalSteps);
  };

  TWCTracker.prototype.allComplete = function () {
    var i;
    for (i = 1; i <= this.totalSteps; i++) {
      if (!this.isStepComplete(i)) return false;
    }
    return true;
  };

  TWCTracker.prototype.saveProgress = function () {
    TWCX_writeJSON(TWCX_KEY_VIDEO_PROGRESS, this.videoProgress);

    var done = [];
    var i;
    for (i = 1; i <= this.totalSteps; i++) {
      if (this.isStepComplete(i)) done.push(String(i));
    }
    TWCX_writeJSON(TWCX_KEY_VIDEO_DONE, done);
  };

  /* stepNum is 1 based */
  TWCTracker.prototype.updateProgress = function (stepNum, pct) {
    if (!this.videoProgress[stepNum]) this.videoProgress[stepNum] = { progress: 0 };

    var next = TWCX_clampPercent(pct);
    var current = this.progressOf(stepNum);
    if (next <= current) return;

    var wasComplete = this.isStepComplete(stepNum);
    this.videoProgress[stepNum].progress = next;
    this.saveProgress();
    this.refreshUIOnly();

    if (!wasComplete && this.isStepComplete(stepNum)) {
      TWCX_log("step " + stepNum + " complete");
    }
  };

  /* Unlocks a step without pretending the member watched it */
  TWCTracker.prototype.forceUnlockCurrent = function () {
    this.videoProgress[this.currentStep] = { progress: 100 };
    this.saveProgress();
    this.render();
  };

  TWCTracker.prototype.updateNavState = function () {
    var container = document.getElementById("twc-tracker-widget");
    if (!container) return;

    var canAdvance = this.isStepComplete(this.currentStep);
    var nextBtn = container.querySelector('[data-twcx-action="next"]');
    var finishBtn = container.querySelector('[data-twcx-action="finish"]');
    var hint = container.querySelector(".footer-hint");

    if (nextBtn) nextBtn.disabled = !canAdvance;
    if (finishBtn) finishBtn.disabled = !this.allComplete() || this._finishing;

    if (hint) {
      if (this._finishing) {
        hint.textContent = "Saving your progress...";
        hint.className = "footer-hint";
      } else if (canAdvance) {
        hint.textContent =
          this.currentStep === this.totalSteps
            ? "All videos watched. Finish to unlock your tracker."
            : "Step complete. You can move on.";
        hint.className = "footer-hint ready";
      } else {
        hint.textContent = "Watch this video to unlock the next step";
        hint.className = "footer-hint";
      }
    }
  };

  TWCTracker.prototype.refreshUIOnly = function () {
    var container = document.getElementById("twc-tracker-widget");
    if (!container) return;

    var total = this.calculateTotalProgress();
    var mainBar = document.getElementById("main-bar-fill");
    var mainText = document.getElementById("main-percent-text");

    if (mainBar) mainBar.style.width = total + "%";
    if (mainText) mainText.textContent = total + "% Complete";

    var i, fill, txt, card, progress;
    for (i = 1; i <= this.totalSteps; i++) {
      progress = this.progressOf(i);

      fill = document.getElementById("step-fill-" + i);
      if (fill) fill.style.width = progress + "%";

      txt = document.getElementById("step-percent-" + i);
      if (txt) {
        txt.textContent = progress + "%";
        if (progress > 40) txt.classList.add("inside-fill");
        else txt.classList.remove("inside-fill");
      }

      card = container.querySelector('.step-card[data-step="' + i + '"]');
      if (card) {
        if (this.isStepUnlocked(i)) card.classList.remove("locked");
        else card.classList.add("locked");

        if (this.isStepComplete(i)) card.classList.add("done");
        else card.classList.remove("done");
      }
    }

    this.updateNavState();
  };

  TWCTracker.prototype.goToStep = function (stepNum) {
    stepNum = parseInt(stepNum, 10);
    if (isNaN(stepNum) || stepNum < 1 || stepNum > this.totalSteps) return;
    if (stepNum === this.currentStep) return;

    if (!this.isStepUnlocked(stepNum)) {
      this.showLockMessage(stepNum);
      return;
    }

    this.currentStep = stepNum;
    this.render();

    var contentArea = document.querySelector("#twc-tracker-widget .twc-content");
    if (contentArea) contentArea.scrollTop = 0;
  };

  TWCTracker.prototype.showLockMessage = function (stepNum) {
    var container = document.getElementById("twc-tracker-widget");
    if (!container) return;

    var wrapper = container.querySelector(".video-wrapper");
    if (!wrapper) return;

    var existing = wrapper.querySelector(".lock-overlay");
    if (existing) {
      try { existing.remove(); } catch (e) {}
    }

    /* First step that still blocks the way */
    var blocking = 1;
    var i;
    for (i = 1; i < stepNum; i++) {
      if (!this.isStepComplete(i)) { blocking = i; break; }
    }

    var overlay = document.createElement("div");
    overlay.className = "lock-overlay";
    overlay.innerHTML =
      '<div class="lock-icon">🔒</div>' +
      '<div class="lock-message"><strong>Finish step ' + blocking + " first</strong><br><br>" +
      "Watch that video through to the end and step " + stepNum + " unlocks automatically.</div>";

    wrapper.appendChild(overlay);

    setTimeout(function () {
      if (overlay && overlay.parentNode) {
        try { overlay.remove(); } catch (e) {}
      }
    }, 3200);
  };

  TWCTracker.prototype.showVideoError = function () {
    var container = document.getElementById("twc-tracker-widget");
    if (!container) return;

    var wrapper = container.querySelector(".video-wrapper");
    if (!wrapper || wrapper.querySelector(".lock-overlay")) return;

    var overlay = document.createElement("div");
    overlay.className = "lock-overlay";
    overlay.innerHTML =
      '<div class="lock-icon">⚠️</div>' +
      '<div class="lock-message"><strong>This video could not load</strong><br><br>' +
      "Check your connection and reload. If it keeps failing you can skip ahead so you are not stuck.</div>" +
      '<button class="btn" type="button" data-twcx-action="skip">Continue anyway</button>';

    wrapper.appendChild(overlay);
    TWCX_log("video failed to load on step " + this.currentStep);
  };

  TWCTracker.prototype.finishJourney = function (btn) {
    if (this._finishing) return;

    var uid = TWCX_resolvedContactId || TWCX_getUidFromLocalStorage();
    if (!uid) {
      TWCX_log("No contact id available at finishJourney. Aborting.");
      return;
    }

    var self = this;
    this._finishing = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving...";
    }
    this.updateNavState();

    TWCX_log("Finish Journey clicked -> setting Watched for " + uid);

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
        self._finishing = false;
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Finish Journey";
        }
        self.updateNavState();
      });
  };

  /* Delegated handler. Survives every innerHTML swap because it lives on the
     container, not on the buttons. No inline onclick, so it also works when the
     script is wrapped in a module or IIFE by the host page. */
  TWCTracker.prototype.bindContainerOnce = function () {
    var container = document.getElementById("twc-tracker-widget");
    if (!container || container.__twcxBound) return;
    container.__twcxBound = true;

    var self = this;

    container.addEventListener("click", function (e) {
      var node = e.target;
      var action = null;

      while (node && node !== container) {
        if (node.getAttribute) {
          action = node.getAttribute("data-twcx-action");
          if (action) break;
        }
        node = node.parentNode;
      }

      if (!action || !node) return;
      if (node.disabled) return;
      if (node.classList && node.classList.contains("locked")) {
        self.showLockMessage(parseInt(node.getAttribute("data-step"), 10) || self.currentStep + 1);
        return;
      }

      if (action === "goto") self.goToStep(node.getAttribute("data-step"));
      else if (action === "next") self.goToStep(self.currentStep + 1);
      else if (action === "prev") self.goToStep(self.currentStep - 1);
      else if (action === "finish") self.finishJourney(node);
      else if (action === "skip") self.forceUnlockCurrent();
    });
  };

  TWCTracker.prototype.bindResizeOnce = function () {
    if (window.__twcxResizeBound) return;
    window.__twcxResizeBound = true;

    var self = this;
    var t = null;

    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (self.isMobile() !== self._renderedMobile) self.render();
      }, 200);
    });
  };

  TWCTracker.prototype.render = function () {
    var container = document.getElementById("twc-tracker-widget");
    if (!container) return;

    var self = this;
    var current = this.steps[this.currentStep - 1];
    var totalProgress = this.calculateTotalProgress();
    var isLastStep = this.currentStep === this.totalSteps;
    var isMobile = this.isMobile();

    this._renderedMobile = isMobile;

    var html = "";

    html +=
      '<div class="twc-header">' +
        "<h2>TWC New Member Success Tracker</h2>" +
        '<div class="progress-container">' +
          '<div class="progress-text">' +
            "<span>Step " + this.currentStep + "/" + this.totalSteps + "</span>" +
            '<span id="main-percent-text">' + totalProgress + "% Complete</span>" +
          "</div>" +
          '<div class="progress-bar-bg">' +
            '<div id="main-bar-fill" class="progress-bar-fill" style="width:' + totalProgress + '%"></div>' +
          "</div>" +
        "</div>" +
      "</div>";

    html +=
      '<div class="twc-main">' +
        '<div class="twc-content">' +
          '<div class="content-header"><h1>' + TWCX_escapeHtml(current.title) + "</h1></div>" +
          '<div class="video-wrapper">' +
          (current.hasVideo
            ? '<video id="main-video" controls playsinline webkit-playsinline preload="metadata" src="' +
              TWCX_escapeHtml(current.video) + '"></video>'
            : '<div class="video-placeholder"><div>✅</div><h3>Ready to Complete</h3></div>') +
          "</div>" +
        "</div>";

    html += '<div class="twc-sidebar">';
    if (!isMobile) html += "<h4>Curriculum</h4>";

    var i, progress, locked, isCurrent, done;
    for (i = 1; i <= this.totalSteps; i++) {
      progress = this.progressOf(i);
      locked = !this.isStepUnlocked(i);
      isCurrent = this.currentStep === i;
      done = this.isStepComplete(i);

      html +=
        '<div class="step-card' +
        (isCurrent ? " active" : "") +
        (locked ? " locked" : "") +
        (done ? " done" : "") +
        '" data-twcx-action="goto" data-step="' + i + '" role="button" tabindex="0">';

      if (locked && !isMobile) {
        html += '<div class="lock-indicator"><i class="fas fa-lock"></i></div>';
      }

      html += '<div class="step-num">' + i + "</div>";

      if (!isMobile) {
        html +=
          '<div style="flex:1; min-width:0;">' +
            '<div class="step-title">' + TWCX_escapeHtml(this.steps[i - 1].title) + "</div>" +
            '<div class="step-progress-container">' +
              '<div id="step-fill-' + i + '" class="step-progress-fill" style="width:' + progress + '%"></div>' +
              '<div id="step-percent-' + i + '" class="step-progress-text' +
              (progress > 40 ? " inside-fill" : "") + '">' + progress + "%</div>" +
            "</div>" +
          "</div>";
      }

      html += "</div>";
    }

    html += "</div></div>";

    var canAdvance = this.isStepComplete(this.currentStep);

    html +=
      '<div class="twc-footer">' +
        '<button class="btn btn-prev" type="button" data-twcx-action="prev"' +
        (this.currentStep === 1 ? " disabled" : "") + ">Back</button>" +
        '<div class="footer-hint"></div>' +
        (isLastStep
          ? '<button class="btn btn-complete" type="button" data-twcx-action="finish"' +
            (this.allComplete() ? "" : " disabled") + ">Finish Journey</button>"
          : '<button class="btn btn-next" type="button" data-twcx-action="next"' +
            (canAdvance ? "" : " disabled") + ">Next Step</button>") +
      "</div>";

    container.innerHTML = html;

    /* Keyboard access on the sidebar cards */
    var cards = container.querySelectorAll(".step-card");
    for (i = 0; i < cards.length; i++) {
      cards[i].addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          self.goToStep(this.getAttribute("data-step"));
        }
      });
    }

    var video = document.getElementById("main-video");
    var stepAtRender = this.currentStep;

    if (video) {
      video.addEventListener("timeupdate", function () {
        if (!video.duration || !isFinite(video.duration)) return;
        self.updateProgress(stepAtRender, (video.currentTime / video.duration) * 100);
      });

      video.addEventListener("ended", function () {
        self.updateProgress(stepAtRender, 100);
      });

      video.addEventListener("error", function () {
        self.showVideoError();
      });
    } else if (!current.hasVideo) {
      this.updateProgress(stepAtRender, 100);
    }

    this.updateNavState();
  };

  /* =========================
     INIT FLOW
  ========================== */
  function TWCX_init() {
    if (TWCX_hasInitialized) return;
    TWCX_hasInitialized = true;

    TWCX_ensureStyles();
    TWCX_ensureChatRoot();

    TWCX_resolveContact()
      .then(function (resp) {
        var watched = TWCX_isWatched(TWCX_getCustomFieldValue(resp));

        if (watched) {
          TWCX_log("Watched = true -> show tracker widget bottom right only.");
          TWCX_showChatWidgetOnly();
          return;
        }

        TWCX_log("Watched = false -> show onboarding popup.");
        TWCX_createOverlayRootIfMissing();

        TWCX_trackerInstance = new TWCTracker();
        window.TWCX_tracker = TWCX_trackerInstance;
        window.TWCX_trackerInstance = TWCX_trackerInstance;
      })
      .catch(function (err) {
        TWCX_log("Resolve error: " + (err && err.message ? err.message : err));
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      try { TWCX_init(); } catch (e) {
        TWCX_log("Init crashed: " + (e && e.message ? e.message : e));
      }
    });
  } else {
    try { TWCX_init(); } catch (e) {
      TWCX_log("Init crashed: " + (e && e.message ? e.message : e));
    }
  }
