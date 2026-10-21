const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
const GIFEncoder = require('gifencoder'); // npm install gifencoder
const { findUid } = global.utils;

// ── Font loading (optional – works without fonts too) ──────────────────────
try {
  registerFont(path.join(__dirname, 'cache', 'Cyberpunk.ttf'),      { family: 'Cyberpunk' });
  registerFont(path.join(__dirname, 'cache', 'DigitalDisplay.ttf'), { family: 'DigitalDisplay' });
} catch (_) { /* optional custom fonts missing: system fonts are used */ }

// ══════════════════════════════════════════════════════════════════
//  HELPER: draw hexagon path
// ══════════════════════════════════════════════════════════════════
function hexPath(ctx, cx, cy, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + rot;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// ══════════════════════════════════════════════════════════════════
//  HELPER: rounded rectangle path
// ══════════════════════════════════════════════════════════════════
function rrPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);  ctx.arcTo(x, y + h,     x, y + h - r,   r);
  ctx.lineTo(x, y + r);      ctx.arcTo(x, y,          x + r, y,       r);
  ctx.closePath();
}

// ══════════════════════════════════════════════════════════════════
//  MAIN: render one frame of the 3D cyberpunk banner
//  t = animation time in radians (0 → static, pass 0 for thumbnail)
// ══════════════════════════════════════════════════════════════════
async function renderFrame(canvas, ctx, name, uid, avatarImg, t) {
  const W = canvas.width, H = canvas.height;

  // ── Background ──────────────────────────────────────────────────
  ctx.fillStyle = '#020b16';
  ctx.fillRect(0, 0, W, H);

  // Scanlines
  for (let y = 0; y < H; y += 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, y, W, 1);
  }

  // Animated grid
  const gs = 40;
  const gox = (t * 20) % gs;
  ctx.strokeStyle = 'rgba(0,180,255,0.07)';
  ctx.lineWidth = 0.5;
  for (let x = -gs + gox; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += gs)           { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Diagonal sweep
  const sw = (t * 60) % W;
  ctx.strokeStyle = 'rgba(0,220,255,0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sw,0);    ctx.lineTo(sw+H,H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sw-60,0); ctx.lineTo(sw+H-60,H); ctx.stroke();

  // Floating particles
  const seed = Math.floor(t * 8);
  for (let i = 0; i < 60; i++) {
    const s = (seed + i * 137.508) % 1000;
    const px = ((s * 7.3 + t * (i % 5) * 20) % W);
    const py = ((s * 3.1 + t * ((i % 3) - 1) * 15) % H + H) % H;
    const pr = 0.4 + (s % 12) / 10;
    const al = 0.3 + 0.3 * Math.sin(t * 2 + i);
    const hue = (s % 2 === 0) ? 185 : 270;
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue},100%,70%,${al})`;
    ctx.fill();
  }

  // ── Avatar area ─────────────────────────────────────────────────
  const AX = 140, AY = H / 2, AR = 85;
  const ringR = AR + 18;

  // 3D perspective hex ring (tilted)
  ctx.save();
  ctx.translate(AX, AY);
  ctx.scale(1, 0.55 + 0.08 * Math.sin(t * 1.2));
  const hexRot = t * 0.5;

  ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 40;
  ctx.strokeStyle = `rgba(0,220,255,${0.4 + 0.3 * Math.sin(t * 2)})`;
  ctx.lineWidth = 2.5;
  hexPath(ctx, 0, 0, ringR + 18, hexRot); ctx.stroke();

  ctx.strokeStyle = `rgba(0,180,255,${0.6 + 0.2 * Math.sin(t * 1.5)})`;
  ctx.lineWidth = 1.5;
  hexPath(ctx, 0, 0, ringR + 8, hexRot + 0.2); ctx.stroke();

  // Spinning perimeter dots
  const numDots = 16;
  for (let i = 0; i < numDots; i++) {
    const a = (Math.PI * 2 / numDots) * i + t * 0.8;
    const dx = (ringR + 14) * Math.cos(a), dy = (ringR + 14) * Math.sin(a);
    ctx.beginPath(); ctx.arc(dx, dy, 2.5, 0, Math.PI * 2);
    const hue = 190 + 30 * Math.sin(a + t);
    ctx.fillStyle = `hsla(${hue},100%,70%,0.9)`;
    ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 12;
    ctx.fill();
  }
  ctx.restore();

  // Orbiting 3 blobs
  ctx.save(); ctx.translate(AX, AY);
  for (let i = 0; i < 3; i++) {
    const a = t * 0.6 + (Math.PI * 2 / 3) * i;
    const ox = (AR + 28) * Math.cos(a), oy = (AR + 28) * Math.sin(a) * 0.35;
    ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI * 2);
    const hue = 190 + 40 * Math.sin(a);
    ctx.fillStyle = `hsla(${hue},100%,70%,0.85)`;
    ctx.shadowColor = `hsla(${hue},100%,70%,1)`; ctx.shadowBlur = 18;
    ctx.fill();
  }
  ctx.restore(); ctx.shadowBlur = 0;

  // Avatar image (circle clip)
  ctx.save();
  ctx.beginPath(); ctx.arc(AX, AY, AR, 0, Math.PI * 2); ctx.clip();
  if (avatarImg) {
    const iw = avatarImg.width, ih = avatarImg.height;
    const sc = Math.max((AR * 2) / iw, (AR * 2) / ih);
    const dw = iw * sc, dh = ih * sc;
    ctx.drawImage(avatarImg, AX - dw / 2, AY - dh / 2, dw, dh);
    // Subtle color overlay
    const ov = ctx.createLinearGradient(AX - AR, AY - AR, AX + AR, AY + AR);
    ov.addColorStop(0, `rgba(0,200,255,${0.08 + 0.04 * Math.sin(t * 2)})`);
    ov.addColorStop(1, `rgba(120,0,255,${0.08 + 0.04 * Math.cos(t * 2)})`);
    ctx.fillStyle = ov; ctx.fillRect(AX - AR, AY - AR, AR * 2, AR * 2);
  } else {
    // Fallback gradient avatar
    const pg = ctx.createRadialGradient(AX, AY - 10, 0, AX, AY, AR);
    pg.addColorStop(0, '#1a3060'); pg.addColorStop(1, '#060c1f');
    ctx.fillStyle = pg; ctx.fillRect(AX - AR, AY - AR, AR * 2, AR * 2);
    ctx.fillStyle = 'rgba(0,180,255,0.3)';
    ctx.beginPath(); ctx.arc(AX, AY - 20, 30, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(AX, AY + 65, 50, Math.PI, 0); ctx.fill();
  }
  ctx.restore();

  // Avatar border glow
  ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 3;
  ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 25 + 8 * Math.sin(t * 3);
  ctx.beginPath(); ctx.arc(AX, AY, AR, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Info panel ──────────────────────────────────────────────────
  const PX = 252, PY = 20, PW = W - PX - 18, PH = H - 40;

  // 3D shadow stack
  for (let d = 6; d > 0; d--) {
    ctx.fillStyle = `rgba(0,${d * 8},${d * 12},0.25)`;
    rrPath(ctx, PX + d, PY + d, PW, PH, 14); ctx.fill();
  }

  // Panel bg
  const panelG = ctx.createLinearGradient(PX, PY, PX + PW, PY + PH);
  panelG.addColorStop(0, 'rgba(4,14,36,0.95)');
  panelG.addColorStop(0.5, 'rgba(6,18,44,0.95)');
  panelG.addColorStop(1, 'rgba(4,14,36,0.95)');
  ctx.fillStyle = panelG; rrPath(ctx, PX, PY, PW, PH, 14); ctx.fill();

  // Panel border
  const bAl = 0.5 + 0.3 * Math.sin(t * 2);
  ctx.strokeStyle = `rgba(0,${Math.floor(180 + 60 * Math.sin(t))},255,${bAl})`;
  ctx.lineWidth = 2; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 20;
  rrPath(ctx, PX, PY, PW, PH, 14); ctx.stroke(); ctx.shadowBlur = 0;

  // Corner L-brackets
  const cd = 22;
  const corners = [[PX, PY, 1, 1], [PX + PW, PY, -1, 1], [PX, PY + PH, 1, -1], [PX + PW, PY + PH, -1, -1]];
  corners.forEach(([cx, cy, sx, sy]) => {
    ctx.strokeStyle = `rgba(0,220,255,${0.6 + 0.3 * Math.sin(t * 2 + cx)})`;
    ctx.lineWidth = 2.5; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(cx + sx * cd, cy); ctx.lineTo(cx + sx * 8, cy);
    ctx.lineTo(cx, cy + sy * 8); ctx.lineTo(cx, cy + sy * cd);
    ctx.stroke();
  });
  ctx.shadowBlur = 0;

  // Top accent bar
  const bx = PX + 24, bw = PW - 48;
  ctx.fillStyle = 'rgba(0,180,255,0.1)';
  ctx.fillRect(bx, PY + 16, bw, 3);
  const prog = 0.5 + 0.5 * Math.sin(t * 0.7);
  ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#00d4ff'; ctx.fillRect(bx, PY + 16, bw * prog, 3);
  ctx.shadowBlur = 0;

  // "[ PROFILE ]" tag
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = 'rgba(0,220,255,0.7)';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('[ PROFILE ]', bx, PY + 35);

  // Name – 3D extruded
  const tx = PX + PW / 2;
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.textAlign = 'center';
  for (let d = 4; d > 0; d--) {
    ctx.fillStyle = `rgba(0,${d * 20},${d * 40},0.5)`;
    ctx.fillText(name.toUpperCase(), tx + d, PY + 100 + d);
  }
  ctx.shadowColor = '#00eeff'; ctx.shadowBlur = 40;
  ctx.fillStyle = `rgba(0,${Math.floor(220 + 35 * Math.sin(t * 3))},255,1)`;
  ctx.fillText(name.toUpperCase(), tx, PY + 100);
  ctx.shadowBlur = 0;

  // Animated underline
  ctx.strokeStyle = 'rgba(0,180,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(bx, PY + 115); ctx.lineTo(bx + bw, PY + 115); ctx.stroke();
  const ulProg = 0.5 + 0.5 * Math.sin(t * 1.2);
  const gr2 = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  gr2.addColorStop(0, 'transparent');
  gr2.addColorStop(ulProg, '#00d4ff');
  gr2.addColorStop(Math.min(ulProg + 0.1, 1), 'transparent');
  ctx.strokeStyle = gr2; ctx.lineWidth = 2; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(bx, PY + 115); ctx.lineTo(bx + bw, PY + 115); ctx.stroke();
  ctx.shadowBlur = 0;

  // UID label + value
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,200,255,0.55)';
  ctx.fillText('◈  UID', bx, PY + 148);

  ctx.font = 'bold 32px "Courier New", monospace';
  for (let d = 3; d > 0; d--) {
    ctx.fillStyle = `rgba(0,${d * 15},${d * 35},0.6)`;
    ctx.fillText(uid, bx + d, PY + 185 + d);
  }
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#e0f8ff';
  ctx.fillText(uid, bx, PY + 185);
  ctx.shadowBlur = 0;

  // Animated scan line
  const scanY = PY + ((t * 60) % PH);
  const scanG = ctx.createLinearGradient(0, scanY - 8, 0, scanY + 8);
  scanG.addColorStop(0, 'transparent');
  scanG.addColorStop(0.5, 'rgba(0,220,255,0.12)');
  scanG.addColorStop(1, 'transparent');
  ctx.fillStyle = scanG;
  ctx.fillRect(PX + 2, PY + scanY - 8, PW - 4, 16);

  // Bottom progress bars
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(bx, PY + PH - 26, bw, 8);
  ctx.fillRect(bx, PY + PH - 16, bw, 6);

  const bars = [
    { color: '#00d4ff', prog: 0.4 + 0.3 * Math.sin(t * 0.8),     y: PY + PH - 26 },
    { color: '#9933ff', prog: 0.6 + 0.3 * Math.sin(t * 0.6 + 1), y: PY + PH - 18 },
    { color: '#00ffaa', prog: 0.7 + 0.28 * Math.sin(t * 0.5 + 2), y: PY + PH - 10 },
  ];
  bars.forEach(({ color, prog: p, y }) => {
    ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.fillStyle = color; ctx.fillRect(bx, y, bw * p, 4);
  });
  ctx.shadowBlur = 0;

  // Online indicator
  const si = PX + PW - 50;
  ctx.beginPath(); ctx.arc(si, PY + PH - 16, 5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,255,${Math.floor(150 + 105 * Math.sin(t * 4))},0.9)`;
  ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 15; ctx.fill(); ctx.shadowBlur = 0;
  ctx.font = '10px monospace'; ctx.fillStyle = 'rgba(0,255,100,0.6)';
  ctx.textAlign = 'right'; ctx.fillText('ONLINE', si - 10, PY + PH - 12);

  // Watermark
  ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(0,180,255,0.25)';
  ctx.textAlign = 'right'; ctx.fillText('v2.0 | CYBER-UID', W - 18, H - 8);
}

