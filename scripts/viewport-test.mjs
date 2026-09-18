// Teste de overflow horizontal no mobile.
// Abre cada tela do app em Chrome headless (via DevTools Protocol) nas larguras
// informadas, com as chamadas ao Supabase mockadas (nada é gravado no banco),
// e lista qualquer elemento que ultrapasse a viewport. Salva screenshots.
//
// Uso (com `npm run dev` rodando em outro terminal):
//   npm run test:viewport
//   node scripts/viewport-test.mjs [baseUrl] [outDir] [larguras] [telas]
//   ex: node scripts/viewport-test.mjs http://localhost:5173 .viewport-test 360,375,393 home,player
// Vars: CHROME=<caminho do chrome/edge>  VITE_SUPABASE_URL (ou lê do .env)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [BASE = 'http://localhost:5173', OUT_ARG = '.viewport-test', WIDTHS = '360,375,393', ONLY = ''] = process.argv.slice(2);
const CHROME = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find(existsSync);
if (!CHROME) { console.error('Chrome/Edge não encontrado. Defina CHROME=<caminho do executável>.'); process.exit(1); }
const PORT = 9333;
// ref do projeto Supabase: só pra saber quais requests interceptar
const SB_URL = process.env.VITE_SUPABASE_URL || (existsSync(".env") ? (readFileSync(".env", "utf8").match(/^VITE_SUPABASE_URL=(\S+)/m) || [])[1] : "");
const REF = SB_URL ? new URL(SB_URL).hostname.split(".")[0] : "";
if (!REF) { console.error('VITE_SUPABASE_URL não encontrada (env ou .env).'); process.exit(1); }
const OUT = resolve(OUT_ARG);
mkdirSync(OUT, { recursive: true });

// ---------- mock data ----------
const KEYS = ['finalizacao','chute_fora','passe','drible','marcacao','posicionamento','visao','pique','coletividade','nota_geral'];
const sc = (b) => Object.fromEntries(KEYS.map((k, i) => [k, Math.min(10, Math.max(0, b + ((i * 7) % 5) - 2))]));
const P = [
  ['11111111-1111-4111-8111-111111111111', 'Fabi'],
  ['22222222-2222-4222-8222-222222222222', 'Carlos Eduardo'],
  ['33333333-3333-4333-8333-333333333333', 'Zé'],
  ['44444444-4444-4444-8444-444444444444', 'Pedro Henrique Albuquerque'],
  ['55555555-5555-4555-8555-555555555555', 'Guilherme'],
  ['66666666-6666-4666-8666-666666666666', 'Teste'],
].map(([id, name]) => ({ id, name, active: true }));
const ME = P[0];
const ASSESS = [];
P.forEach((r, i) => P.forEach((t, j) => ASSESS.push({ id: `${i}${j}`, rater_id: r.id, ratee_id: t.id, is_self: i === j, scores: sc(4 + ((i + j) % 6)) })));
const USER = { id: '99999999-9999-4999-8999-999999999999', aud: 'authenticated', role: 'authenticated', email: 'tecnico@meiaboca.com.br', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const JWT = `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub: USER.id, role: 'authenticated', aud: 'authenticated', email: USER.email, iat: now, exp: now + 31536000 })}.sig`;
const SESSION = { access_token: JWT, token_type: 'bearer', expires_in: 31536000, expires_at: now + 31536000, refresh_token: 'fake-refresh', user: USER };

function mock(req) {
  const u = new URL(req.url), m = req.method, acc = req.headers['Accept'] || req.headers['accept'] || '';
  const single = acc.includes('vnd.pgrst.object');
  let body = null, code = 200;
  if (m === 'OPTIONS') { code = 204; }
  else if (u.pathname.startsWith('/auth/v1/')) body = u.pathname.endsWith('/user') ? USER : SESSION;
  else if (u.pathname === '/rest/v1/players') body = m === 'GET' ? (single ? ME : u.searchParams.get('id') ? [ME] : P.map(({ id, name, active }) => ({ id, name, active }))) : (single ? { id: ME.id } : [{ id: ME.id }]);
  else if (u.pathname === '/rest/v1/assessments') body = m === 'GET' ? ASSESS : [];
  else if (u.pathname === '/rest/v1/rpc/get_my_progress') body = [{ self_done: true, rated_ids: [P[1].id, P[2].id] }];
  else if (u.pathname === '/rest/v1/rpc/get_my_assessment') body = [{ scores: sc(6), is_self: false }];
  else if (u.pathname === '/rest/v1/rpc/save_my_assessment') body = null;
  else { code = 404; body = { message: 'unmocked ' + u.pathname }; }
  const headers = [
    { name: 'Access-Control-Allow-Origin', value: '*' },
    { name: 'Access-Control-Allow-Headers', value: '*' },
    { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
    { name: 'Content-Type', value: 'application/json' },
  ];
  return { code, headers, body: Buffer.from(body === null && code !== 204 ? 'null' : body === null ? '' : JSON.stringify(body)).toString('base64') };
}

// ---------- CDP plumbing ----------
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Map();
    ws.onmessage = (e) => { const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
      else if (m.method && this.handlers.has(m.method)) this.handlers.get(m.method)(m.params); }; }
  send(method, params = {}) { return new Promise((res, rej) => { const id = ++this.id; this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  on(method, fn) { this.handlers.set(method, fn); }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || '')); return r.result.value; }
  async waitFor(pred, ms = 10000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await this.eval(pred)) return true; } catch {} await sleep(150); } return false; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.onopen = () => res(new CDP(ws)); ws.onerror = (e) => rej(new Error('ws error')); });

