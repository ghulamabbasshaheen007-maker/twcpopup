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
     - Enhanced with your widget styles
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

#TWCX_overlay_root .content-header{ margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid var(--twc-gray-dark); }

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
  margin-bottom: 30px;
  position: relative;
  flex-shrink: 0;
  background-image: linear-gradient(45deg, #0a0a0a, #000);
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  border: 1px solid rgba(0,0,0,0.3);
  transition: var(--transition);
}

#TWCX_overlay_root .video-wrapper:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 40px rgba(0,0,0,0.3);
}

#TWCX_overlay_root .video-wrapper video, #TWCX_overlay_root .video-placeholder{
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  object-fit: cover;
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

#TWCX_overlay_root .instruction-card{
  background: linear-gradient(to right, var(--twc-gray) 0%, #f0f0f0 100%);
  border-left: 5px solid var(--twc-gold);
  padding: 25px;
  border-radius: var(--radius-sm);
  margin-bottom: 25px;
  visibility: hidden;
  box-shadow: 0 5px 15px rgba(0,0,0,0.05);
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

/* FIXED CIRCLE SHAPE */
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
  position: relative;
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
  text-shadow: 0 1px 2px rgba(255,255,255,0.5);
}

#TWCX_overlay_root .step-progress-text.inside-fill {
  color: var(--twc-black);
  text-align: center;
  width: 100%;
  left: 0;
  text-shadow: 0 1px 2px rgba(255,255,255,0.8);
}

#TWCX_overlay_root .active .step-progress-text {
  color: rgba(255,255,255,0.95);
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

#TWCX_overlay_root .active .step-progress-container {
  background: rgba(255,255,255,0.12);
}

/* FOOTER */
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

#TWCX_overlay_root .btn::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 5px;
  background: rgba(255, 255, 255, 0.5);
  opacity: 0;
  border-radius: 100%;
  transform: scale(1, 1) translate(-50%);
  transform-origin: 50% 50%;
}

#TWCX_overlay_root .btn:focus:not(:active)::after {
  animation: ripple 1s ease-out;
}

@keyframes ripple {
  0% {
    transform: scale(0, 0);
    opacity: 0.5;
  }
  100% {
    transform: scale(40, 40);
    opacity: 0;
  }
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

#TWCX_overlay_root .btn-complete:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(39, 174, 96, 0.4);
  background: linear-gradient(135deg, #2ecc71, #27ae60);
}

#TWCX_overlay_root .btn:disabled{
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

/* Custom Scrollbar */
#TWCX_overlay_root .twc-content::-webkit-scrollbar,
#TWCX_overlay_root .twc-sidebar::-webkit-scrollbar {
  width: 8px;
}

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

/* Lock overlay style */
#TWCX_overlay_root .lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  text-align: center;
  padding: 30px;
  z-index: 10;
  border-radius: var(--radius-sm);
}

#TWCX_overlay_root .lock-icon {
  font-size: 3rem;
  margin-bottom: 20px;
  color: var(--twc-gold);
  filter: drop-shadow(0 5px 15px rgba(0,0,0,0.3));
}

#TWCX_overlay_root .lock-message {
  font-size: 1.1rem;
  margin-bottom: 25px;
  max-width: 400px;
  line-height: 1.5;
}

#TWCX_overlay_root .lock-message strong {
  color: var(--twc-gold);
  font-weight: 700;
}

#TWCX_overlay_root .step-card.locked {
  opacity: 0.6;
  cursor: not-allowed;
  position: relative;
}

#TWCX_overlay_root .step-card.locked:hover {
  transform: none;
  box-shadow: none;
  border-color: var(--twc-gray-dark);
}

#TWCX_overlay_root .step-card.locked:hover::before {
  background: transparent;
}

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

/* iPhone/mobile layout for overlay */
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
    padding: 15px;
    max-height: 25vh;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    align-items: center;
  }
  /* Hide sidebar header on mobile */
  #TWCX_overlay_root .twc-sidebar h4 {
    display: none;
  }
  /* STEP CARDS - NUMBER ONLY STYLES */
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
  /* Hide titles and progress bars on mobile */
  #TWCX_overlay_root .step-card .step-title,
  #TWCX_overlay_root .step-card .step-progress-container,
  #TWCX_overlay_root .step-card .lock-indicator,
  #TWCX_overlay_root .step-card::before {
    display: none !important;
  }
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
  #TWCX_overlay_root .twc-header h2{ font-size: 1.1rem; white-space: normal; line-height: 1.3; }
  #TWCX_overlay_root .progress-container{ width:100%; min-width: unset; padding: 10px 12px; }
  #TWCX_overlay_root .progress-text { gap: 10px; font-size: 0.8rem; }
  #TWCX_overlay_root .content-header h1 { font-size: 1.3rem; margin-bottom: 15px; line-height: 1.3; }
  #TWCX_overlay_root .video-wrapper { margin-bottom: 20px; aspect-ratio: 16/9; max-height: 25vh; }
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
    margin-top: 5px;
  }
}