// ══════════════════════════════════════════════════════════════════
//  REAL ANIMATED GIF: render N frames across one t-cycle and encode
//  them into a proper looping animated GIF using gifencoder.
// ══════════════════════════════════════════════════════════════════
async function createCyberpunkBanner(name, uid, avatarUrl) {
  const W = 800, H = 300;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  let avatarImg = null;
  try { avatarImg = await loadImage(avatarUrl); } catch (_) {}

  // ── GIF encoder setup ────────────────────────────────────────────
  const encoder = new GIFEncoder(W, H);
  encoder.start();
  encoder.setRepeat(0);      // 0 = loop forever
  encoder.setDelay(60);      // ms between frames (~16fps)
  encoder.setQuality(10);    // lower = better quality, slower

  // How much of the animation cycle to cover and how many frames.
  // Most of the motion in renderFrame repeats every t = 2π, so we
  // sample one full cycle for a seamless loop.
  const FRAME_COUNT = 30;
  const T_STEP = (Math.PI * 2) / FRAME_COUNT;

  for (let i = 0; i < FRAME_COUNT; i++) {
    const t = i * T_STEP;
    await renderFrame(canvas, ctx, name, uid, avatarImg, t);
    encoder.addFrame(ctx);
  }

  encoder.finish();
  return encoder.out.getData(); // Buffer containing the animated GIF
}

