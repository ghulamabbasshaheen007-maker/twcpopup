
console.log ("script is working 30")


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
    "https://storage.googleapis.com/msgsndr/Tu9uF1zIX4jfmQ8VZzYg/media/694b30611dea1005fea2713a.mp4",
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
        Authorization: "Bearer " + BEARER_TOKEN,
      },
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
        Authorization: "Bearer " + BEARER_TOKEN,
      },
      body: JSON.stringify({
        customFields: [
          {
            id: CUSTOM_FIELD_ID,
            field_value: WATCHED_VALUE,
          },
        ],
      }),
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
  // UI injection (exact widget UI, scoped to overlay)
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

    // Same CSS, but scoped under #ghl-tutorial-overlay to avoid impacting the host page
    style.textContent =
      "#ghl-tutorial-overlay{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;}" +
      "#ghl-tutorial-overlay *{margin:0;padding:0;box-sizing:border-box;}" +
      "#ghl-tutorial-overlay .ghl-tut-stage{position:relative;width:100%;height:100%;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;}" +
      "#ghl-tutorial-overlay .background-container{position:fixed;top:0;left:0;width:100%;height:100%;z-index:1;overflow:hidden;}" +
      "#ghl-tutorial-overlay .background-image{width:100%;height:100%;background-image:url('" +
      BG_IMAGE_URL +
      "');background-size:cover;background-position:center;background-repeat:no-repeat;filter:brightness(.85);}" +
      "#ghl-tutorial-overlay .background-overlay{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.2);}" +
      "#ghl-tutorial-overlay #ghl-tutorial-widget{position:relative;z-index:2;width:100%;display:flex;align-items:center;justify-content:center;}" +
      "#ghl-tutorial-overlay #widget-box{width:900px;max-width:100%;max-height:90vh;background:white;border-radius:20px;box-shadow:0 25px 50px rgba(0,0,0,.3);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(10px);background:rgba(255,255,255,.95);margin:10px;}" +
      "#ghl-tutorial-overlay .widget-header{background:#d2b48c;color:#fff;padding:20px 25px;flex-shrink:0;}" +
      "#ghl-tutorial-overlay .widget-header h2{margin:0 0 12px 0;font-size:22px;font-weight:600;display:flex;justify-content:space-between;align-items:center;}" +
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
      "#ghl-tutorial-overlay .widget-navigation{padding:20px 25px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;}" +
      "#ghl-tutorial-overlay .prev-btn,#ghl-tutorial-overlay .next-btn{padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;border:none;cursor:pointer;transition:all .3s ease;display:flex;align-items:center;gap:6px;min-width:110px;justify-content:center;}" +
      "#ghl-tutorial-overlay .next-btn{background:#d2b48c;color:#fff;}" +
      "#ghl-tutorial-overlay .next-btn:hover:not(:disabled){background:#c2a47c;transform:translateY(-2px);box-shadow:0 6px 12px rgba(210,180,140,.3);}" +
      "#ghl-tutorial-overlay .prev-btn{background:#e2e8f0;color:#1a202c;border:1px solid #cbd5e0;}" +
      "#ghl-tutorial-overlay .prev-btn:hover:not(:disabled){background:#cbd5e0;transform:translateY(-2px);}" +
      "#ghl-tutorial-overlay .prev-btn:disabled{background:#edf2f7;color:#a0aec0;cursor:not-allowed;opacity:.6;border-color:#e2e8f0;}" +
      "#ghl-tutorial-overlay .prev-btn:disabled:hover{transform:none;box-shadow:none;}" +
      "#ghl-tutorial-overlay .steps-section::-webkit-scrollbar{width:5px;}" +
      "#ghl-tutorial-overlay .steps-section::-webkit-scrollbar-track{background:#f1f1f1;border-radius:3px;}" +
      "#ghl-tutorial-overlay .steps-section::-webkit-scrollbar-thumb{background:#d2b48c;border-radius:3px;}" +
      "#ghl-tutorial-overlay .steps-section::-webkit-scrollbar-thumb:hover{background:#c2a47c;}" +
      "#ghl-tutorial-overlay .video-loading{position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;}" +
      "#ghl-tutorial-overlay .loading-spinner{width:35px;height:35px;border:3px solid rgba(255,255,255,.3);border-top:3px solid white;border-radius:50%;animation:ghlSpin 1s linear infinite;}" +
      "@keyframes ghlSpin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}" +
      "@media (max-width:1024px){#ghl-tutorial-overlay #widget-box{width:95%;max-height:85vh;}#ghl-tutorial-overlay .video-section{padding:20px;}#ghl-tutorial-overlay .steps-section{width:300px;padding:18px;}}" +
      "@media (max-width:768px){#ghl-tutorial-overlay .ghl-tut-stage{padding:5px;}#ghl-tutorial-overlay #widget-box{width:100%;max-height:90vh;border-radius:16px;margin:5px;}#ghl-tutorial-overlay .widget-content{flex-direction:column;overflow-y:auto;}#ghl-tutorial-overlay .video-section{border-right:none;border-bottom:1px solid #e2e8f0;min-height:auto;padding:15px;}#ghl-tutorial-overlay .video-container{height:280px;margin-bottom:12px;}#ghl-tutorial-overlay .video-title{margin-bottom:12px;font-size:18px;}#ghl-tutorial-overlay .steps-section{width:100%;border-left:none;padding:15px;max-height:280px;overflow-y:auto;}#ghl-tutorial-overlay .steps-title{margin-bottom:12px;font-size:17px;}#ghl-tutorial-overlay .widget-header{padding:15px;}#ghl-tutorial-overlay .widget-header h2{margin-bottom:10px;font-size:20px;}#ghl-tutorial-overlay .widget-navigation{padding:15px;flex-direction:column;gap:10px;}#ghl-tutorial-overlay .widget-navigation button{width:100%;max-width:180px;}#ghl-tutorial-overlay .prev-btn,#ghl-tutorial-overlay .next-btn{padding:11px 20px;min-width:100px;}#ghl-tutorial-overlay .about-video{padding:12px;font-size:13px;}#ghl-tutorial-overlay .step-item{padding:12px;margin-bottom:10px;}#ghl-tutorial-overlay .step-title{font-size:14px;margin-bottom:5px;}}" +
      "@media (max-width:480px){#ghl-tutorial-overlay .ghl-tut-stage{padding:0;}#ghl-tutorial-overlay #widget-box{max-height:100vh;border-radius:0;margin:0;}#ghl-tutorial-overlay .widget-header{padding:12px 15px;}#ghl-tutorial-overlay .widget-header h2{font-size:18px;flex-direction:column;align-items:flex-start;gap:6px;margin-bottom:8px;}#ghl-tutorial-overlay .video-section{padding:12px;}#ghl-tutorial-overlay .video-title{font-size:16px;margin-bottom:10px;}#ghl-tutorial-overlay .video-container{height:220px;margin-bottom:10px;}#ghl-tutorial-overlay .steps-section{padding:12px;max-height:220px;}#ghl-tutorial-overlay .steps-title{font-size:16px;margin-bottom:10px;}#ghl-tutorial-overlay .step-item{padding:10px;margin-bottom:8px;border-radius:8px;}#ghl-tutorial-overlay .step-title{font-size:13px;margin-bottom:4px;}#ghl-tutorial-overlay .about-video{padding:10px;font-size:12px;}#ghl-tutorial-overlay .widget-navigation{padding:12px;gap:8px;}#ghl-tutorial-overlay .widget-navigation button{max-width:160px;}#ghl-tutorial-overlay .prev-btn,#ghl-tutorial-overlay .next-btn{padding:10px 18px;font-size:14px;min-width:90px;}#ghl-tutorial-overlay .background-image{filter:brightness(.8);}}" +
      "@media (max-width:360px){#ghl-tutorial-overlay .video-container{height:180px;}#ghl-tutorial-overlay .widget-header h2{font-size:16px;}#ghl-tutorial-overlay .video-title{font-size:15px;}#ghl-tutorial-overlay .steps-title{font-size:15px;}#ghl-tutorial-overlay .steps-section{max-height:180px;}#ghl-tutorial-overlay .step-title{font-size:12px;}#ghl-tutorial-overlay .about-video{font-size:11px;}#ghl-tutorial-overlay .widget-navigation button{max-width:140px;}#ghl-tutorial-overlay .prev-btn,#ghl-tutorial-overlay .next-btn{padding:8px 16px;font-size:13px;}}";

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

  // -----------------------------
  // Widget class (same UI)
  // Adds onComplete callback (behavior only; UI unchanged)
  // -----------------------------
  function showTutorialWidget(uid) {
    if (document.getElementById("ghl-tutorial-overlay")) return;

    ensureFontAwesome();
    injectWidgetStyles();
    mountOverlayShell();
    lockScroll();

    // Close behaviors (no visible UI change):
    // - ESC closes overlay
    // - Click on background (outside widget-box) closes overlay
    function onKeyDown(e) {
      if (e && e.key === "Escape") {
        document.removeEventListener("keydown", onKeyDown);
        teardownOverlay();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    var overlay = document.getElementById("ghl-tutorial-overlay");
    overlay.addEventListener("click", function (evt) {
      var box = document.getElementById("widget-box");
      if (!box) return;
      if (evt.target && box.contains(evt.target)) return; // clicked inside widget
      teardownOverlay();
    });

    // Widget definition (from your page JS, with URLs injected + onComplete hook)
    class GHLSidebarWidget {
      constructor(opts) {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.videoStates =
          JSON.parse(localStorage.getItem("videoProgressGHL")) || {};
        this.currentSpeed = 1;

        this.videoUrls = VIDEO_URLS.slice();

        this.stepTitles = [
          "Setup & Configuration",
          "Dashboard Overview",
          "Creating Your First Campaign",
          "Automation Rules",
          "Analytics & Reporting",
        ];

        this.videoDescriptions = [
          "Learn how to setup and configure your account properly.",
          "Overview of dashboard features and navigation.",
          "Step by step guide to creating your first campaign.",
          "Learn automation rules and workflows.",
          "Understand analytics and reporting features.",
        ];

        this.onComplete = opts && typeof opts.onComplete === "function"
          ? opts.onComplete
          : null;

        this.ensureStorage();
        this.render();
        this.bindNav();
        this.bindVideo();
        this.updateHeader();
      }

      ensureStorage() {
        for (let i = 1; i <= this.totalSteps; i++) {
          if (!this.videoStates[i]) {
            this.videoStates[i] = {
              currentTime: 0,
              duration: 0,
              completed: false,
              maxProgress: 0,
            };
          }
        }
        localStorage.setItem("videoProgressGHL", JSON.stringify(this.videoStates));
      }

      calcProgress(step) {
        const state = this.videoStates[step];
        if (!state.duration) return state.maxProgress;
        const raw = Math.round((state.currentTime / state.duration) * 100);
        if (raw > state.maxProgress) {
          state.maxProgress = raw;
          localStorage.setItem("videoProgressGHL", JSON.stringify(this.videoStates));
        }
        return state.maxProgress;
      }

      render() {
        document.getElementById("ghl-tutorial-widget").innerHTML = `
          <div id="widget-box">
              <div class="widget-header">
                  <h2>
                      Interactive Tutorial Guide
                      <span>Step ${this.currentStep}/${this.totalSteps}</span>
                  </h2>
                  <div class="header-progress">
                      <div id="header-bar" class="header-progress-bar"></div>
                  </div>
                  <div id="header-text" class="header-progress-text">0% Complete</div>
              </div>

              <div class="widget-content">
                  <div class="video-section">
                      <h3 class="video-title">${this.stepTitles[this.currentStep - 1]}</h3>
                      <div class="video-container">
                          <video id="main-video" class="main-video" controls preload="metadata">
                              <source src="${this.videoUrls[this.currentStep - 1]}" type="video/mp4">
                              Your browser does not support the video tag.
                          </video>
                          <div class="video-loading" id="video-loading">
                              <div class="loading-spinner"></div>
                          </div>
                      </div>
                      <div class="about-video">
                          <strong>About this video:</strong> 
                          ${this.videoDescriptions[this.currentStep - 1]}
                      </div>
                  </div>

                  <div class="steps-section">
                      <h3 class="steps-title">Course Steps</h3>
                      ${this.stepTitles
                        .map((title, index) => {
                          const step = index + 1;
                          const progress = this.calcProgress(step);
                          const isActive = step === this.currentStep;
                          return `
                          <div class="step-item ${isActive ? "active" : ""}" data-step="${step}">
                              <div class="step-title">${step}. ${title}</div>
                              <div class="step-progress-info">
                                  <span>Progress</span>
                                  <span id="step-text-${step}">${progress}%</span>
                              </div>
                              <div class="step-progress-bar">
                                  <div id="step-bar-${step}" class="step-progress-fill" style="width: ${progress}%"></div>
                              </div>
                          </div>`;
                        })
                        .join("")}
                  </div>
              </div>

              <div class="widget-navigation">
                  <button class="prev-btn" ${this.currentStep === 1 ? "disabled" : ""}>
                      <i class="fas fa-arrow-left"></i>
                      Previous
                  </button>
                  <button class="next-btn">
                      ${this.currentStep === this.totalSteps ? "Complete Course" : "Next Step"}
                      <i class="fas fa-arrow-right"></i>
                  </button>
              </div>
          </div>`;
      }

      updateHeader() {
        let totalPercent = 0;
        for (let i = 1; i <= this.totalSteps; i++) {
          totalPercent += this.calcProgress(i);
        }
        const percent = Math.round(totalPercent / this.totalSteps);
        const bar = document.getElementById("header-bar");
        const text = document.getElementById("header-text");
        if (bar) bar.style.width = percent + "%";
        if (text) text.textContent = percent + "% Complete";
      }

      bindNav() {
        document.addEventListener("click", (e) => {
          if (!document.getElementById("ghl-tutorial-overlay")) return;

          if (e.target.closest(".next-btn")) {
            if (this.currentStep < this.totalSteps) {
              this.currentStep++;
              this.render();
              this.bindVideo();
              this.updateHeader();
            } else {
              this.completeCourse();
            }
          }

          if (e.target.closest(".prev-btn") && this.currentStep > 1) {
            this.currentStep--;
            this.render();
            this.bindVideo();
            this.updateHeader();
          }

          if (e.target.closest(".step-item")) {
            const step = parseInt(e.target.closest(".step-item").dataset.step, 10);
            if (step !== this.currentStep) {
              this.currentStep = step;
              this.render();
              this.bindVideo();
              this.updateHeader();
            }
          }
        });
      }

      bindVideo() {
        const video = document.getElementById("main-video");
        const loading = document.getElementById("video-loading");
        const state = this.videoStates[this.currentStep];

        if (!video) return;

        if (loading) loading.style.display = "flex";

        video.addEventListener("loadedmetadata", () => {
          state.duration = video.duration;
          if (video.currentTime < state.currentTime) {
            video.currentTime = state.currentTime;
          }
          this.updateStepProgressBar();
          this.updateHeader();
          if (loading) loading.style.display = "none";
        });

        video.addEventListener("timeupdate", () => {
          if (video.currentTime > state.currentTime) {
            state.currentTime = video.currentTime;
            this.updateStepProgressBar();
            this.updateHeader();
          }
        });

        video.addEventListener("ended", () => {
          state.completed = true;
          localStorage.setItem("videoProgressGHL", JSON.stringify(this.videoStates));
          this.updateStepProgressBar();
          this.updateHeader();
        });

        video.addEventListener("waiting", () => {
          if (loading) loading.style.display = "flex";
        });

        video.addEventListener("playing", () => {
          if (loading) loading.style.display = "none";
        });

        video.addEventListener("error", () => {
          if (loading) loading.style.display = "none";
        });

        video.playbackRate = this.currentSpeed;
        video.load();
      }

      updateStepProgressBar() {
        const step = this.currentStep;
        const p = this.calcProgress(step);
        const bar = document.getElementById("step-bar-" + step);
        const text = document.getElementById("step-text-" + step);
        if (bar) bar.style.width = p + "%";
        if (text) text.textContent = p + "%";
      }

      completeCourse() {
        alert("Congratulations! You have completed all tutorial steps.");
        localStorage.removeItem("videoProgressGHL");
        if (this.onComplete) this.onComplete();
      }
    }

    // Init widget
    if (!window.ghlTutorialWidget) {
      window.ghlTutorialWidget = new GHLSidebarWidget({
        onComplete: function () {
          // Mark as watched only on completion
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
        },
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
        fired = false; // allow retry if something fails
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
      subtree: true,
    });
  }

  // Start immediately
  waitForTargetThenTriggerOnViewport();