@media (max-width: 390px){
  #TWCX_overlay_root #twc-tracker-widget{ max-height: 85vh; border-radius: 15px; }
  #TWCX_overlay_root .twc-content{ max-height: 45vh; }
  #TWCX_overlay_root .twc-sidebar{ max-height: 22vh; padding: 12px; gap: 8px; }
  #TWCX_overlay_root .step-card { width: 48px; height: 48px; }
  #TWCX_overlay_root .step-num { width: 48px !important; height: 48px !important; font-size: 1.2rem !important; }
  #TWCX_overlay_root .twc-header { padding: 12px 15px; min-height: 60px; }
  #TWCX_overlay_root .twc-header h2 { font-size: 0.95rem; }
  #TWCX_overlay_root .progress-container { padding: 8px 10px; }
  #TWCX_overlay_root .progress-text { font-size: 0.75rem; }
  #TWCX_overlay_root .twc-content { padding: 15px 12px; }
  #TWCX_overlay_root .content-header h1 { font-size: 1.1rem; }
  #TWCX_overlay_root .video-wrapper { max-height: 25vh; margin-bottom: 15px; }
  #TWCX_overlay_root .twc-footer { padding: 12px 15px; gap: 6px; }
  #TWCX_overlay_root .btn { padding: 10px 12px; font-size: 0.8rem; min-width: 0; }
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

/* ========= CHAT/TRACKER WIDGET (ENHANCED) ========= */
#TWCX_chat_root{
  position: fixed;
  right: max(25px, env(safe-area-inset-right));
  bottom: max(25px, env(safe-area-inset-bottom));
  z-index: 2147483645;
}

#TWCX_chat_root .chat-widget-container{
  display: none;
}

/* Chat Toggle Button */
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
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4), 0 0 0 3px rgba(210, 180, 140, 0.5);
  background: linear-gradient(135deg, var(--twc-black), #1a1a1a);
}

#TWCX_chat_root .chat-toggle-btn.active {
  background: linear-gradient(135deg, var(--twc-black), #1a1a1a);
  color: var(--twc-gold-light);
  transform: rotate(45deg);
}

#TWCX_chat_root .chat-toggle-btn.active:hover {
  transform: rotate(45deg) scale(1.1);
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

/* Success Tracker Widget (Chat Window Style) */
#TWCX_chat_root .tracker-widget {
  position: absolute;
  bottom: 80px;
  right: 0;
  width: 880px;
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
  animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Widget Header */
#TWCX_chat_root .widget-header {
  background: linear-gradient(135deg, var(--twc-black) 0%, #222222 100%);
  color: white;
  padding: 22px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 4px solid var(--twc-gold);
  position: relative;
}

#TWCX_chat_root .widget-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--twc-gold), transparent);
}

#TWCX_chat_root .header-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

#TWCX_chat_root .header-content h1 {
  font-size: 22px;
  font-weight: 800;
  color: var(--twc-gold-light);
  letter-spacing: -0.5px;
}

#TWCX_chat_root .header-content h2 {
  font-size: 16px;
  font-weight: 600;
  opacity: 0.9;
  color: var(--twc-gold-light);
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
}

#TWCX_chat_root .close-widget:hover {
  background: rgba(210, 180, 140, 0.3);
  transform: rotate(90deg);
}

/* Widget Body */
#TWCX_chat_root .widget-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background: linear-gradient(to bottom, #fafafa 0%, #f5f5f5 100%);
}

/* Success Tracker Styles */
#TWCX_chat_root .widget-container {
  background-color: transparent;
  border-radius: 0;
  overflow: hidden;
}

#TWCX_chat_root .step-row {
  display: flex;
  border-bottom: 1px solid var(--twc-gray-dark);
  transition: var(--transition);
  background: white;
}