// ══════════════════════════════════════════════════════════════════
//  BOT EXPORT
// ══════════════════════════════════════════════════════════════════
module.exports = {
  config: {
    name: 'uid',
    version: '3.2',
    author: 'HR ID OY',
    countDown: 5,
    role: 0,
    shortDescription: { en: 'View UID with animated 3D cyberpunk banner' },
    longDescription:  { en: 'Generates a real animated GIF cyberpunk banner with avatar, name and UID.' },
    category: 'Utility',
    guide: { en: '{pn} / @tag / reply / link' },
  },

  onStart: async function ({ message, event, args, api, usersData }) {
    const urlRx = /^(http|https):\/\/[^ "]+$/;
    let targetUid;

    // Determine whose UID to look up
    if (event.messageReply) {
      targetUid = event.messageReply.senderID;
    } else if (!args[0]) {
      targetUid = event.senderID;
    } else if (args[0].match(urlRx)) {
      try { targetUid = await findUid(args[0]); }
      catch { return message.reply('Invalid profile link.'); }
    } else {
      const mentions = Object.keys(event.mentions || {});
      targetUid = mentions[0] || event.senderID;
    }

    const processing = await message.reply('⏳ Rendering animated 3D banner...');

    try {
      // Fetch user info
      const info    = await api.getUserInfo(targetUid);
      const uInfo   = info[targetUid];
      const name    = (await usersData.get(targetUid))?.nickName
                   || uInfo?.name
                   || 'Unknown';
      const avatarUrl = (await usersData.getAvatarUrl(targetUid))
                     || `https://graph.facebook.com/${targetUid}/picture?type=large`;

      // Render animated GIF (30 frames)
      const gifBuf = await createCyberpunkBanner(name, targetUid, avatarUrl);

      // Save to cache
      const cacheDir = path.join(__dirname, 'cache');
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
      const outPath = path.join(cacheDir, `uid3d_${targetUid}.gif`);
      fs.writeFileSync(outPath, gifBuf);

      // Unsend "rendering..." message
      await message.unsend(processing.messageID);

      // Reply with banner + UID text
      return message.reply({
        body: `✦ UID: ${targetUid}`,
        attachment: fs.createReadStream(outPath),
      });

    } catch (err) {
      await message.unsend(processing.messageID);
      return message.reply(`❌ Error: ${err.message}`);
    }
  },
};