const MEASURE = `(() => { const vw = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth, bsw = document.body.scrollWidth;
  const off = new Set(); document.querySelectorAll('body *').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && (r.right > vw + 0.5 || r.left < -0.5)) off.add(el); });
  const outer = [...off].filter(el => !off.has(el.parentElement)).map(el => ({ tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 70), left: Math.round(el.getBoundingClientRect().left), right: Math.round(el.getBoundingClientRect().right), w: Math.round(el.getBoundingClientRect().width), text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) }));
  return { vw, sw, bsw, overflow: Math.max(sw, bsw) > vw, count: off.size, outer: outer.slice(0, 12) }; })()`;

const READY_LOADING_GONE = `!/carregando/i.test(document.body.innerText)`;
const clickBtn = (re) => `(() => { const b = [...document.querySelectorAll('button')].find(b => ${re}.test(b.textContent.trim())); if (!b) throw new Error('button not found ${re}'); b.click(); return true; })()`;

// ---------- scenarios ----------
const SCEN = {
  'home':          { path: '/',            ls: {},                          ready: `!!document.querySelector('form') && ${READY_LOADING_GONE}` },
  'player':        { path: '/eu',          ls: { rachao_player_id: ME.id }, ready: `/progresso/.test(document.body.innerText)` },
  'assess-self':   { path: '/eu',          ls: { rachao_player_id: ME.id }, ready: `/progresso/.test(document.body.innerText)`, steps: [[clickBtn('/auto-avalia/i'), `document.querySelectorAll('input[type=range]').length >= 9`]] },
  'assess-peer':   { path: '/eu',          ls: { rachao_player_id: ME.id }, ready: `/progresso/.test(document.body.innerText)`, steps: [[clickBtn('/^Pedro Henrique/'), `document.querySelectorAll('input[type=range]').length >= 10`]] },
  'admin-login':   { path: '/admin/login', ls: {},                          ready: `!!document.querySelector('input[type=email]')` },
  'admin-elenco':  { path: '/admin',       ls: { [`sb-${REF}-auth-token`]: JSON.stringify(SESSION) }, ready: `/painel do técnico/i.test(document.body.innerText) && ${READY_LOADING_GONE}` },
  'admin-sorteio': { path: '/admin',       ls: { [`sb-${REF}-auth-token`]: JSON.stringify(SESSION) }, ready: `/painel do técnico/i.test(document.body.innerText) && ${READY_LOADING_GONE}`,
                     steps: [[clickBtn('/^sortear$/i'), `/quem veio/i.test(document.body.innerText)`], [clickBtn('/^todos$/i'), `/6 selecionados/.test(document.body.innerText)`], [clickBtn('/^sortear times$/i'), `/equilíbrio/i.test(document.body.innerText)`]] },
};