#TWCX_chat_root .step-row:hover {
  background-color: #fcfcfc;
  transform: translateX(5px);
  box-shadow: -5px 5px 20px rgba(0,0,0,0.05);
}

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
  min-height: 80px;
}

/* Middle box text alignment */
#TWCX_chat_root .step-content {
  padding: 22px;
  flex-grow: 1;
  line-height: 1.7;
  font-size: 15px;
  color: var(--twc-text);
  min-height: 80px;
  display: block;
  align-items: normal;
  justify-content: normal;
  padding-top: 22px;
  padding-bottom: 22px;
}

#TWCX_chat_root .step-time {
  padding: 22px;
  width: 160px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: var(--twc-gray);
  border-left: 1px solid var(--twc-gray-dark);
  flex-shrink: 0;
  min-height: 80px;
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
  border: 1px solid rgba(210, 180, 140, 0.3);
}

#TWCX_chat_root .time-estimate {
  margin-top: 10px;
  font-size: 13px;
  color: var(--twc-text-light);
  text-align: center;
  font-weight: 500;
}

/* Circle in chat widget */
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

/* Text truncation - Show full text with wrapping */
#TWCX_chat_root .step-title {
  font-size: 16px;
  font-weight: 700;
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  line-height: 1.4;
  max-width: 100%;
  display: block;
}

#TWCX_chat_root ul {
  padding-left: 22px;
  margin: 12px 0 0 0;
}

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
  padding: 2px 0;
}

#TWCX_chat_root .link:hover {
  color: var(--twc-black);
  border-bottom: 2px solid var(--twc-gold);
  padding-bottom: 1px;
}

#TWCX_chat_root .highlight {
  background-color: var(--twc-gold-light);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--twc-black);
  font-weight: 600;
  border: 1px solid rgba(210, 180, 140, 0.3);
}

#TWCX_chat_root .note {
  background: linear-gradient(to right, var(--twc-gray) 0%, #f0f0f0 100%);
  border-left: 5px solid var(--twc-gold);
  padding: 18px 20px;
  margin: 18px 0;
  font-size: 14px;
  color: var(--twc-text);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  box-shadow: 0 5px 15px rgba(0,0,0,0.03);
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
  transform: scale(1.2);
}

#TWCX_chat_root .widget-footer {
  background: linear-gradient(to right, var(--twc-gray) 0%, #f0f0f0 100%);
  padding: 25px 30px;
  text-align: center;
  border-top: 1px solid var(--twc-gray-dark);
}

#TWCX_chat_root .widget-footer a {
  color: var(--twc-gold-dark);
  text-decoration: none;
  font-weight: 700;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: var(--transition);
  padding: 10px 20px;
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid var(--twc-gray-dark);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

#TWCX_chat_root .widget-footer a:hover {
  color: var(--twc-black);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
  border-color: var(--twc-gold-light);
}

#TWCX_chat_root .completion-status {
  display: flex;
  align-items: center;
  margin-top: 15px;
  justify-content: center;
  gap: 15px;
  cursor: pointer;
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
}

#TWCX_chat_root .checkbox:hover {
  border-color: var(--twc-gold-dark);
  transform: scale(1.1);
}

#TWCX_chat_root .checkbox.checked {
  background: var(--twc-gold);
  border-color: var(--twc-gold);
  box-shadow: 0 4px 12px rgba(184, 155, 116, 0.3);
}

#TWCX_chat_root .checkbox.checked:after {
  content: "✓";
  color: var(--twc-black);
  font-weight: 900;
  font-size: 14px;
  animation: checkmark 0.3s ease;
}

@keyframes checkmark {
  0% { transform: scale(0); }
  70% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

#TWCX_chat_root .status-label {
  font-size: 14px;
  color: var(--twc-text-light);
  font-weight: 600;
  transition: var(--transition);
}

#TWCX_chat_root .completion-status:hover .status-label {
  color: var(--twc-black);
}

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

#TWCX_chat_root .progress-text span {
  color: var(--twc-black);
  font-weight: 800;
}

#TWCX_chat_root .progress-bar {
  width: 250px;
  height: 10px;
  background-color: var(--twc-gray-dark);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
}

#TWCX_chat_root .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--twc-gold), var(--twc-gold-dark));
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  width: 0%;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(184, 155, 116, 0.3);
}

/* Scrollbar styling for chat widget */
#TWCX_chat_root .widget-body::-webkit-scrollbar {
  width: 10px;
}

