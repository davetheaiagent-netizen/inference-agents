// Cloudflare Pages Function — protects /mission-control.html with Basic Auth
// Password is stored as CF Pages secret: MC_PASSWORD
// Set it via: wrangler pages secret put MC_PASSWORD --project-name=inference-agents

export async function onRequest(context) {
  const { request, env } = context;
  const password = env.MC_PASSWORD || 'changeme';
  
  const auth = request.headers.get('Authorization');
  
  if (auth && auth.startsWith('Basic ')) {
    const decoded = atob(auth.slice(6));
    const [, pass] = decoded.split(':');
    if (pass === password) {
      return context.next();
    }
  }

  return new Response(
    `<!DOCTYPE html><html><head><title>Mission Control — Restricted</title>
    <style>
      body{background:#05050f;color:#f1f5f9;font-family:'Outfit',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
      .box{text-align:center;padding:40px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;max-width:360px}
      h1{background:linear-gradient(135deg,#10b981,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:24px;margin-bottom:8px}
      p{color:#94a3b8;font-size:14px;margin-bottom:24px}
      input{width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#f1f5f9;padding:14px 16px;border-radius:10px;font-size:15px;box-sizing:border-box;margin-bottom:12px}
      input:focus{outline:none;border-color:#10b981}
      button{width:100%;background:linear-gradient(135deg,#6366f1,#3b82f6);color:#fff;border:none;padding:14px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer}
    </style></head>
    <body>
      <div class="box">
        <h1>🎛️ Mission Control</h1>
        <p>Restricted area — authorised access only</p>
        <form id="f" onsubmit="login(event)">
          <input type="password" id="p" placeholder="Enter password" autofocus>
          <button type="submit">Unlock</button>
        </form>
        <p id="err" style="color:#ef4444;margin-top:12px;display:none">Incorrect password</p>
      </div>
      <script>
        function login(e) {
          e.preventDefault();
          const p = document.getElementById('p').value;
          const headers = new Headers({'Authorization': 'Basic ' + btoa(':' + p)});
          fetch('/mission-control.html', {headers}).then(r => {
            if (r.ok) { window.location.reload(); }
            else { document.getElementById('err').style.display='block'; }
          });
        }
      </script>
    </body></html>`,
    {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Mission Control"',
        'Content-Type': 'text/html'
      }
    }
  );
}