// ---------- runner ----------
async function run() {
  const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, '--headless=new', `--user-data-dir=${join(OUT, 'profile')}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--window-size=500,900', 'about:blank'], { stdio: 'ignore' });
  try {
    let up = false;
    for (let i = 0; i < 100 && !up; i++) { if (chrome.exitCode !== null) throw new Error(`Chrome saiu com código ${chrome.exitCode} (${CHROME})`); try { await fetch(`http://127.0.0.1:${PORT}/json/version`); up = true; } catch { await sleep(200); } }
    if (!up) throw new Error('Chrome não respondeu na porta ' + PORT);
    const widths = WIDTHS.split(',').map(Number);
    const names = Object.keys(SCEN).filter((n) => !ONLY || ONLY.split(',').includes(n));
    const results = [];
    for (const name of names) for (const w of widths) {
      const s = SCEN[name];
      const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
      const c = await connect(t.webSocketDebuggerUrl);
      let err = '';
      try {
        await c.send('Page.enable'); await c.send('Runtime.enable');
        await c.send('Fetch.enable', { patterns: [{ urlPattern: `*${REF}.supabase.co*`, requestStage: 'Request' }] });
        c.on('Fetch.requestPaused', (p) => { const r = mock(p.request); c.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: r.code, responseHeaders: r.headers, body: r.body }).catch(() => {}); });
        await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 2, mobile: true });
        await c.send('Emulation.setTouchEmulationEnabled', { enabled: true });
        const lsInit = Object.entries(s.ls).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join('');
        await c.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.clear();${lsInit}}catch(e){}` });
        await c.send('Page.navigate', { url: BASE + s.path });
        if (!(await c.waitFor(s.ready))) err += 'ready-timeout; ';
        for (const [action, until] of s.steps || []) { await c.eval(action); if (!(await c.waitFor(until))) err += 'step-timeout; '; }
        await c.waitFor(`document.fonts.status === 'loaded'`, 5000); await sleep(400);
        const m = await c.eval(MEASURE);
        const shot = await c.send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(OUT, `${name}-${w}.png`), Buffer.from(shot.data, 'base64'));
        results.push({ name, w, ...m, err });
        const flag = m.overflow || m.count ? '✗' : '✓';
        console.log(`${flag} ${name.padEnd(14)} ${String(w).padStart(3)}px  scrollW=${Math.max(m.sw, m.bsw)}  offenders=${m.count} ${err}`);
        for (const o of m.outer) console.log(`     <${o.tag}> right=${o.right} w=${o.w} left=${o.left} "${o.text}" [${o.cls}]`);
      } catch (e) { console.log(`✗ ${name} ${w}px ERROR ${e.message}`); results.push({ name, w, err: e.message }); }
      finally { c.ws.close(); await fetch(`http://127.0.0.1:${PORT}/json/close/${t.id}`).catch(() => {}); }
    }
    writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 2));
    const bad = results.filter((r) => r.overflow || r.count || r.err);
    console.log(`\n${bad.length === 0 ? 'SEM OVERFLOW' : bad.length + ' caso(s) com overflow/erro'} em ${results.length} combinações`);
  } finally { chrome.kill(); }
}
run().catch((e) => { console.error(e); process.exit(1); });