#TWCX_chat_root .widget-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

#TWCX_chat_root .widget-body::-webkit-scrollbar-thumb {
  background: var(--twc-gold);
  border-radius: 4px;
  border: 2px solid #f1f1f1;
}

#TWCX_chat_root .widget-body::-webkit-scrollbar-thumb:hover {
  background: var(--twc-gold-dark);
}

/* Responsive chat widget */
@media (max-width: 900px) {
  #TWCX_chat_root .tracker-widget {
    width: 95vw;
    max-height: 85vh;
    right: 2.5vw;
    bottom: 100px;
  }
  
  #TWCX_chat_root .step-row {
    flex-direction: column;
    margin-bottom: 10px;
  }
  
  #TWCX_chat_root .step-header,
  #TWCX_chat_root .step-content,
  #TWCX_chat_root .step-time {
    width: 100%;
    min-height: auto;
    padding: 20px;
  }
  
  #TWCX_chat_root .step-header {
    border-right: none;
    border-bottom: 1px solid var(--twc-gray-dark);
    flex-direction: row;
    align-items: center;
    gap: 15px;
  }
  
  #TWCX_chat_root .step-content {
    border-top: none;
    border-bottom: 1px solid var(--twc-gray-dark);
  }
  
  #TWCX_chat_root .step-time {
    border-left: none;
    border-top: none;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
  }
  
  #TWCX_chat_root .time-estimate {
    margin-top: 0;
    font-size: 12px;
  }
  
  #TWCX_chat_root .time-badge {
    min-width: 90px;
    padding: 8px 15px;
    font-size: 13px;
  }
  
  #TWCX_chat_root .completion-status {
    margin-top: 0;
  }
  
  #TWCX_chat_root .chat-toggle-btn {
    width: 60px;
    height: 60px;
    font-size: 22px;
    bottom: 20px;
    right: 20px;
  }
  
  #TWCX_chat_root .chat-widget-container {
    bottom: 20px;
    right: 20px;
  }
}

