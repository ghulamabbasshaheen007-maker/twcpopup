console.log ("script is working 40")



  var TARGET_SELECTOR = "#create-post__trigger";
  var CUSTOM_FIELD_ID = "pMR80x1BrnpsGE0ULX6e";
  var WATCHED_VALUE = "Watched";

  var API_BASE = "https://services.leadconnectorhq.com";
  var API_VERSION = "2021-07-28";
  var BEARER_TOKEN = "pit-7a2aa063-5698-4490-a39c-d167acbeb4e4";

  // Assets from your page
  var BG_IMAGE_URL =
    "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/694b465f147f516b70fc6e85.jpg";
  var VIDEO_URLS = [
    "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/694b3061aaebe869e7136502.mp4",
    "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/694b30612dd46f53e6499569.mp4",
    "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/694b30617d382a58543678a0.mp4",
    "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/694b30992442e05ab9f715bb.mp4",
    "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/694b30611dea1005fea2713a.mp4"
  ];

  var fired = false;
  var activeUid = null;

  function log(msg) {
    try {
      console.log("[TUT]", msg);
    } catch (err) {}
  }

  // -----------------------------
  // Auth / Contact helpers
  // -----------------------------
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
            "GET failed: " + res.status + " " + String(t || "").slice(0, 160)
          );
        });
      }
      return res.json();
    });
  }

  function getCustomFieldValue(contactResp) {
    var fields =
      (contactResp &&
        contactResp.contact &&
        contactResp.contact.customFields) ||
      [];
    var i, f;

    for (i = 0; i < fields.length; i++) {
      f = fields[i];
      if (String(f.id) === CUSTOM_FIELD_ID) {
        return f.value == null ? "" : String(f.value).trim();
      }
    }
    return "";
  }

  function isWatched(val) {
    return (
      String(val || "").trim().toLowerCase() ===
      String(WATCHED_VALUE).toLowerCase()
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
            "PUT failed: " + res.status + " " + String(t || "").slice(0, 160)
          );
        });
      }
      return res.json();
    });
  }

  // -----------------------------
  // UI injection (overlay widget) - ES5-safe
  // -----------------------------
  function ensureFontAwesome() {
    if (document.getElementById("ghl-tut-fa")) return;

    var link = document.createElement("link");
    link.id = "ghl-tut-fa";
    link.rel = "stylesheet";
    link.crossOrigin = "anonymous";
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css";
    (document.head || document.documentElement).appendChild(link);
  }

  function injectWidgetStyles() {
    if (document.getElementById("ghl-tutorial-styles")) return;

    var style = document.createElement("style");
    style.id = "ghl-tutorial-styles";

    style.textContent =
      "#ghl-tutorial-overlay{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;}" +
      "#ghl-tutorial-overlay *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}" +

      "#ghl-tutorial-overlay .ghl-tut-stage{position:relative;width:100%;height:100%;min-height:100vh;display:flex;align-items:center;justify-content:center;}" +
      "#ghl-tutorial-overlay .background-container{position:fixed;top:0;left:0;width:100%;height:100%;z-index:1;overflow:hidden;}" +
      "#ghl-tutorial-overlay .background-image{width:100%;height:100%;background-image:url('" + BG_IMAGE_URL + "');background-size:cover;background-position:center;background-repeat:no-repeat;filter:brightness(.85);}" +
      "#ghl-tutorial-overlay .background-overlay{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.2);}" +

      "#ghl-tutorial-overlay #ghl-tutorial-widget{position:relative;z-index:2;width:100%;display:flex;align-items:center;justify-content:center;}" +
      "#ghl-tutorial-overlay #widget-box{width:900px;max-width:100%;max-height:90vh;background:white;border-radius:20px;box-shadow:0 25px 50px rgba(0,0,0,.3);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(10px);background:rgba(255,255,255,.95);margin:10px;position:relative;}" +

      "#ghl-tutorial-overlay .widget-close{position:absolute;top:12px;right:12px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.25);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:5;}" +
      "#ghl-tutorial-overlay .widget-close:hover{background:rgba(0,0,0,.35);}" +

      "#ghl-tutorial-overlay .widget-header{background:#d2b48c;color:#fff;padding:20px 25px;flex-shrink:0;}" +
      "#ghl-tutorial-overlay .widget-header h2{font-size:22px;font-weight:600;display:flex;justify-content:space-between;align-items:center;gap:10px;}" +
      "#ghl-tutorial-overlay .header-progress{height:6px;background:rgba(255,255,255,.3);border-radius:3px;overflow:hidden;margin-top:8px;}" +
      "#ghl-tutorial-overlay .header-progress-bar{height:100%;background:#fff;transition:width .3s ease;}" +
      "#ghl-tutorial-overlay .header-progress-text{font-size:13px;margin-top:6px;text-align:right;opacity:.9;}" +

      "#ghl-tutorial-overlay .widget-content{display:flex;flex:1;overflow:hidden;}" +
      "#ghl-tutorial-overlay .video-section{flex:1;padding:25px;background:#f8fafc;display:flex;flex-direction:column;border-right:1px solid #e2e8f0;min-height:350px;}" +
      "#ghl-tutorial-overlay .video-title{margin-bottom:15px;font-size:20px;color:#1a202c;font-weight:600;}" +
      "#ghl-tutorial-overlay .video-container{flex:1;background:#000;border-radius:12px;overflow:hidden;position:relative;margin-bottom:15px;}" +
      "#ghl-tutorial-overlay .main-video{width:100%;height:100%;display:block;object-fit:cover;}" +
      "#ghl-tutorial-overlay .about-video{font-size:14px;color:#4a5568;background:#edf2f7;padding:14px;border-radius:8px;line-height:1.5;border:1px solid #e2e8f0;}" +
      "#ghl-tutorial-overlay .about-video strong{color:#1a202c;display:block;margin-bottom:4px;}" +

      "#ghl-tutorial-overlay .steps-section{width:320px;padding:20px;background:white;overflow-y:auto;border-left:1px solid #e2e8f0;}" +
      "#ghl-tutorial-overlay .steps-title{font-size:18px;color:#1a202c;margin-bottom:15px;font-weight:600;}" +
      "#ghl-tutorial-overlay .step-item{margin-bottom:12px;padding:15px;border:2px solid #e2e8f0;border-radius:10px;transition:all .3s ease;cursor:pointer;}" +
      "#ghl-tutorial-overlay .step-item:hover{border-color:#cbd5e0;transform:translateY(-2px);}" +
      "#ghl-tutorial-overlay .step-item.active{border-color:#d2b48c;background:rgba(210,180,140,.05);box-shadow:0 4px 12px rgba(210,180,140,.1);}" +
      "#ghl-tutorial-overlay .step-title{font-size:15px;color:#1a202c;font-weight:600;margin-bottom:6px;}" +
      "#ghl-tutorial-overlay .step-progress-info{font-size:12px;color:#718096;display:flex;justify-content:space-between;margin-bottom:5px;}" +
      "#ghl-tutorial-overlay .step-progress-bar{height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden;}" +
      "#ghl-tutorial-overlay .step-progress-fill{height:100%;background:#d2b48c;transition:width .3s ease;border-radius:2px;}" +

      "#ghl-tutorial-overlay .widget-navigation{padding:20px 25px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;gap:10px;}" +
      "#ghl-tutorial-overlay .prev-btn,#ghl-tutorial-overlay .next-btn{padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;border:none;cursor:pointer;transition:all .3s ease;display:flex;align-items:center;gap:6px;min-width:110px;justify-content:center;}" +
      "#ghl-tutorial-overlay .next-btn{background:#d2b48c;color:#fff;}" +
      "#ghl-tutorial-overlay .next-btn:hover:not(:disabled){background:#c2a47c;transform:translateY(-2px);box-shadow:0 6px 12px rgba(210,180,140,.3);}" +
      "#ghl-tutorial-overlay .prev-btn{background:#e2e8f0;color:#1a202c;border:1px solid #cbd5e0;}" +
      "#ghl-tutorial-overlay .prev-btn:hover:not(:disabled){background:#cbd5e0;transform:translateY(-2px);}" +
      "#ghl-tutorial-overlay .prev-btn:disabled{background:#edf2f7;color:#a0aec0;cursor:not-allowed;opacity:.6;border-color:#e2e8f0;}" +
      "#ghl-tutorial-overlay .prev-btn:disabled:hover{transform:none;box-shadow:none;}" +

      "#ghl-tutorial-overlay .video-loading{position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;}" +
      "#ghl-tutorial-overlay .loading-spinner{width:35px;height:35px;border:3px solid rgba(255,255,255,.3);border-top:3px solid white;border-radius:50%;animation:ghlSpin 1s linear infinite;}" +
      "@keyframes ghlSpin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}" +

      "@media (max-width:768px){" +
      "#ghl-tutorial-overlay .ghl-tut-stage{padding:5px;}" +
      "#ghl-tutorial-overlay #widget-box{width:100%;max-height:90vh;border-radius:16px;margin:5px;}" +
      "#ghl-tutorial-overlay .widget-content{flex-direction:column;overflow-y:auto;}" +
      "#ghl-tutorial-overlay .video-section{border-right:none;border-bottom:1px solid #e2e8f0;min-height:auto;padding:15px;}" +
      "#ghl-tutorial-overlay .video-container{height:280px;margin-bottom:12px;}" +
      "#ghl-tutorial-overlay .steps-section{width:100%;border-left:none;padding:15px;max-height:280px;overflow-y:auto;}" +
      "#ghl-tutorial-overlay .widget-navigation{padding:15px;flex-direction:column;}" +
      "#ghl-tutorial-overlay .widget-navigation button{width:100%;max-width:180px;}" +
      "}" +

      "@media (max-width:480px){" +
      "#ghl-tutorial-overlay #widget-box{max-height:100vh;border-radius:0;margin:0;}" +
      "#ghl-tutorial-overlay .video-container{height:220px;}" +
      "#ghl-tutorial-overlay .steps-section{max-height:220px;}" +
      "}";

    (document.head || document.documentElement).appendChild(style);
  }

  function mountOverlayShell() {
    if (document.getElementById("ghl-tutorial-overlay")) return;

    var overlay = document.createElement("div");
    overlay.id = "ghl-tutorial-overlay";
    overlay.innerHTML =
      '<div class="ghl-tut-stage">' +
      '  <div class="background-container">' +
      '    <div class="background-image"></div>' +
      '    <div class="background-overlay"></div>' +
      "  </div>" +
      '  <div id="ghl-tutorial-widget"></div>' +
      "</div>";

    document.body.appendChild(overlay);
  }

  var previousOverflow = null;

  function lockScroll() {
    try {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } catch (e) {}
  }

  function unlockScroll() {
    try {
      document.body.style.overflow =
        previousOverflow == null ? "" : previousOverflow;
    } catch (e) {}
  }

  function teardownOverlay() {
    var overlay = document.getElementById("ghl-tutorial-overlay");
    if (overlay) overlay.remove();
    unlockScroll();
    try {
      delete window.ghlTutorialWidget;
    } catch (e) {}
  }

  function showTutorialWidget(uid) {
    if (document.getElementById("ghl-tutorial-overlay")) return;

    log("Tutorial overlay opening.");

    ensureFontAwesome();
    injectWidgetStyles();
    mountOverlayShell();
    lockScroll();

    function onKeyDown(evt) {
      if (evt && evt.key === "Escape") {
        document.removeEventListener("keydown", onKeyDown);
        teardownOverlay();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    var overlay = document.getElementById("ghl-tutorial-overlay");

    function isClickInsideBox(target) {
      var box = document.getElementById("widget-box");
      if (!box || !target) return false;
      if (box === target) return true;
      return box.contains(target);
    }

    overlay.addEventListener("click", function (evt) {
      if (!evt || !evt.target) return;
      if (isClickInsideBox(evt.target)) return;
      teardownOverlay();
    });

    function GHLWidget(opts) {
      this.totalSteps = 5;
      this.currentStep = 1;

      this.stepTitles = [
        "Setup & Configuration",
        "Dashboard Overview",
        "Creating Your First Campaign",
        "Automation Rules",
        "Analytics & Reporting"
      ];

      this.videoDescriptions = [
        "Learn how to setup and configure your account properly.",
        "Overview of dashboard features and navigation.",
        "Step by step guide to creating your first campaign.",
        "Learn automation rules and workflows.",
        "Understand analytics and reporting features."
      ];

      this.videoUrls = VIDEO_URLS.slice(0);

      this.videoStates = this.loadStates();
      this.ensureStorage();

      this.onComplete =
        opts && typeof opts.onComplete === "function" ? opts.onComplete : null;

      this.render();
      this.bindUI();
      this.bindVideo();
      this.updateHeader();
    }

    GHLWidget.prototype.loadStates = function () {
      var obj = {};
      try {
        obj = JSON.parse(localStorage.getItem("videoProgressGHL") || "{}") || {};
      } catch (e) {
        obj = {};
      }
      return obj;
    };

    GHLWidget.prototype.saveStates = function () {
      try {
        localStorage.setItem("videoProgressGHL", JSON.stringify(this.videoStates));
      } catch (e) {}
    };

    GHLWidget.prototype.ensureStorage = function () {
      var i;
      for (i = 1; i <= this.totalSteps; i++) {
        if (!this.videoStates[i]) {
          this.videoStates[i] = {
            currentTime: 0,
            duration: 0,
            completed: false,
            maxProgress: 0
          };
        }
        if (typeof this.videoStates[i].maxProgress !== "number")
          this.videoStates[i].maxProgress = 0;
        if (typeof this.videoStates[i].currentTime !== "number")
          this.videoStates[i].currentTime = 0;
        if (typeof this.videoStates[i].duration !== "number")
          this.videoStates[i].duration = 0;
      }
      this.saveStates();
    };

    GHLWidget.prototype.calcProgress = function (step) {
      var state = this.videoStates[step];
      var raw;
      if (!state) return 0;
      if (!state.duration) return state.maxProgress || 0;

      raw = Math.round((state.currentTime / state.duration) * 100);
      if (raw > (state.maxProgress || 0)) {
        state.maxProgress = raw;
        this.saveStates();
      }
      return state.maxProgress || 0;
    };

    GHLWidget.prototype.calcTotalProgress = function () {
      var total = 0;
      var i;
      for (i = 1; i <= this.totalSteps; i++) {
        total += this.calcProgress(i);
      }
      return Math.round(total / this.totalSteps);
    };

    GHLWidget.prototype.render = function () {
      var mount = document.getElementById("ghl-tutorial-widget");
      if (!mount) return;

      var step = this.currentStep;
      var title = this.stepTitles[step - 1];
      var desc = this.videoDescriptions[step - 1];
      var url = this.videoUrls[step - 1];

      var totalPercent = this.calcTotalProgress();

      var stepsHtml = "";
      var i;
      for (i = 1; i <= this.totalSteps; i++) {
        var p = this.calcProgress(i);
        var active = i === step ? " active" : "";
        stepsHtml +=
          '<div class="step-item' + active + '" data-step="' + i + '">' +
          '  <div class="step-title">' +
          i +
          ". " +
          this.stepTitles[i - 1] +
          "</div>" +
          '  <div class="step-progress-info"><span>Progress</span><span id="step-text-' +
          i +
          '">' +
          p +
          "%</span></div>" +
          '  <div class="step-progress-bar"><div id="step-bar-' +
          i +
          '" class="step-progress-fill" style="width:' +
          p +
          '%"></div></div>' +
          "</div>";
      }

      var prevDisabled = step === 1 ? "disabled" : "";
      var nextLabel = step === this.totalSteps ? "Complete Course" : "Next Step";

      mount.innerHTML =
        '<div id="widget-box">' +
        '  <button type="button" class="widget-close" id="ghlWidgetCloseBtn" aria-label="Close"><i class="fas fa-times"></i></button>' +
        '  <div class="widget-header">' +
        '    <h2>Interactive Tutorial Guide <span>Step ' +
        step +
        "/" +
        this.totalSteps +
        "</span></h2>" +
        '    <div class="header-progress"><div id="header-bar" class="header-progress-bar" style="width:' +
        totalPercent +
        '%"></div></div>' +
        '    <div id="header-text" class="header-progress-text">' +
        totalPercent +
        "% Complete</div>" +
        "  </div>" +
        '  <div class="widget-content">' +
        '    <div class="video-section">' +
        '      <h3 class="video-title">' +
        title +
        "</h3>" +
        '      <div class="video-container">' +
        '        <video id="main-video" class="main-video" controls preload="metadata">' +
        '          <source src="' +
        url +
        '" type="video/mp4">' +
        "          Your browser does not support the video tag." +
        "        </video>" +
        '        <div class="video-loading" id="video-loading"><div class="loading-spinner"></div></div>' +
        "      </div>" +
        '      <div class="about-video"><strong>About this video:</strong> ' +
        desc +
        "</div>" +
        "    </div>" +
        '    <div class="steps-section">' +
        '      <h3 class="steps-title">Course Steps</h3>' +
        stepsHtml +
        "    </div>" +
        "  </div>" +
        '  <div class="widget-navigation">' +
        '    <button type="button" class="prev-btn" id="ghlPrevBtn" ' +
        prevDisabled +
        '><i class="fas fa-arrow-left"></i>Previous</button>' +
        '    <button type="button" class="next-btn" id="ghlNextBtn">' +
        nextLabel +
        ' <i class="fas fa-arrow-right"></i></button>' +
        "  </div>" +
        "</div>";
    };

    GHLWidget.prototype.updateHeader = function () {
      var percent = this.calcTotalProgress();
      var bar = document.getElementById("header-bar");
      var text = document.getElementById("header-text");
      if (bar) bar.style.width = percent + "%";
      if (text) text.textContent = percent + "% Complete";
    };

    GHLWidget.prototype.updateStepProgressUI = function (step) {
      var p = this.calcProgress(step);
      var bar = document.getElementById("step-bar-" + step);
      var text = document.getElementById("step-text-" + step);
      if (bar) bar.style.width = p + "%";
      if (text) text.textContent = p + "%";
    };

    GHLWidget.prototype.goToStep = function (stepNum) {
      if (stepNum < 1 || stepNum > this.totalSteps) return;
      this.currentStep = stepNum;
      this.render();
      this.bindUI();
      this.bindVideo();
      this.updateHeader();
    };

    GHLWidget.prototype.completeCourse = function () {
      try {
        alert("Congratulations! You have completed all tutorial steps.");
      } catch (e) {}

      try {
        localStorage.removeItem("videoProgressGHL");
      } catch (e2) {}

      if (this.onComplete) this.onComplete();
    };

    GHLWidget.prototype.bindUI = function () {
      var self = this;

      var closeBtn = document.getElementById("ghlWidgetCloseBtn");
      if (closeBtn) {
        closeBtn.onclick = function () {
          teardownOverlay();
        };
      }

      var prevBtn = document.getElementById("ghlPrevBtn");
      if (prevBtn) {
        prevBtn.onclick = function () {
          if (self.currentStep > 1) self.goToStep(self.currentStep - 1);
        };
      }

      var nextBtn = document.getElementById("ghlNextBtn");
      if (nextBtn) {
        nextBtn.onclick = function () {
          if (self.currentStep < self.totalSteps) {
            self.goToStep(self.currentStep + 1);
          } else {
            self.completeCourse();
          }
        };
      }

      var steps = document.querySelectorAll("#ghl-tutorial-overlay .step-item");
      var i;
      for (i = 0; i < steps.length; i++) {
        (function (el) {
          el.onclick = function () {
            var s = parseInt(el.getAttribute("data-step"), 10);
            if (s && s !== self.currentStep) self.goToStep(s);
          };
        })(steps[i]);
      }
    };

    GHLWidget.prototype.bindVideo = function () {
      var self = this;

      var video = document.getElementById("main-video");
      var loading = document.getElementById("video-loading");
      var state = this.videoStates[this.currentStep];

      if (!video || !state) return;

      if (loading) loading.style.display = "flex";

      video.onloadedmetadata = function () {
        try {
          state.duration = video.duration || 0;

          if (state.currentTime && video.currentTime < state.currentTime) {
            video.currentTime = state.currentTime;
          }

          self.saveStates();
          self.updateStepProgressUI(self.currentStep);
          self.updateHeader();
        } catch (e) {}

        if (loading) loading.style.display = "none";
      };

      video.ontimeupdate = function () {
        try {
          if (video.currentTime > state.currentTime) {
            state.currentTime = video.currentTime;
            self.saveStates();
            self.updateStepProgressUI(self.currentStep);
            self.updateHeader();
          }
        } catch (e) {}
      };

      video.onended = function () {
        try {
          state.completed = true;
          state.currentTime = state.duration || state.currentTime;
          self.saveStates();
          self.updateStepProgressUI(self.currentStep);
          self.updateHeader();
        } catch (e) {}
      };

      video.onwaiting = function () {
        if (loading) loading.style.display = "flex";
      };

      video.onplaying = function () {
        if (loading) loading.style.display = "none";
      };

      video.onerror = function () {
        if (loading) loading.style.display = "none";
      };

      try {
        video.load();
      } catch (e) {}
    };

    if (!window.ghlTutorialWidget) {
      window.ghlTutorialWidget = new GHLWidget({
        onComplete: function () {
          updateContactWatched(uid)
            .then(function () {
              log("Marked Watched successfully.");
            })
            .catch(function (e) {
              log("Failed to mark Watched: " + (e && e.message ? e.message : e));
            })
            .finally(function () {
              teardownOverlay();
            });
        }
      });
    }
  }

  // -----------------------------
  // Flow logic
  // -----------------------------
  function runFlow() {
    if (fired) return;
    fired = true;

    var uid = getUidFromLocalStorage();
    if (!uid) {
      fired = false;
      log("UID not found. Flow aborted.");
      return;
    }

    activeUid = uid;
    log("UID found: " + uid + " — fetching contact…");

    getContact(uid)
      .then(function (resp) {
        var fieldVal = getCustomFieldValue(resp);
        log("Custom field value: " + (fieldVal || "(empty)"));

        if (isWatched(fieldVal)) {
          log("Field is Watched => do not show tutorial.");
          return;
        }

        log("Field not Watched => show tutorial overlay.");
        showTutorialWidget(uid);
      })
      .catch(function (err) {
        fired = false;
        log("Flow error: " + (err && err.message ? err.message : err));
      });
  }

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
          var i;
          for (i = 0; i < entries.length; i++) {
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

