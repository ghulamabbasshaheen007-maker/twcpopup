function TWCX_ensureStyles() {
    if (document.getElementById("TWCX_styles")) return;

    // First, add Font Awesome CDN
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

#TWCX_overlay_root .lock-indicator i {
  font-size: 0.6rem;
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
  font-family: 'Font Awesome 6 Free', sans-serif;
  font-weight: 900;
}

#TWCX_chat_root .close-widget:hover {
  background: rgba(210, 180, 140, 0.3);
  transform: rotate(90deg);
}

#TWCX_chat_root .close-widget i {
  font-size: 18px;
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

/* Font Awesome icons */
#TWCX_chat_root i {
  font-family: 'Font Awesome 6 Free';
  font-weight: 900;
  font-style: normal;
}

#TWCX_chat_root .chat-toggle-btn i {
  font-size: 22px;
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