/* iPhone specific optimizations for chat widget */
@media (max-width: 390px) {
  #TWCX_chat_root .chat-widget-container {
    bottom: 10px;
    right: 10px;
  }
  
  #TWCX_chat_root .chat-toggle-btn {
    width: 48px;
    height: 48px;
    font-size: 17px;
  }
  
  #TWCX_chat_root .tracker-widget {
    width: calc(100vw - 20px);
    max-height: 70vh;
    bottom: 65px;
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
     ENHANCED CHAT WIDGET DOM
  ========================== */
  function TWCX_ensureChatRoot() {
    if (document.getElementById("TWCX_chat_root")) return;

    var root = document.createElement("div");
    root.id = "TWCX_chat_root";

    root.innerHTML = `
      <div class="chat-widget-container" id="chatWidgetContainer" style="display:none;">
        <!-- Success Tracker Widget (hidden by default) -->
        <div class="tracker-widget" id="trackerWidget">
            <div class="widget-header">
                <div class="header-content">
                    <h1>TWC New Member Success Tracker</h1>
                </div>
                <button class="close-widget" id="closeWidgetBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="widget-body">
                <div class="widget-container">
                    <!-- Step 1 -->
                    <div class="step-row" data-step="1">
                        <div class="step-header">
                            <span class="step-number">1</span>
                            <span class="step-title">Introduction and Quick Start</span>
                        </div>
                        <div class="step-content">
                            <ul>
                                <li>Watch The <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/home/posts/68bb852022feb0ae2704b09a" target="_blank" class="link">Start Here Video</a></li>
                            </ul>
                        </div>
                        <div class="step-time">
                            <div class="time-badge">5 minutes</div>
                            <div class="time-estimate">Estimated time</div>
                            <div class="completion-status">
                                <div class="checkbox" data-step="1"></div>
                                <span class="status-label">Mark complete</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Step 2 -->
                    <div class="step-row" data-step="2">
                        <div class="step-header">
                            <span class="step-number">2</span>
                            <span class="step-title">Decide On Your Product Offer</span>
                        </div>
                        <div class="step-content">
                            <p>Watch the following videos in order then follow the flow chart:</p>
                            <ul>
                                <li><a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/47f8eebb-636e-4490-ac4b-ebf7ca613286?source=communities&group_slug=the-wealth-creator" target="_blank" class="link">Digital & Affiliate Marketing 101</a></li>
                                <li><a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/35a97775-c30b-4a64-9932-b46e065f59c2?source=communities&group_slug=the-wealth-creator" target="_blank" class="link">Onboarding Call - Launch Your Business</a></li>
                                <li><a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/94a2da82-51cd-4607-a46f-dd86fa2af408?source=communities&group_slug=the-wealth-creator" target="_blank" class="link">Choose Your Path Flowchart</a></li>
                            </ul>
                        </div>
                        <div class="step-time">
                            <div class="time-badge">30 minutes</div>
                            <div class="time-estimate">Estimated time</div>
                            <div class="completion-status">
                                <div class="checkbox" data-step="2"></div>
                                <span class="status-label">Mark complete</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Step 3 -->
                    <div class="step-row" data-step="3">
                        <div class="step-header">
                            <span class="step-number">3</span>
                            <span class="step-title">Attend an Onboarding Call</span>
                        </div>
                        <div class="step-content">
                            <ul>
                                <li>Choose a day that works for you <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/events" target="_blank" class="link">LINK</a></li>
                                <li>If you cannot attend a live onboarding, complete self onboarding: <a href="https://www.loom.com/share/333c685b104d426a828c485b06dedd46" target="_blank" class="link">WATCH NOW</a></li>
                            </ul>
                            <div class="note">
                                <p>If you do the self onboarding, Sign up for FIRM here: <a href="https://thewealthcreator.co/firm-page" target="_blank" class="link">https://thewealthcreator.co/firm-page</a></p>
                                <p><span class="highlight">Discount code: Firmfree</span></p>
                                <p>AND Complete the <a href="https://thewealthcreator.co/branding" target="_blank" class="link">BRANDING FORM</a></p>
                            </div>
                        </div>
                        <div class="step-time">
                            <div class="time-badge">30 minutes</div>
                            <div class="time-estimate">Estimated time</div>
                            <div class="completion-status">
                                <div class="checkbox" data-step="3"></div>
                                <span class="status-label">Mark complete</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Step Separator -->
                    <div class="step-separator">
                        <span class="step-number">→</span>
                        <span>AFTER Onboarding</span>
                    </div>
                    
                    <!-- Step 4 -->
                    <div class="step-row" data-step="4">
                        <div class="step-header">
                            <span class="step-number">4</span>
                            <span class="step-title">Create a Social Media account and Post your FIRST Post!</span>
                        </div>
                        <div class="step-content">
                            <ul>
                                <li>The <a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/80ef2315-2298-42b3-9635-92fe122dc05d" target="_blank" class="link">Instagram Modules</a> will show you how to create a new account and post</li>
                                <li>You can also access the <a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/80ef2315-2298-42b3-9635-92fe122dc05d/posts/57904857-4c4f-4f93-9cab-a2f18389d523?source=communities&group_slug=the-wealth-creator" target="_blank" class="link">2 Weeks of Content Done FOR You</a> content and use it to start posting!</li>
                            </ul>
                        </div>
                        <div class="step-time">
                            <div class="time-badge">1 hour</div>
                            <div class="time-estimate">Estimated time</div>
                            <div class="completion-status">
                                <div class="checkbox" data-step="4"></div>
                                <span class="status-label">Mark complete</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Step 5 -->
                    <div class="step-row" data-step="5">
                        <div class="step-header">
                            <span class="step-number">5</span>
                            <span class="step-title">YOUR Business is Delivered</span>
                        </div>
                        <div class="step-content">
                            <p>I got my <span class="highlight">"Congrats!! Your business is ready!"</span> email with my links - <strong>now what??</strong></p>
                            <ul>
                                <li>Watch this <a href="https://www.loom.com/share/730a88aad18e4fe88dfd839ff85fba46" target="_blank" class="link">Next steps video HERE</a></li>
                            </ul>
                            <div class="note">
                                <p>If your business is NOT delivered within 3 business days AFTER attending an Onboarding call and completing BOTH <a href="https://thewealthcreator.co/firm-page" target="_blank" class="link">FIRM sign up</a> and <a href="https://thewealthcreator.co/branding" target="_blank" class="link">Branding Form</a>, Please email us at <a href="mailto:support@thecreatorsco.biz" class="link">support@thecreatorsco.biz</a></p>
                            </div>
                        </div>
                        <div class="step-time">
                            <div class="time-badge">5 minutes</div>
                            <div class="time-estimate">Estimated time</div>
                            <div class="completion-status">
                                <div class="checkbox" data-step="5"></div>
                                <span class="status-label">Mark complete</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Step 6 -->
                    <div class="step-row" data-step="6">
                        <div class="step-header">
                            <span class="step-number">6</span>
                            <span class="step-title">Continue Learning</span>
                        </div>
                        <div class="step-content">
                            <ul>
                                <li>First watch The <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/learning" target="_blank" class="link">code modules</a> that apply to you</li>
                                <li>Then watch the <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/learning" target="_blank" class="link">wealth creator modules</a> and start learning more advanced training that apply to you and your business.</li>
                            </ul>
                        </div>
                        <div class="step-time">
                            <div class="time-badge">2 hours</div>
                            <div class="time-estimate">Estimated time</div>
                            <div class="completion-status">
                                <div class="checkbox" data-step="6"></div>
                                <span class="status-label">Mark complete</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Step 7 -->
                    <div class="step-row" data-step="7">
                        <div class="step-header">
                            <span class="step-number">7</span>
                            <span class="step-title">Attend 3 Mentorship Calls</span>
                        </div>
                        <div class="step-content">
                            <p>Hop on our <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/events" target="_blank" class="link">mentorship calls</a> every Tuesday and Thursday at 12 pm cst, 1 pm est. OR Watch <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/channels/Past-Coaching-Calls-8cT3N" target="_blank" class="link">Mentorship Call Recordings</a></p>
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
                                <div class="checkbox" data-step="7"></div>
                                <span class="status-label">Mark complete</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div class="widget-footer">
                        <a href="mailto:support@thecreatorsco.biz">
                            <i class="fas fa-envelope"></i> Please contact support@thecreatorsco.biz with any questions, concerns, etc!
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
        
        <!-- Chat Toggle Button -->
        <button class="chat-toggle-btn" id="chatToggleBtn">
            <i class="fas fa-tasks"></i>
            <span class="badge" id="notificationBadge" style="display: none;">!</span>
        </button>
    </div>
    `;

    document.body.appendChild(root);
  }

  /* =========================
     ENHANCED WIDGET FIX HELPERS
  ========================== */
  function TWCX_widgetGetCompletedSet() {
    var arr;
    try {
      arr = JSON.parse(localStorage.getItem("twcCompletedSteps")) || [];
    } catch (e) {
      arr = [];
    }
    var out = {};
    for (var i = 0; i < arr.length; i++) out[String(arr[i])] = true;
    return out;
  }

  function TWCX_widgetSaveCompletedSet(setObj) {
    var keys = [];
    for (var k in setObj) {
      if (Object.prototype.hasOwnProperty.call(setObj, k) && setObj[k]) keys.push(String(k));
    }
    keys.sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
    localStorage.setItem("twcCompletedSteps", JSON.stringify(keys));
  }

  function TWCX_widgetRender() {
    var root = document.getElementById("TWCX_chat_root");
    if (!root) return;

    var checkboxes = root.querySelectorAll('.checkbox[data-step]');
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

      var statusLabel = cb.parentNode ? cb.parentNode.querySelector(".status-label") : null;
      if (statusLabel) statusLabel.textContent = isDone ? "Completed" : "Mark complete";
    }

    var percent = totalSteps ? Math.round((completedCount / totalSteps) * 100) : 0;

    var progressBar = document.getElementById("progressBar");
    var progressText = document.getElementById("progressText");
    var notificationBadge = document.getElementById("notificationBadge");
    
    if (progressBar) progressBar.style.width = percent + "%";
    if (progressText) progressText.textContent = completedCount + "/7";
    
    if (notificationBadge) {
      if (completedCount < 7) {
        notificationBadge.style.display = 'flex';
        notificationBadge.textContent = '!';
      } else {
        notificationBadge.style.display = 'none';
      }
    }
  }

  function TWCX_widgetBindCheckboxesOnce() {
    var widget = document.getElementById("trackerWidget");
    if (!widget || widget.__twcxCheckboxBound) return;
    widget.__twcxCheckboxBound = true;

    widget.addEventListener("click", function (e) {
      var target = e.target;
      if (!target) return;

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

    window.addEventListener("storage", function (ev) {
      if (ev && (ev.key === "twcCompletedSteps" || ev.key === "twcVideoProgress")) {
        TWCX_widgetRender();
      }
    });
  }

  function TWCX_initChatWidgetInteractions() {
    var toggleBtn = document.getElementById("chatToggleBtn");
    var widget = document.getElementById("trackerWidget");
    var closeBtn = document.getElementById("closeWidgetBtn");
    var notificationBadge = document.getElementById("notificationBadge");

    if (toggleBtn && widget && !toggleBtn.__twcxBound) {
      toggleBtn.__twcxBound = true;
      toggleBtn.addEventListener("click", function () {
        widget.classList.toggle("active");
        toggleBtn.classList.toggle("active");
        
        if (widget.classList.contains("active")) {
          TWCX_widgetRender();
          if (notificationBadge) notificationBadge.style.display = 'none';
        } else {
          var completed = TWCX_widgetGetCompletedSet();
          var completedCount = Object.keys(completed).length;
          if (notificationBadge && completedCount < 7) {
            setTimeout(function() {
              notificationBadge.style.display = 'flex';
            }, 500);
          }
        }
      });
    }
    
    if (closeBtn && widget && !closeBtn.__twcxBound) {
      closeBtn.__twcxBound = true;
      closeBtn.addEventListener("click", function () {
        widget.classList.remove("active");
        toggleBtn.classList.remove("active");
        
        var completed = TWCX_widgetGetCompletedSet();
        var completedCount = Object.keys(completed).length;
        if (notificationBadge && completedCount < 7) {
          setTimeout(function() {
            notificationBadge.style.display = 'flex';
          }, 500);
        }
      });
    }
    
    document.addEventListener('click', function(event) {
      var widget = document.getElementById("trackerWidget");
      var toggleBtn = document.getElementById("chatToggleBtn");
      var notificationBadge = document.getElementById("notificationBadge");
      
      if (!widget || !toggleBtn) return;
      
      var isClickInsideWidget = widget.contains(event.target);
      var isClickOnToggleBtn = toggleBtn.contains(event.target);
      
      if (widget.classList.contains("active") && 
          !isClickInsideWidget && 
          !isClickOnToggleBtn &&
          window.innerWidth <= 900) {
        
        widget.classList.remove("active");
        toggleBtn.classList.remove("active");
        
        var completed = TWCX_widgetGetCompletedSet();
        var completedCount = Object.keys(completed).length;
        if (notificationBadge && completedCount < 7) {
          setTimeout(function() {
            notificationBadge.style.display = 'flex';
          }, 500);
        }
      }
    });
  }

  function TWCX_showChatWidgetOnly() {
    TWCX_ensureChatRoot();

    var container = document.getElementById("chatWidgetContainer");
    if (container) container.style.display = "block";

    TWCX_initChatWidgetInteractions();
    TWCX_widgetBindCheckboxesOnce();
    TWCX_widgetRender();
  }

  /* =========================
     MISSION ACCOMPLISHED MODAL
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
      '<div style="font-size:4rem;margin-bottom:25px;filter:drop-shadow(0 5px 15px rgba(0,0,0,0.2));">🏆</div>' +
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
     ENHANCED MAIN TRACKER CLASS
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
      try { TWCX_widgetRender(); } catch (e) {}
    }
  };

  TWCTracker.prototype.refreshUIOnly = function () {
    var total = this.calculateTotalProgress();

    var mainBar = document.getElementById("main-bar-fill");
    var mainText = document.getElementById("main-percent-text");
    if (mainBar) mainBar.style.width = total + "%";
    if (mainText) mainText.textContent = total + "% Complete";
    
    var i;
    for (i = 1; i <= this.totalSteps; i++) {
      var fill = document.getElementById("step-fill-" + i);
      var percentText = document.getElementById("step-percent-" + i);
      var progress = this.videoProgress[i].progress;
      
      if (fill) {
        fill.style.width = progress + "%";
        if (percentText) {
          percentText.textContent = progress + "%";
          if (progress > 40) {
            percentText.classList.add("inside-fill");
          } else {
            percentText.classList.remove("inside-fill");
          }
        }
      }
    }
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
    
    var contentArea = document.querySelector('.twc-content');
    if (contentArea) {
      contentArea.scrollTop = 0;
    }
  };

  TWCTracker.prototype.showLockMessage = function (stepNum) {
    var existingLock = document.querySelector('#twc-tracker-widget .lock-overlay');
    if (existingLock) {
      try { existingLock.remove(); } catch (e) {}
    }

    var videoWrapper = document.querySelector('#twc-tracker-widget .video-wrapper');
    if (!videoWrapper) return;

    var lockOverlay = document.createElement('div');
    lockOverlay.className = 'lock-overlay';
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
    var isMobile = window.innerWidth <= 768;

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
        : '<div class="video-placeholder"><div style="font-size: 2.5rem;">✅</div><h3 style="margin-top:10px;">Ready to Complete</h3></div>') +
      "</div>" +
      '<div class="instruction-card">' +
      '<h4 style="margin-bottom:8px; font-size:0.9rem;">Next Step:</h4>' +
      '<p style="color:var(--twc-text-light); font-size:0.85rem;">Watch the video above and follow the roadmap to unlock your full potential.</p>' +
      "</div>" +
      "</div>" +
      '<div class="twc-sidebar">' +
      (!isMobile ? '<h4 style="font-size:0.75rem; color:#999; margin-bottom:15px; text-transform:uppercase; letter-spacing:0.5px;">Curriculum</h4>' : '');
    
    var i;
    for (i = 0; i < this.steps.length; i++) {
      var progress = (this.videoProgress[i + 1] || {}).progress || 0;
      var hasEnoughSpace = progress > 40;
      var isLocked = i > 0 && (((this.videoProgress[i] || {}).progress || 0) < 100);
      var isCurrent = this.currentStep === i + 1;
      
      if (isMobile) {
        // Mobile view - number only
        html +=
          '<div class="step-card ' +
          (isCurrent ? "active " : "") +
          (isLocked ? "locked" : "") +
          '" ' +
          (isLocked ? "" : 'onclick="TWCX_trackerInstance.goToStep(' + (i + 1) + ')"') +
          ">" +
          '<div class="step-num">' +
          (i + 1) +
          "</div>" +
          "</div>";
      } else {
        // Desktop view - full card
        html +=
          '<div class="step-card ' +
          (isCurrent ? "active " : "") +
          (isLocked ? "locked" : "") +
          '" ' +
          (isLocked ? "" : 'onclick="TWCX_trackerInstance.goToStep(' + (i + 1) + ')"') +
          ">" +
          (isLocked ? '<div class="lock-indicator"><i class="fas fa-lock"></i></div>' : "") +
          '<div class="step-num">' +
          (i + 1) +
          "</div>" +
          '<div style="flex:1; overflow:hidden;">' +
          '<div class="step-title">' +
          this.steps[i].title +
          "</div>" +
          '<div class="step-progress-container">' +
          '<div id="step-fill-' + (i + 1) + '" class="step-progress-fill" style="width:' + progress + '%">' +
          (hasEnoughSpace ? '<div id="step-percent-' + (i + 1) + '" class="step-progress-text inside-fill">' + progress + '%</div>' : "") +
          "</div>" +
          (!hasEnoughSpace ? '<div id="step-percent-' + (i + 1) + '" class="step-progress-text">' + progress + '%</div>' : "") +
          "</div>" +
          "</div>" +
          "</div>";
      }
    }

    html +=
      "</div>" +
      "</div>" +
      '<div class="twc-footer">' +
      '<button class="btn btn-prev" type="button" ' +
      (this.currentStep === 1 ? "disabled" : "") +
      ' onclick="TWCX_trackerInstance.goToStep(' + (this.currentStep - 1) + ')">Back</button>' +
      (isLastStep
        ? '<button class="btn btn-complete" type="button" onclick="TWCX_trackerInstance.finishJourney()">Finish Journey</button>'
        : '<button class="btn btn-next" type="button" onclick="TWCX_trackerInstance.goToStep(' + (this.currentStep + 1) + ')">Next Step</button>') +
      "</div>";

    container.innerHTML = html;

    var video = document.getElementById("main-video");
    if (video) {
      video.ontimeupdate = function () {
        if (!video.duration) return;
        TWCX_trackerInstance.updateProgress(TWCX_trackerInstance.currentStep - 1, (video.currentTime / video.duration) * 100);
      };
      video.onended = function () {
        TWCX_trackerInstance.updateProgress(TWCX_trackerInstance.currentStep - 1, 100);
      };
    } else if (!currentData.hasVideo) {
      TWCX_trackerInstance.updateProgress(TWCX_trackerInstance.currentStep - 1, 100);
    }
  };

  /* =========================
     INIT FLOW
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
          TWCX_log("Watched = true -> show tracker widget bottom-right only.");
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
