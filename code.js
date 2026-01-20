console.log ("script is working 40")



  /* =========================
     CONFIG
  ========================== */
  var TARGET_SELECTOR = "#create-post__trigger";
  var CUSTOM_FIELD_ID = "pMR80x1BrnpsGE0ULX6e";
  var WATCHED_VALUE = "Watched";

  var API_BASE = "https://services.leadconnectorhq.com";
  var API_VERSION = "2021-07-28";
  var BEARER_TOKEN = "pit-7a2aa063-5698-4490-a39c-d167acbeb4e4"; // <-- keep your working token here

  var MODAL_ID = "twc-success-tracker-modal";
  var MODAL_STYLE_ID = "twc-success-tracker-modal-styles";
  var MODAL_Z_INDEX = 999999;

  var fired = false;

  /* =========================
     LOGGING
  ========================== */
  function log(msg) {
    try {
      console.log("[TWC_TUT]", msg);
    } catch (err) {}
  }

  /* =========================
     UID DETECTION
  ========================== */
  function getUidFromLocalStorage() {
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
  function getContact(uid) {
    return fetch(API_BASE + "/contacts/" + encodeURIComponent(uid), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Version: API_VERSION,
        Authorization: "Bearer " + BEARER_TOKEN
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

  function getCustomFieldValue(contactResp) {
    var fields =
      (contactResp && contactResp.contact && contactResp.contact.customFields) || [];
    var i, f;

    for (i = 0; i < fields.length; i++) {
      f = fields[i];
      if (String(f.id) === String(CUSTOM_FIELD_ID)) {
        return f.value == null ? "" : String(f.value).trim();
      }
    }
    return "";
  }

  function isWatched(val) {
    return (
      String(val || "").trim().toLowerCase() ===
      String(WATCHED_VALUE).trim().toLowerCase()
    );
  }

  function updateContactWatched(uid) {
    return fetch(API_BASE + "/contacts/" + encodeURIComponent(uid), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Version: API_VERSION,
        Authorization: "Bearer " + BEARER_TOKEN
      },
      body: JSON.stringify({
        customFields: [
          {
            id: CUSTOM_FIELD_ID,
            field_value: WATCHED_VALUE
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
     POPUP HTML (SELF-CONTAINED)
     - No external hosting
     - Loaded via iframe srcdoc to isolate CSS/JS
     NOTE: I fixed ONE breaking typo in your HTML:
           In Step 7, you had ".step-content {" inside the markup.
           I corrected it to "<div class='step-content'>".
  ========================== */
  function getPopupSrcDoc() {
    return (
'<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">\n' +
'  <title>TWC Success Tracker</title>\n' +
'  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">\n' +
'  <style>\n' +

/* ======= YOUR CSS (UNCHANGED) ======= */
String.raw`
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

        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
            -webkit-tap-highlight-color: transparent; 
        }

        body {
            min-height: 100vh;
            font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--twc-text);
            overflow: hidden;
            padding: 20px;
        }

        .bg-overlay {
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%;
            background-image: url('https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/694b465f147f516b70fc6e85.jpg');
            background-size: cover; 
            background-position: center;
            filter: brightness(0.25) blur(6px);
            opacity: 0.9;
            z-index: 1;
            transform: scale(1.02);
        }

        #twc-tracker-widget {
            position: relative; 
            z-index: 2; 
            width: 100%; 
            max-width: 1200px;
            height: 90vh; 
            max-height: 850px;
            background: var(--twc-white); 
            border-radius: var(--radius-lg);
            overflow: hidden; 
            box-shadow: var(--shadow-heavy);
            display: flex; 
            flex-direction: column;
            border: 1px solid rgba(210, 180, 140, 0.15);
            transform: translateY(0);
            transition: var(--transition);
        }

        #twc-tracker-widget:hover {
            box-shadow: 0 25px 60px rgba(0,0,0,0.2), 0 15px 35px rgba(0,0,0,0.15);
        }

        .twc-header {
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

        .twc-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--twc-gold), transparent);
        }

        .twc-header h2 { 
            font-size: 1.5rem;
            font-weight: 800; 
            color: var(--twc-gold-light);
            letter-spacing: -0.5px;
            display: flex;
            align-items: center;
            gap: 12px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .twc-header h2::before {
            content: '🏆';
            font-size: 1.3rem;
        }

        .progress-container { 
            min-width: 200px;
            background: rgba(255,255,255,0.05);
            padding: 12px 16px;
            border-radius: 12px;
            border: 1px solid rgba(210, 180, 140, 0.2);
        }
        
        .progress-text { 
            font-size: 0.9rem;
            margin-bottom: 10px;
            display: flex; 
            justify-content: space-between; 
            font-weight: 600;
            gap: 20px;
        }
        
        .progress-text span:first-child {
            color: var(--twc-gold-light);
            opacity: 0.9;
        }
        
        .progress-text span:last-child {
            color: var(--twc-gold);
            font-weight: 700;
        }
        
        .progress-bar-bg { 
            width: 100%; 
            height: 10px;
            background: rgba(255,255,255,0.1); 
            border-radius: 6px; 
            overflow: hidden;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
        }
        
        .progress-bar-fill { 
            height: 100%; 
            background: linear-gradient(90deg, var(--twc-gold), #e0c090);
            width: 0%; 
            transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
            border-radius: 6px;
            position: relative;
            box-shadow: 0 0 15px rgba(210, 180, 140, 0.3);
        }

        .twc-main { 
            display: flex; 
            flex: 1; 
            overflow: hidden;
            min-height: 0;
            background: linear-gradient(to right, #ffffff 0%, #fcfcfc 100%);
        }
        
        .twc-content { 
            flex: 1; 
            padding: 30px; 
            overflow-y: auto; 
            display: flex;
            flex-direction: column;
            background: transparent;
            min-height: 0;
        }

        .content-header { 
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid var(--twc-gray-dark);
        }

        .content-header h1 { 
            font-size: 1.8rem;
            margin-bottom: 10px; 
            font-weight: 800; 
            line-height: 1.2; 
            color: var(--twc-black);
            letter-spacing: -0.5px;
            background: linear-gradient(135deg, var(--twc-black), #444);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .content-header h1::after {
            content: '';
            display: block;
            width: 60px;
            height: 4px;
            background: var(--twc-gold);
            margin-top: 15px;
            border-radius: 2px;
        }

        .video-wrapper { 
            width: 100%; 
            aspect-ratio: 16 / 9; 
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

        .video-wrapper:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }
        
        .video-wrapper video, .video-placeholder { 
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%; 
            object-fit: cover; 
        }

        .video-placeholder {
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center;
            color: var(--twc-gold-light); 
            text-align: center;
            background: linear-gradient(135deg, #1a1a1a, #0a0a0a);
        }

        .video-placeholder div:first-child {
            font-size: 3rem;
            margin-bottom: 15px;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
        }

        .video-placeholder h3 {
            font-size: 1.4rem;
            font-weight: 600;
            margin-top: 15px;
            color: var(--twc-gold);
        }

        .instruction-card { 
            background: linear-gradient(to right, var(--twc-gray) 0%, #f0f0f0 100%);
            border-left: 5px solid var(--twc-gold); 
            padding: 25px; 
            border-radius: var(--radius-sm);
            margin-bottom: 25px;
            visibility: hidden;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        }

        .twc-sidebar { 
            width: 380px;
            background: linear-gradient(to bottom, #fafafa 0%, #f5f5f5 100%); 
            border-left: 1px solid var(--twc-gray-dark); 
            padding: 30px;
            overflow-y: auto;
            min-height: 0;
            box-shadow: -5px 0 15px rgba(0,0,0,0.03);
        }

        .twc-sidebar h4 {
            font-size: 0.8rem;
            color: var(--twc-text-light);
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: 700;
            position: relative;
            padding-bottom: 10px;
        }

        .twc-sidebar h4::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 40px;
            height: 2px;
            background: var(--twc-gold);
        }

        .step-card { 
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
        
        .step-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: transparent;
            transition: var(--transition);
        }

        .step-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            border-color: var(--twc-gold-light);
        }
        
        .step-card:hover::before {
            background: var(--twc-gold);
        }
        
        .step-card.active { 
            background: linear-gradient(135deg, var(--twc-black), #2a2a2a); 
            color: white; 
            border-color: var(--twc-gold); 
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }
        
        .step-card.active::before {
            background: var(--twc-gold);
        }
        
        .step-num { 
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
        
        .step-card:hover .step-num {
            background: var(--twc-gold-light);
        }

        .active .step-num { 
            background: var(--twc-gold); 
            color: var(--twc-black);
            border-color: rgba(255,255,255,0.3);
            transform: scale(1.1);
        }

        .step-title { 
            font-size: 1rem;
            font-weight: 600; 
            white-space: normal;
            overflow: visible;
            text-overflow: clip;
            letter-spacing: -0.2px;
            line-height: 1.4;
        }

        .step-progress-container {
            position: relative;
            height: 22px;
            background: rgba(0,0,0,0.06); 
            border-radius: 12px; 
            margin-top: 12px; 
            overflow: hidden;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
        }

        .step-progress-fill {
            height: 100%; 
            background: linear-gradient(90deg, var(--twc-gold), var(--twc-gold-dark));
            width: 0%; 
            transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            border-radius: 12px;
            position: relative;
            box-shadow: 0 2px 8px rgba(184, 155, 116, 0.3);
        }

        .step-progress-text {
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

        .step-progress-text.inside-fill {
            color: var(--twc-black);
            text-align: center;
            width: 100%;
            left: 0;
            text-shadow: 0 1px 2px rgba(255,255,255,0.8);
        }

        .active .step-progress-text {
            color: rgba(255,255,255,0.95);
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }

        .active .step-progress-container {
            background: rgba(255,255,255,0.12);
        }

        .twc-footer { 
            padding: 20px 35px;
            background: white; 
            border-top: 1px solid var(--twc-gray-dark); 
            display: flex; 
            justify-content: space-between; 
            flex-shrink: 0; 
            background: linear-gradient(to right, #fafafa, #f5f5f5);
        }

        .btn { 
            padding: 16px 28px;
            border-radius: var(--radius-sm); 
            font-weight: 700; 
            cursor: pointer; 
            border: none; 
            font-size: 0.95rem;
            letter-spacing: -0.3px;
            transition: var(--transition);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-width: 140px;
            position: relative;
            overflow: hidden;
        }

        .btn-prev { 
            background: var(--twc-gray); 
            color: var(--twc-text);
            border: 1px solid var(--twc-gray-dark);
        }
        
        .btn-next { 
            background: linear-gradient(135deg, var(--twc-gold), var(--twc-gold-dark));
            color: var(--twc-black);
        }
        
        .btn-complete { 
            background: linear-gradient(135deg, #27ae60, #219955);
            color: white;
        }
        
        .btn:disabled { 
            opacity: 0.4;
            cursor: not-allowed;
        }

        .chat-widget-container {
            position: fixed;
            bottom: 25px;
            right: 25px;
            z-index: 1000;
            display: none;
        }

        .chat-toggle-btn {
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
            border: 2px solid var(--twc-gold);
            position: relative;
        }

        .tracker-widget {
            position: absolute;
            bottom: 80px;
            right: 0;
            width: 880px;
            max-height: 650px;
            background-color: white;
            border-radius: var(--radius-lg);
            display: none;
            flex-direction: column;
            overflow: hidden;
            opacity: 0;
            transform: translateY(20px) scale(0.98);
            transition: opacity 0.3s ease, transform 0.3s ease;
        }

        .tracker-widget.active {
            display: flex;
            opacity: 1;
            transform: translateY(0) scale(1);
        }

        .widget-header {
            background: linear-gradient(135deg, var(--twc-black) 0%, #222222 100%);
            color: white;
            padding: 22px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 4px solid var(--twc-gold);
            position: relative;
        }

        .close-widget {
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
        }

        .widget-body { flex: 1; overflow-y: auto; padding: 0; background: #f5f5f5; }
        .widget-container { background: transparent; }

        .step-row { display: flex; border-bottom: 1px solid var(--twc-gray-dark); background: white; }
        .step-header { display:flex; align-items:center; padding:22px; width:240px; background: var(--twc-gray); border-right:1px solid var(--twc-gray-dark); font-weight:700; }
        .step-content { padding:22px; flex-grow:1; line-height:1.7; font-size:15px; }
        .step-time { padding:22px; width:160px; display:flex; flex-direction:column; align-items:center; justify-content:center; background: var(--twc-gray); border-left:1px solid var(--twc-gray-dark); }
        .time-badge { background: linear-gradient(135deg, var(--twc-gold), var(--twc-gold-dark)); padding:10px 18px; border-radius:20px; font-weight:700; }
        .step-number { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; background: linear-gradient(135deg, var(--twc-gold), var(--twc-gold-dark)); border-radius:50%; margin-right:12px; font-weight:900; }
        .link { color: var(--twc-gold-dark); text-decoration:none; border-bottom:1px dotted var(--twc-gold); font-weight:600; }
        .note { background: var(--twc-gray); border-left:5px solid var(--twc-gold); padding:18px 20px; margin:18px 0; font-size:14px; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
        .highlight { background: var(--twc-gold-light); padding:4px 8px; border-radius:6px; font-weight:600; }

        .widget-footer { background: var(--twc-gray); padding:25px 30px; text-align:center; border-top:1px solid var(--twc-gray-dark); }
        .progress-bar { width:250px; height:10px; background: var(--twc-gray-dark); border-radius:6px; overflow:hidden; margin: 0 auto; }
        .progress-fill { height:100%; background: linear-gradient(90deg, var(--twc-gold), var(--twc-gold-dark)); width:0%; }

        .completion-status { display:flex; align-items:center; gap:12px; margin-top:12px; }
        .checkbox { width:24px; height:24px; border:2px solid var(--twc-gold); border-radius:6px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:#fff; }
        .checkbox.checked { background: var(--twc-gold); }
        .checkbox.checked:after { content:"✓"; font-weight:900; }

        .lock-overlay { position:absolute; inset:0; background: rgba(0,0,0,0.85); display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; z-index:10; }
        .lock-message strong { color: var(--twc-gold); }
` +
'  </style>\n' +
'</head>\n' +
'<body>\n' +
'  <div class="bg-overlay"></div>\n' +
'  <div id="twc-tracker-widget"></div>\n' +
'\n' +
'  <div class="chat-widget-container" id="chatWidgetContainer" style="display:none;">\n' +
'    <div class="tracker-widget" id="trackerWidget">\n' +
'      <div class="widget-header">\n' +
'        <div class="header-content">\n' +
'          <h1 style="font-size:22px;font-weight:800;color:var(--twc-gold-light);">TWC New Member Success Tracker</h1>\n' +
'        </div>\n' +
'        <button class="close-widget" id="closeWidgetBtn"><i class="fas fa-times"></i></button>\n' +
'      </div>\n' +
'      <div class="widget-body">\n' +
'        <div class="widget-container">\n' +

'          <div class="step-row" data-step="1">\n' +
'            <div class="step-header"><span class="step-number">1</span><span class="step-title">Introduction and Quick Start</span></div>\n' +
'            <div class="step-content"><ul><li>Watch The <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/home/posts/68bb852022feb0ae2704b09a" target="_blank" class="link">Start Here Video</a></li></ul></div>\n' +
'            <div class="step-time"><div class="time-badge">5 minutes</div><div class="completion-status"><div class="checkbox" data-step="1"></div><span class="status-label">Mark complete</span></div></div>\n' +
'          </div>\n' +

'          <div class="step-row" data-step="2">\n' +
'            <div class="step-header"><span class="step-number">2</span><span class="step-title">Decide On Your Product Offer</span></div>\n' +
'            <div class="step-content">\n' +
'              <p>Watch the following videos in order then follow the flow chart:</p>\n' +
'              <ul>\n' +
'                <li><a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/47f8eebb-636e-4490-ac4b-ebf7ca613286?source=communities&group_slug=the-wealth-creator" target="_blank" class="link">Digital & Affiliate Marketing 101</a></li>\n' +
'                <li><a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/35a97775-c30b-4a64-9932-b46e065f59c2?source=communities&group_slug=the-wealth-creator" target="_blank" class="link">Onboarding Call - Launch Your Business</a></li>\n' +
'                <li><a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/3da547e8-78db-44f5-b21f-a32aba5244b8/posts/94a2da82-51cd-4607-a46f-dd86fa2af408?source=communities&group_slug=the-wealth-creator" target="_blank" class="link">Choose Your Path Flowchart</a></li>\n' +
'              </ul>\n' +
'            </div>\n' +
'            <div class="step-time"><div class="time-badge">30 minutes</div><div class="completion-status"><div class="checkbox" data-step="2"></div><span class="status-label">Mark complete</span></div></div>\n' +
'          </div>\n' +

'          <div class="step-row" data-step="3">\n' +
'            <div class="step-header"><span class="step-number">3</span><span class="step-title">Attend an Onboarding Call</span></div>\n' +
'            <div class="step-content">\n' +
'              <ul>\n' +
'                <li>Choose a day that works for you <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/events" target="_blank" class="link">LINK</a></li>\n' +
'                <li>If you cannot attend a live onboarding, complete self onboarding: <a href="https://www.loom.com/share/333c685b104d426a828c485b06dedd46" target="_blank" class="link">WATCH NOW</a></li>\n' +
'              </ul>\n' +
'              <div class="note">\n' +
'                <p>If you do the self onboarding, Sign up for FIRM here: <a href="https://thewealthcreator.co/firm-page" target="_blank" class="link">https://thewealthcreator.co/firm-page</a></p>\n' +
'                <p><span class="highlight">Discount code: Firmfree</span></p>\n' +
'                <p>AND Complete the <a href="https://thewealthcreator.co/branding" target="_blank" class="link">BRANDING FORM</a></p>\n' +
'              </div>\n' +
'            </div>\n' +
'            <div class="step-time"><div class="time-badge">30 minutes</div><div class="completion-status"><div class="checkbox" data-step="3"></div><span class="status-label">Mark complete</span></div></div>\n' +
'          </div>\n' +

'          <div style="background:linear-gradient(135deg,var(--twc-black),#222);color:var(--twc-gold-light);padding:20px 25px;font-weight:800;border-left:5px solid var(--twc-gold);">AFTER Onboarding</div>\n' +

'          <div class="step-row" data-step="4">\n' +
'            <div class="step-header"><span class="step-number">4</span><span class="step-title">Create a Social Media account and Post your FIRST Post!</span></div>\n' +
'            <div class="step-content">\n' +
'              <ul>\n' +
'                <li>The <a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/80ef2315-2298-42b3-9635-92fe122dc05d" target="_blank" class="link">Instagram Modules</a> will show you how to create a new account and post</li>\n' +
'                <li>You can also access the <a href="https://thewealthcreatorco.app.clientclub.net/courses/products/e2c48925-2b1e-401e-887d-1495bdb66dda/categories/80ef2315-2298-42b3-9635-92fe122dc05d/posts/57904857-4c4f-4f93-9cab-a2f18389d523?source=communities&group_slug=the-wealth-creator" target="_blank" class="link">2 Weeks of Content Done FOR You</a> content and use it to start posting!</li>\n' +
'              </ul>\n' +
'            </div>\n' +
'            <div class="step-time"><div class="time-badge">1 hour</div><div class="completion-status"><div class="checkbox" data-step="4"></div><span class="status-label">Mark complete</span></div></div>\n' +
'          </div>\n' +

'          <div class="step-row" data-step="5">\n' +
'            <div class="step-header"><span class="step-number">5</span><span class="step-title">YOUR Business is Delivered</span></div>\n' +
'            <div class="step-content">\n' +
'              <p>I got my <span class="highlight">"Congrats!! Your business is ready!"</span> email with my links - <strong>now what??</strong></p>\n' +
'              <ul><li>Watch this <a href="https://www.loom.com/share/730a88aad18e4fe88dfd839ff85fba46" target="_blank" class="link">Next steps video HERE</a></li></ul>\n' +
'              <div class="note">\n' +
'                <p>If your business is NOT delivered within 3 business days AFTER attending an Onboarding call and completing BOTH <a href="https://thewealthcreator.co/firm-page" target="_blank" class="link">FIRM sign up</a> and <a href="https://thewealthcreator.co/branding" target="_blank" class="link">Branding Form</a>, Please email us at <a href="mailto:support@thecreatorsco.biz" class="link">support@thecreatorsco.biz</a></p>\n' +
'              </div>\n' +
'            </div>\n' +
'            <div class="step-time"><div class="time-badge">5 minutes</div><div class="completion-status"><div class="checkbox" data-step="5"></div><span class="status-label">Mark complete</span></div></div>\n' +
'          </div>\n' +

'          <div class="step-row" data-step="6">\n' +
'            <div class="step-header"><span class="step-number">6</span><span class="step-title">Continue Learning</span></div>\n' +
'            <div class="step-content">\n' +
'              <ul>\n' +
'                <li>First watch The <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/learning" target="_blank" class="link">code modules</a> that apply to you</li>\n' +
'                <li>Then watch the <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/learning" target="_blank" class="link">wealth creator modules</a> and start learning more advanced training that apply to you and your business.</li>\n' +
'              </ul>\n' +
'            </div>\n' +
'            <div class="step-time"><div class="time-badge">2 hours</div><div class="completion-status"><div class="checkbox" data-step="6"></div><span class="status-label">Mark complete</span></div></div>\n' +
'          </div>\n' +

'          <div class="step-row" data-step="7">\n' +
'            <div class="step-header"><span class="step-number">7</span><span class="step-title">Attend 3 Mentorship Calls</span></div>\n' +
'            <div class="step-content">\n' +
'              <p>Hop on our <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/events" target="_blank" class="link">mentorship calls</a> every Tuesday and Thursday at 12 pm cst, 1 pm est. OR Watch <a href="https://thewealthcreatorco.app.clientclub.net/communities/groups/the-wealth-creator/channels/Past-Coaching-Calls-8cT3N" target="_blank" class="link">Mentorship Call Recordings</a></p>\n' +
'              <ul><li>Mentorship Call 1</li><li>Mentorship Call 2</li><li>Mentorship Call 3</li></ul>\n' +
'            </div>\n' +
'            <div class="step-time"><div class="time-badge">3 hours</div><div class="completion-status"><div class="checkbox" data-step="7"></div><span class="status-label">Mark complete</span></div></div>\n' +
'          </div>\n' +

'          <div class="widget-footer">\n' +
'            <a class="link" href="mailto:support@thecreatorsco.biz"><i class="fas fa-envelope"></i> Please contact support@thecreatorsco.biz with any questions, concerns, etc!</a>\n' +
'            <div style="margin-top:18px;">\n' +
'              <div style="font-weight:700;margin-bottom:10px;">Overall Progress: <span id="progressText">0/7</span> steps completed</div>\n' +
'              <div class="progress-bar"><div class="progress-fill" id="progressBar"></div></div>\n' +
'            </div>\n' +
'          </div>\n' +

'        </div>\n' +
'      </div>\n' +
'    </div>\n' +
'\n' +
'    <button class="chat-toggle-btn" id="chatToggleBtn">\n' +
'      <i class="fas fa-tasks"></i>\n' +
'      <span class="badge" id="notificationBadge" style="display:none;position:absolute;top:-5px;right:-5px;background:linear-gradient(135deg,var(--twc-gold),#e0b870);color:var(--twc-black);font-size:12px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;border:2px solid var(--twc-black);">!</span>\n' +
'    </button>\n' +
'  </div>\n' +
'\n' +
'  <script>\n' +
'    (function(){\n' +
'      class TWCTracker {\n' +
'        constructor() {\n' +
'          this.currentStep = 1;\n' +
'          this.totalSteps = 7;\n' +
'          this.videoProgress = JSON.parse(localStorage.getItem("twcVideoProgress")) || {};\n' +
'          this.completedSteps = new Set();\n' +
'          this.steps = [\n' +
'            { title: "Introduction & Quick Start", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ec82b156e0a73e0ee9321.mp4", hasVideo: true },\n' +
'            { title: "Your Investment", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ec82ec7f17f7304d24b48.mp4", hasVideo: true },\n' +
'            { title: "Your First 48 Hours", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ecd64eecbfa6d734ad1da.mp4", hasVideo: true },\n' +
'            { title: "TWC Community & Training", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ecd70d4fb906bf95c4d1a.mp4", hasVideo: true },\n' +
'            { title: "Your Role VS Our Role", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ed3268ec5c94bb3d29f3a.mp4", hasVideo: true },\n' +
'            { title: "Next Steps", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696ed326acaab06b41a46e1e.mp4", hasVideo: true },\n' +
'            { title: "Start Here", video: "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/696fd50572b8e1ce031c6edc.mp4", hasVideo: true }\n' +
'          ];\n' +
'\n' +
'          this.loadCompletedSteps();\n' +
'          this.initializeProgress();\n' +
'          this.render();\n' +
'          this.initChatWidget();\n' +
'        }\n' +
'\n' +
'        loadCompletedSteps() {\n' +
'          const saved = JSON.parse(localStorage.getItem("twcCompletedSteps")) || [];\n' +
'          this.completedSteps = new Set(saved);\n' +
'        }\n' +
'\n' +
'        saveCompletedSteps() {\n' +
'          localStorage.setItem("twcCompletedSteps", JSON.stringify(Array.from(this.completedSteps)));\n' +
'        }\n' +
'\n' +
'        initializeProgress() {\n' +
'          for (let i = 1; i <= this.totalSteps; i++) {\n' +
'            if (!this.videoProgress[i]) this.videoProgress[i] = { progress: 0 };\n' +
'          }\n' +
'        }\n' +
'\n' +
'        calculateTotalProgress() {\n' +
'          let total = 0;\n' +
'          for (let i = 1; i <= this.totalSteps; i++) total += (this.videoProgress[i].progress || 0);\n' +
'          return Math.round(total / this.totalSteps);\n' +
'        }\n' +
'\n' +
'        updateProgress(stepIndex, p) {\n' +
'          const stepKey = stepIndex + 1;\n' +
'          const progress = Math.min(Math.round(p), 100);\n' +
'          if (progress > this.videoProgress[stepKey].progress) {\n' +
'            this.videoProgress[stepKey].progress = progress;\n' +
'            localStorage.setItem("twcVideoProgress", JSON.stringify(this.videoProgress));\n' +
'            if (progress === 100) {\n' +
'              this.completedSteps.add(stepKey.toString());\n' +
'              this.saveCompletedSteps();\n' +
'            }\n' +
'            this.refreshUIOnly();\n' +
'          }\n' +
'        }\n' +
'\n' +
'        refreshUIOnly() {\n' +
'          const total = this.calculateTotalProgress();\n' +
'          const mainBar = document.getElementById("main-bar-fill");\n' +
'          const mainText = document.getElementById("main-percent-text");\n' +
'          if (mainBar) mainBar.style.width = total + "%";\n' +
'          if (mainText) mainText.textContent = total + "% Complete";\n' +
'\n' +
'          this.steps.forEach((_, i) => {\n' +
'            const fill = document.getElementById(`step-fill-${i + 1}`);\n' +
'            const percentText = document.getElementById(`step-percent-${i + 1}`);\n' +
'            const progress = this.videoProgress[i + 1].progress;\n' +
'            if (fill) fill.style.width = progress + "%";\n' +
'            if (percentText) percentText.textContent = progress + "%";\n' +
'          });\n' +
'        }\n' +
'\n' +
'        goToStep(stepNum) {\n' +
'          if (stepNum > 1) {\n' +
'            const prevStepKey = stepNum - 1;\n' +
'            const prevStepProgress = this.videoProgress[prevStepKey].progress;\n' +
'            if (prevStepProgress < 100) {\n' +
'              this.showLockMessage(stepNum);\n' +
'              return;\n' +
'            }\n' +
'          }\n' +
'          this.currentStep = stepNum;\n' +
'          this.render();\n' +
'        }\n' +
'\n' +
'        showLockMessage(stepNum) {\n' +
'          const existingLock = document.querySelector(".lock-overlay");\n' +
'          if (existingLock) existingLock.remove();\n' +
'          const videoWrapper = document.querySelector(".video-wrapper");\n' +
'          if (!videoWrapper) return;\n' +
'          const lockOverlay = document.createElement("div");\n' +
'          lockOverlay.className = "lock-overlay";\n' +
'          lockOverlay.innerHTML = `\n' +
'            <div style="font-size:3rem;margin-bottom:16px;color:var(--twc-gold);">🔒</div>\n' +
'            <div class="lock-message">\n' +
'              <strong>Complete Step ${stepNum - 1} first!</strong><br><br>\n' +
'              Please watch the previous video completely (100%) before moving to Step ${stepNum}.\n' +
'            </div>\n' +
'          `;\n' +
'          videoWrapper.appendChild(lockOverlay);\n' +
'          setTimeout(() => { if (lockOverlay.parentNode) lockOverlay.remove(); }, 3000);\n' +
'        }\n' +
'\n' +
'        initChatWidget() {\n' +
'          this.chatToggleBtn = document.getElementById("chatToggleBtn");\n' +
'          this.trackerWidget = document.getElementById("trackerWidget");\n' +
'          this.closeWidgetBtn = document.getElementById("closeWidgetBtn");\n' +
'          this.notificationBadge = document.getElementById("notificationBadge");\n' +
'          this.chatWidgetContainer = document.getElementById("chatWidgetContainer");\n' +
'\n' +
'          this.updateChatCompletionUI();\n' +
'\n' +
'          document.querySelectorAll(".checkbox").forEach((checkbox) => {\n' +
'            checkbox.addEventListener("click", (e) => {\n' +
'              const step = e.target.getAttribute("data-step");\n' +
'              if (this.completedSteps.has(step)) this.completedSteps.delete(step);\n' +
'              else this.completedSteps.add(step);\n' +
'              this.saveCompletedSteps();\n' +
'              this.updateChatCompletionUI();\n' +
'            });\n' +
'          });\n' +
'\n' +
'          this.chatToggleBtn.addEventListener("click", () => {\n' +
'            this.trackerWidget.classList.toggle("active");\n' +
'            if (this.notificationBadge) this.notificationBadge.style.display = "none";\n' +
'          });\n' +
'\n' +
'          this.closeWidgetBtn.addEventListener("click", () => {\n' +
'            this.trackerWidget.classList.remove("active");\n' +
'          });\n' +
'        }\n' +
'\n' +
'        updateChatCompletionUI() {\n' +
'          let completedCount = 0;\n' +
'          document.querySelectorAll(".checkbox").forEach((checkbox) => {\n' +
'            const step = checkbox.getAttribute("data-step");\n' +
'            if (this.completedSteps.has(step)) {\n' +
'              checkbox.classList.add("checked");\n' +
'              completedCount++;\n' +
'            } else {\n' +
'              checkbox.classList.remove("checked");\n' +
'            }\n' +
'          });\n' +
'\n' +
'          const progressBar = document.getElementById("progressBar");\n' +
'          const progressText = document.getElementById("progressText");\n' +
'          const pct = (completedCount / 7) * 100;\n' +
'          if (progressBar) progressBar.style.width = pct + "%";\n' +
'          if (progressText) progressText.textContent = completedCount + "/7";\n' +
'\n' +
'          if (this.notificationBadge) {\n' +
'            this.notificationBadge.style.display = completedCount < 7 ? "flex" : "none";\n' +
'          }\n' +
'        }\n' +
'\n' +
'        finishJourney() {\n' +
'          // Same behavior you had: reveal the chat widget and hide main\n' +
'          document.getElementById("chatWidgetContainer").style.display = "block";\n' +
'          document.getElementById("twc-tracker-widget").style.display = "none";\n' +
'          var bg = document.querySelector(".bg-overlay");\n' +
'          if (bg) bg.style.display = "none";\n' +
'          this.trackerWidget.classList.add("active");\n' +
'        }\n' +
'\n' +
'        render() {\n' +
'          const container = document.getElementById("twc-tracker-widget");\n' +
'          const currentData = this.steps[this.currentStep - 1];\n' +
'          const totalProgress = this.calculateTotalProgress();\n' +
'          const isLastStep = this.currentStep === this.totalSteps;\n' +
'\n' +
'          container.innerHTML = `\n' +
'            <div class="twc-header">\n' +
'              <h2>TWC New Member Success Tracker</h2>\n' +
'              <div class="progress-container">\n' +
'                <div class="progress-text">\n' +
'                  <span>Step ${this.currentStep}/${this.totalSteps}</span>\n' +
'                  <span id="main-percent-text">${totalProgress}% Complete</span>\n' +
'                </div>\n' +
'                <div class="progress-bar-bg"><div id="main-bar-fill" class="progress-bar-fill" style="width:${totalProgress}%"></div></div>\n' +
'              </div>\n' +
'            </div>\n' +
'\n' +
'            <div class="twc-main">\n' +
'              <div class="twc-content">\n' +
'                <div class="content-header"><h1>${currentData.title}</h1></div>\n' +
'\n' +
'                <div class="video-wrapper">\n' +
'                  ${currentData.hasVideo ? `<video id="main-video" controls playsinline src="${currentData.video}"></video>` : `<div class="video-placeholder"><div style="font-size:2.5rem;">✅</div><h3>Ready to Complete</h3></div>`}\n' +
'                </div>\n' +
'                <div class="instruction-card"></div>\n' +
'              </div>\n' +
'\n' +
'              <div class="twc-sidebar">\n' +
'                <h4>Curriculum</h4>\n' +
'                ${this.steps.map((step, i) => {\n' +
'                  const progress = this.videoProgress[i+1].progress;\n' +
'                  const isLocked = i > 0 && this.videoProgress[i].progress < 100;\n' +
'                  const isCurrent = this.currentStep === i+1;\n' +
'                  return `\n' +
'                    <div class="step-card ${isCurrent ? "active" : ""} ${isLocked ? "locked" : ""}" ${isLocked ? "" : `onclick="tracker.goToStep(${i+1})"`}>\n' +
'                      <div class="step-num">${i+1}</div>\n' +
'                      <div style="flex:1;">\n' +
'                        <div class="step-title">${step.title}</div>\n' +
'                        <div class="step-progress-container">\n' +
'                          <div id="step-fill-${i+1}" class="step-progress-fill" style="width:${progress}%"></div>\n' +
'                          <div id="step-percent-${i+1}" class="step-progress-text">${progress}%</div>\n' +
'                        </div>\n' +
'                      </div>\n' +
'                    </div>\n' +
'                  `;\n' +
'                }).join("")}\n' +
'              </div>\n' +
'            </div>\n' +
'\n' +
'            <div class="twc-footer">\n' +
'              <button class="btn btn-prev" ${this.currentStep === 1 ? "disabled" : ""} onclick="tracker.goToStep(${this.currentStep - 1})">Back</button>\n' +
'              ${isLastStep ? `<button class="btn btn-complete" onclick="tracker.finishJourney()">Finish Journey</button>` : `<button class="btn btn-next" onclick="tracker.goToStep(${this.currentStep + 1})">Next Step</button>`}\n' +
'            </div>\n' +
'          `;\n' +
'\n' +
'          const video = document.getElementById("main-video");\n' +
'          if (video) {\n' +
'            video.ontimeupdate = () => this.updateProgress(this.currentStep - 1, (video.currentTime / video.duration) * 100);\n' +
'            video.onended = () => this.updateProgress(this.currentStep - 1, 100);\n' +
'          }\n' +
'        }\n' +
'      }\n' +
'\n' +
'      window.tracker = new TWCTracker();\n' +
'    })();\n' +
'  <\/script>\n' +
'</body>\n' +
'</html>\n'
    );
  }

  /* =========================
     MODAL (IFRAME SRCdoc)
  ========================== */
  function injectModalStyles() {
    if (document.getElementById(MODAL_STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = MODAL_STYLE_ID;
    style.textContent =
      "#" + MODAL_ID + "{position:fixed;inset:0;z-index:" + MODAL_Z_INDEX + ";display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);padding:18px;}" +
      "#" + MODAL_ID + " .twc-modal-shell{position:relative;width:min(1320px,100%);height:min(920px,92vh);background:#000;border-radius:16px;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.12);}" +
      "#" + MODAL_ID + " .twc-modal-close{position:absolute;top:10px;right:10px;z-index:" + (MODAL_Z_INDEX + 1) + ";width:44px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.35);color:#fff;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;}" +
      "#" + MODAL_ID + " .twc-modal-close:hover{background:rgba(0,0,0,.55);}" +
      "#" + MODAL_ID + " iframe{width:100%;height:100%;border:0;display:block;background:#fff;}";
    (document.head || document.documentElement).appendChild(style);
  }

  function closeModal() {
    var existing = document.getElementById(MODAL_ID);
    if (existing) {
      try {
        existing.remove();
      } catch (e) {
        existing.parentNode.removeChild(existing);
      }
    }
  }

  function showPopup() {
    if (document.getElementById(MODAL_ID)) return;

    injectModalStyles();

    var overlay = document.createElement("div");
    overlay.id = MODAL_ID;

    var shell = document.createElement("div");
    shell.className = "twc-modal-shell";

    var closeBtn = document.createElement("button");
    closeBtn.className = "twc-modal-close";
    closeBtn.type = "button";
    closeBtn.innerHTML = "✕";

    var frame = document.createElement("iframe");
    frame.setAttribute("referrerpolicy", "no-referrer");
    frame.setAttribute("allow", "autoplay; fullscreen");
    frame.srcdoc = getPopupSrcDoc();

    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", function (evt) {
      if (evt.target === overlay) closeModal();
    });

    shell.appendChild(closeBtn);
    shell.appendChild(frame);
    overlay.appendChild(shell);
    document.body.appendChild(overlay);

    log("Popup modal injected via iframe srcdoc.");
  }

  /* =========================
     CORE FLOW
  ========================== */
  function runFlow() {
    if (fired) return;
    fired = true;

    var uid = getUidFromLocalStorage();
    if (!uid) {
      fired = false;
      log("UID not found. Flow aborted.");
      return;
    }

    log("UID found: " + uid + " — fetching contact…");

    getContact(uid)
      .then(function (resp) {
        var fieldVal = getCustomFieldValue(resp);
        log("Custom field value: " + (fieldVal || "(empty)"));

        if (isWatched(fieldVal)) {
          log("Field is Watched => do not show popup.");
          return null;
        }

        log("Field not Watched => show popup + set Watched.");
        showPopup();

        return updateContactWatched(uid).then(function () {
          log("PUT completed (Watched set).");
        });
      })
      .catch(function (err) {
        fired = false; // allow retry if something fails
        log("Flow error: " + (err && err.message ? err.message : err));
      });
  }

  /* =========================
     TRIGGER: target enters viewport
     - Starts immediately
  ========================== */
  function waitForTargetThenTriggerOnViewport() {
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
              log("Target in viewport => running flow.");
              runFlow();
              cleanup();
              break;
            }
          }
        },
        { threshold: 0.25 }
      );

      intersectionObserver.observe(el);
      log("IntersectionObserver attached.");
    }

    var now = document.querySelector(TARGET_SELECTOR);
    if (now) {
      log("Target found immediately.");
      attachIntersection(now);
      return;
    }

    log("Waiting for target via MutationObserver…");

    mutationObserver = new MutationObserver(function () {
      var t = document.querySelector(TARGET_SELECTOR);
      if (t) {
        log("Target found via MutationObserver.");
        attachIntersection(t);
      }
    });

    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Start immediately
  waitForTargetThenTriggerOnViewport();

