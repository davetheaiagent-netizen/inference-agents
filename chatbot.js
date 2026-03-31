/* Inference Agents — Aria AI Chat Widget
   Aria is the AI sales assistant for Inference Agents.
   Sector-aware, quick-reply pills, markdown rendering, CTA buttons. */

(function () {
  'use strict';

  // ── Sector detection ────────────────────────────────────
  function detectSector() {
    const p = window.location.pathname;
    if (p.includes('hospitality')) return 'hospitality';
    if (p.includes('retail')) return 'retail';
    if (p.includes('professional-services')) return 'professional';
    if (p.includes('healthcare')) return 'healthcare';
    if (p.includes('pricing')) return 'pricing';
    if (p.includes('roi-calculator')) return 'roi';
    return 'general';
  }

  const sector = detectSector();

  const GREETINGS = {
    hospitality: {
      text: "👋 Hi, I'm **Aria** — the AI assistant for Inference Agents.\n\nI see you're exploring our hospitality solutions. Whether you're running a hotel, restaurant or pub, I can tell you exactly which agents would suit your business and what they'd save you.\n\nWhat's the biggest admin headache right now?",
      pills: ['What does it cost?', 'Cut guest comms workload', 'Handle reviews automatically', 'How quickly can I go live?']
    },
    retail: {
      text: "👋 Hi, I'm **Aria** — the AI assistant for Inference Agents.\n\nLooks like you're exploring AI for retail or eCommerce. I can walk you through which agents would make the biggest difference for your business.\n\nWhat's taking up most of your team's time right now?",
      pills: ['What does it cost?', 'Handle customer queries automatically', 'Recover abandoned carts', 'How quickly can I go live?']
    },
    professional: {
      text: "👋 Hi, I'm **Aria** — the AI assistant for Inference Agents.\n\nI see you're looking at AI for professional services. Most law firms and accountancy practices lose 30–40% of billable time to admin — that's what we fix.\n\nWhat area would make the biggest difference to automate first?",
      pills: ['What does it cost?', 'Chase overdue invoices', 'Handle client comms', 'Generate standard documents']
    },
    healthcare: {
      text: "👋 Hi, I'm **Aria** — the AI assistant for Inference Agents.\n\nI can see you're exploring our healthcare solutions. Most clinics and dental practices we work with save £3–5k per month — usually by cutting did-not-attend rates and automating admin.\n\nWhat's the biggest drain on your team right now?",
      pills: ['What does it cost?', 'Reduce no-show appointments', 'Automate booking & reminders', 'Handle patient queries 24/7']
    },
    pricing: {
      text: "👋 Hi, I'm **Aria** — the AI assistant for Inference Agents.\n\nI can help you figure out which plan makes sense for your business. The quick answer: most UK SMEs start on the **Growth Package at £199/month** — that's 3 agents covering your biggest time drains.\n\nWhat sector are you in?",
      pills: ['I run a hospitality business', 'I run a retail business', 'I run a professional services firm', 'I work in healthcare']
    },
    roi: {
      text: "👋 Hi, I'm **Aria** — the AI assistant for Inference Agents.\n\nI see you're calculating potential savings — great first step. The average client saves **£3,000–£4,200/month**, and most see ROI within the first 30 days.\n\nWant me to walk you through what the savings look like for your specific sector?",
      pills: ['Yes — hospitality', 'Yes — retail', 'Yes — professional services', 'Yes — healthcare / wellness']
    },
    general: {
      text: "👋 Hi, I'm **Aria** — the AI assistant for Inference Agents.\n\nWe help UK businesses replace expensive back-office admin with AI agents that work 24/7 — from £99/month. The average client saves £3,000+ per month.\n\nWhat type of business are you running?",
      pills: ['Hospitality (hotel / restaurant / pub)', 'Retail or eCommerce', 'Professional services (law / accountancy)', 'Healthcare or wellness', 'Other type of business']
    }
  };

  const NOTIF_TEXT = {
    hospitality: '<strong>👋 Quick question?</strong>Thinking about cutting admin costs in your hospitality business? Ask Aria anything.',
    retail:       '<strong>👋 Quick question?</strong>Want to know which AI agents would work for your retail business? Ask Aria.',
    professional: '<strong>👋 Quick question?</strong>Wondering how AI could free up billable time? Ask Aria anything.',
    healthcare:   '<strong>👋 Quick question?</strong>Want to know how much AI could save your practice? Ask Aria.',
    pricing:      '<strong>👋 Not sure which plan?</strong>Aria can help you pick the right one for your business.',
    roi:          '<strong>👋 Want a quick estimate?</strong>Aria can walk you through your potential savings in 2 minutes.',
    general:      '<strong>👋 Quick question?</strong>Aria can tell you exactly how AI automation could work for your business.'
  };

  // ── Inject CSS ──────────────────────────────────────────
  const css = `
    #ia-widget {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9990;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .ia-btn {
      width: 58px; height: 58px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      border: none;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 24px rgba(99,102,241,0.55), 0 0 50px rgba(99,102,241,0.18);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      position: relative;
      outline: none;
    }
    .ia-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 32px rgba(99,102,241,0.65), 0 0 70px rgba(99,102,241,0.22);
    }
    .ia-btn-ping {
      position: absolute; top: 4px; right: 4px;
      width: 11px; height: 11px;
      background: #10b981; border-radius: 50%;
      box-shadow: 0 0 7px #10b981;
    }
    .ia-btn-ping::after {
      content: '';
      position: absolute; inset: -3px;
      border-radius: 50%;
      background: #10b981;
      animation: ia-ping 2s ease-out infinite;
    }

    .ia-notif {
      position: absolute; bottom: 68px; right: 0;
      width: 260px;
      background: #0d0d24;
      border: 1px solid rgba(99,102,241,0.35);
      border-radius: 14px;
      padding: 14px 36px 14px 16px;
      font-size: 13px; color: #cbd5e1; line-height: 1.5;
      box-shadow: 0 12px 40px rgba(0,0,0,0.55), 0 0 40px rgba(99,102,241,0.1);
      cursor: pointer;
      animation: ia-slideup 0.35s ease;
    }
    .ia-notif strong { color: #f1f5f9; display: block; margin-bottom: 4px; font-size: 14px; }
    .ia-notif-x {
      position: absolute; top: 10px; right: 12px;
      background: none; border: none; color: #475569;
      cursor: pointer; font-size: 14px; line-height: 1; padding: 0;
    }
    .ia-notif-x:hover { color: #94a3b8; }

    .ia-win {
      position: absolute; bottom: 68px; right: 0;
      width: 380px; height: 540px;
      background: #08081c;
      border: 1px solid rgba(99,102,241,0.28);
      border-radius: 20px;
      overflow: hidden;
      display: flex; flex-direction: column;
      box-shadow: 0 24px 70px rgba(0,0,0,0.65), 0 0 60px rgba(99,102,241,0.14);
      animation: ia-slideup 0.3s ease;
    }

    .ia-head {
      padding: 14px 18px;
      background: linear-gradient(135deg, rgba(99,102,241,0.14), rgba(16,185,129,0.07));
      border-bottom: 1px solid rgba(255,255,255,0.07);
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0;
    }
    .ia-head-left { display: flex; align-items: center; gap: 11px; }
    .ia-avatar {
      width: 38px; height: 38px;
      background: linear-gradient(135deg, rgba(99,102,241,0.3), rgba(16,185,129,0.15));
      border: 1px solid rgba(99,102,241,0.4);
      border-radius: 11px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .ia-head-name { font-size: 14px; font-weight: 700; color: #f1f5f9; }
    .ia-head-sub { font-size: 11px; color: #94a3b8; margin-top: 1px; }
    .ia-head-status { display: flex; align-items: center; gap: 5px; }
    .ia-online-dot {
      width: 7px; height: 7px;
      background: #10b981; border-radius: 50%;
      box-shadow: 0 0 6px #10b981;
      animation: ia-ping 2.5s ease-out infinite;
    }
    .ia-head-close {
      width: 28px; height: 28px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 8px; color: #94a3b8; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; transition: all 0.2s; outline: none;
    }
    .ia-head-close:hover { background: rgba(255,255,255,0.11); color: #f1f5f9; }

    .ia-msgs {
      flex: 1; overflow-y: auto;
      padding: 14px; display: flex; flex-direction: column; gap: 10px;
      scrollbar-width: thin;
      scrollbar-color: rgba(99,102,241,0.25) transparent;
    }
    .ia-msgs::-webkit-scrollbar { width: 4px; }
    .ia-msgs::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.25); border-radius: 2px; }

    .ia-msg { display: flex; max-width: 90%; animation: ia-slideup 0.18s ease; }
    .ia-msg.bot { align-self: flex-start; }
    .ia-msg.user { align-self: flex-end; }
    .ia-bubble {
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13.5px; line-height: 1.6;
    }
    .ia-msg.bot .ia-bubble {
      background: rgba(99,102,241,0.1);
      border: 1px solid rgba(99,102,241,0.18);
      color: #cbd5e1;
      border-bottom-left-radius: 4px;
    }
    .ia-msg.user .ia-bubble {
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .ia-bubble a { color: #818cf8; text-decoration: underline; }
    .ia-bubble strong { color: #f1f5f9; }

    /* CTA book button inside messages */
    .ia-cta-link {
      display: inline-block;
      margin-top: 10px;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: #fff !important;
      padding: 9px 18px;
      border-radius: 9px;
      text-decoration: none !important;
      font-size: 13px;
      font-weight: 600;
      transition: opacity 0.2s;
      box-shadow: 0 4px 14px rgba(99,102,241,0.4);
    }
    .ia-cta-link:hover { opacity: 0.85; }

    /* Quick reply pills */
    .ia-pills {
      display: flex; flex-wrap: wrap; gap: 6px;
      padding: 2px 0 4px;
      animation: ia-slideup 0.22s ease;
      align-self: flex-start;
      max-width: 100%;
    }
    .ia-pill {
      background: rgba(99,102,241,0.1);
      border: 1px solid rgba(99,102,241,0.28);
      border-radius: 100px;
      color: #818cf8;
      font-size: 12px; font-weight: 500;
      padding: 6px 13px;
      cursor: pointer;
      transition: all 0.18s;
      font-family: 'Outfit', sans-serif;
      white-space: nowrap;
      outline: none;
    }
    .ia-pill:hover {
      background: rgba(99,102,241,0.22);
      border-color: rgba(99,102,241,0.5);
      color: #f1f5f9;
      transform: translateY(-1px);
    }

    /* Typing */
    .ia-typing {
      padding: 2px 14px 6px;
      display: flex; gap: 4px; align-items: center;
      height: 28px; flex-shrink: 0;
    }
    .ia-typing span {
      width: 7px; height: 7px;
      background: #6366f1; border-radius: 50%;
      animation: ia-bounce 1.1s infinite;
    }
    .ia-typing span:nth-child(2) { animation-delay: 0.18s; }
    .ia-typing span:nth-child(3) { animation-delay: 0.36s; }

    /* Input */
    .ia-foot {
      padding: 10px 14px;
      border-top: 1px solid rgba(255,255,255,0.07);
      background: rgba(0,0,0,0.18);
      display: flex; gap: 8px; flex-shrink: 0;
    }
    .ia-input {
      flex: 1;
      background: rgba(255,255,255,0.055);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; color: #f1f5f9;
      font-family: 'Outfit', sans-serif;
      font-size: 13.5px; padding: 9px 13px;
      outline: none; transition: border-color 0.2s; resize: none;
    }
    .ia-input:focus { border-color: rgba(99,102,241,0.45); }
    .ia-input::placeholder { color: #3d4f68; }
    .ia-send {
      width: 38px; height: 38px;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      border: none; border-radius: 10px; color: white;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s; flex-shrink: 0; outline: none;
    }
    .ia-send:hover { transform: scale(1.07); box-shadow: 0 4px 16px rgba(99,102,241,0.45); }
    .ia-send:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }

    /* Powered by strip */
    .ia-powered {
      text-align: center;
      padding: 5px 0 7px;
      font-size: 10px;
      color: #334155;
      flex-shrink: 0;
    }
    .ia-powered a { color: #475569; text-decoration: none; }
    .ia-powered a:hover { color: #6366f1; }

    @keyframes ia-ping {
      0% { transform: scale(1); opacity: 0.7; }
      100% { transform: scale(2.6); opacity: 0; }
    }
    @keyframes ia-slideup {
      from { opacity: 0; transform: translateY(16px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes ia-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-5px); }
    }

    .ia-hidden { display: none !important; }

    @media (max-width: 480px) {
      #ia-widget { bottom: 16px; right: 16px; }
      .ia-win { width: calc(100vw - 32px); right: -4px; bottom: 66px; height: 480px; }
      .ia-notif { width: 230px; }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── Inject HTML ─────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'ia-widget';
  root.innerHTML = `
    <div class="ia-notif ia-hidden" id="ia-notif">
      <button class="ia-notif-x" id="ia-notif-x" aria-label="Dismiss">✕</button>
      ${NOTIF_TEXT[sector] || NOTIF_TEXT.general}
    </div>

    <div class="ia-win ia-hidden" id="ia-win">
      <div class="ia-head">
        <div class="ia-head-left">
          <div class="ia-avatar">✦</div>
          <div>
            <div class="ia-head-name">Aria</div>
            <div class="ia-head-sub ia-head-status">
              <span class="ia-online-dot"></span>
              <span style="color:#94a3b8;font-size:11px;">AI Assistant · Inference Agents</span>
            </div>
          </div>
        </div>
        <button class="ia-head-close" id="ia-close" aria-label="Close chat">✕</button>
      </div>
      <div class="ia-msgs" id="ia-msgs"></div>
      <div class="ia-typing ia-hidden" id="ia-typing">
        <span></span><span></span><span></span>
      </div>
      <div class="ia-foot">
        <input class="ia-input" id="ia-input" type="text"
          placeholder="Ask Aria anything…" maxlength="500" autocomplete="off" />
        <button class="ia-send" id="ia-send" aria-label="Send">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <div class="ia-powered">Powered by <a href="https://inference-agents.com" target="_blank">Inference Agents</a> · Built on Claude</div>
    </div>

    <button class="ia-btn" id="ia-btn" aria-label="Chat with Aria">
      ✦
      <span class="ia-btn-ping"></span>
    </button>
  `;
  document.body.appendChild(root);

  // ── State ───────────────────────────────────────────────
  let history = [];
  let open = false;
  let busy = false;
  let greeted = false;
  let greetingDone = false;
  let pillsShown = false;

  const btn    = document.getElementById('ia-btn');
  const win    = document.getElementById('ia-win');
  const msgs   = document.getElementById('ia-msgs');
  const input  = document.getElementById('ia-input');
  const send   = document.getElementById('ia-send');
  const typing = document.getElementById('ia-typing');
  const notif  = document.getElementById('ia-notif');
  const notifX = document.getElementById('ia-notif-x');
  const closeB = document.getElementById('ia-close');

  // ── Text formatting ─────────────────────────────────────
  function formatText(text) {
    // Replace consultation URL with placeholder before escaping
    const CONSULT = '%%CONSULT%%';
    let out = text.replace(/https:\/\/inference-agents\.com\/consultation\.html/g, CONSULT);

    // Escape HTML
    out = out
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Markdown bold
    out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Remaining inference-agents.com URLs → links
    out = out.replace(
      /https:\/\/inference-agents\.com\/[^\s<]*/g,
      url => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`
    );

    // External URLs — only allow http/https, never javascript:
    out = out.replace(
      /https?:\/\/(?!inference-agents\.com)[^\s<"']+/g,
      url => {
        const safe = url.replace(/"/g, '&quot;');
        return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`;
      }
    );

    // Restore consultation URL as CTA button
    out = out.replace(
      /%%CONSULT%%/g,
      '<a href="https://inference-agents.com/consultation.html" class="ia-cta-link">📅 Book Free Call →</a>'
    );

    // Line breaks
    return out.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
  }

  function addMsg(role, html) {
    // Remove pills when user sends a message
    if (role === 'user') removePills();

    const d = document.createElement('div');
    d.className = `ia-msg ${role}`;
    d.innerHTML = `<div class="ia-bubble">${html}</div>`;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function addPills(pills) {
    if (pillsShown) return;
    pillsShown = true;
    const container = document.createElement('div');
    container.className = 'ia-pills';
    container.id = 'ia-pills';
    pills.forEach(label => {
      const pill = document.createElement('button');
      pill.className = 'ia-pill';
      pill.textContent = label;
      pill.addEventListener('click', () => {
        container.remove();
        input.value = label;
        sendMessage();
      });
      container.appendChild(pill);
    });
    msgs.appendChild(container);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removePills() {
    const p = document.getElementById('ia-pills');
    if (p) p.remove();
  }

  function setBusy(state) {
    busy = state;
    send.disabled = state;
    typing.classList.toggle('ia-hidden', !state);
    if (state) msgs.scrollTop = msgs.scrollHeight;
  }

  // ── Chat open/close ─────────────────────────────────────
  function openChat() {
    open = true;
    win.classList.remove('ia-hidden');
    notif.classList.add('ia-hidden');
    input.focus();

    if (!greetingDone) {
      greetingDone = true;
      const g = GREETINGS[sector] || GREETINGS.general;

      // Brief delay to feel natural
      setTimeout(() => {
        setBusy(true);
        setTimeout(() => {
          setBusy(false);
          addMsg('bot', formatText(g.text));
          // Add to history as plain text (for API context)
          history.push({
            role: 'assistant',
            content: g.text.replace(/\*\*/g, '')
          });
          // Show quick reply pills
          setTimeout(() => addPills(g.pills), 180);
        }, 700);
      }, 300);
    }
  }

  function closeChat() {
    open = false;
    win.classList.add('ia-hidden');
  }

  // ── Send message ────────────────────────────────────────
  function isRateLimited() {
    const now = Date.now();
    const key = 'ia_chat_times';
    const times = JSON.parse(localStorage.getItem(key) || '[]').filter(t => now - t < 60000);
    if (times.length >= 20) return true;
    times.push(now);
    localStorage.setItem(key, JSON.stringify(times));
    return false;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || busy) return;

    if (isRateLimited()) {
      addMsg('bot', formatText("You're sending messages very quickly — please wait a moment before continuing."));
      return;
    }

    addMsg('user', formatText(text));
    history.push({ role: 'user', content: text });
    input.value = '';
    setBusy(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          page: window.location.pathname
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.reply) {
        addMsg('bot', formatText(data.reply));
        history.push({ role: 'assistant', content: data.reply });
      } else {
        throw new Error('empty reply');
      }
    } catch (err) {
      addMsg('bot', "Something went wrong on my end — sorry about that. You can <a href='/consultation.html' class='ia-cta-link'>📅 Book Free Call →</a> and we'll help directly.");
    }

    setBusy(false);
  }

  // ── Events ──────────────────────────────────────────────
  btn.addEventListener('click', () => open ? closeChat() : openChat());
  closeB.addEventListener('click', closeChat);
  send.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  notif.addEventListener('click', e => { if (e.target !== notifX) openChat(); });
  notifX.addEventListener('click', e => {
    e.stopPropagation();
    notif.classList.add('ia-hidden');
    greeted = true;
  });

  // ── Auto notification ────────────────────────────────────
  function showNotif() {
    if (greeted || open) return;
    greeted = true;
    notif.classList.remove('ia-hidden');
    setTimeout(() => notif.classList.add('ia-hidden'), 14000);
  }

  setTimeout(showNotif, 16000);

  let scrollFired = false;
  window.addEventListener('scroll', () => {
    if (scrollFired) return;
    const pct = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
    if (pct > 0.45) { scrollFired = true; showNotif(); }
  }, { passive: true });

})();
