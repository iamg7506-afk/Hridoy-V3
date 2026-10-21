const { drive } = global.utils;
const { nickNameBot } = global.GoatBot.config;
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "welcome",
    version: "9.0",
    author: "Hridoy",
    category: "events"
  },

  langs: {
    en: {
      defaultWelcomeMessage: "╭───〔 🌸 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 🌸 〕───╮\n│ ✨ Hello, {userName}!\n│ 🎉 We're happy to have you here!\n│ 🌷 Enjoy the vibes & have fun!\n╰──────────────────────╯",
      botAddedMessage:
"━━━━━━━━━━━━━━━━━━━\n🤖 ᴛʜᴀɴᴋ ʏᴏᴜ ꜰᴏʀ ᴀᴅᴅɪɴɢ ᴍᴇ! 💖\n━━━━━━━━━━━━━━━━━━━ \n\nɪ'ᴍ ʜᴇʀᴇ ᴛᴏ ᴍᴀᴋᴇ ᴛʜɪs ɢʀᴏᴜᴘ ᴍᴏʀᴇ ᴀᴄᴛɪᴠᴇ ᴀɴᴅ ꜰᴜɴ! ✨\n\n⚙️ ᴘʀᴇꜰɪx      : .\n📜 ᴄᴏᴍᴍᴀɴᴅs   : .help\n🚀 sᴛᴀᴛᴜs      : ᴏɴʟɪɴᴇ ✅\n\n💡 ᴛɪᴘ: ᴛʏᴘᴇ .help ᴀɴʏᴛɪᴍᴇ ᴛᴏ sᴇᴇ ᴀʟʟ ᴀᴠᴀɪʟᴀʙʟᴇ ᴄᴏᴍᴍᴀɴᴅs!\n\n😄 ʟᴇᴛ's ʜᴀᴠᴇ ꜰᴜɴ ᴛᴏɢᴇᴛʜᴇʀ!\n━━━━━━━━━━━━━━━━━━━"}
  },

  onStart: async ({ threadsData, message, event, api, usersData, getLang }) => {
    if (event.logMessageType !== "log:subscribe") return;

    const { threadID } = event;
    const threadData = await threadsData.get(threadID);
    if (!threadData.settings.sendWelcomeMessage) return;

    const addedMembers = event.logMessageData.addedParticipants;
    const threadName   = threadData.threadName || "our group";
    const prefix       = global.utils.getPrefix(threadID);
    const inviterID    = event.author;

    for (const user of addedMembers) {
      const userID = user.userFbId;
      const botID  = api.getCurrentUserID();

      if (userID == botID) {
        if (nickNameBot) await api.changeNickname(nickNameBot, threadID, botID);
        return message.send(getLang("botAddedMessage", prefix));
      }

      const userName    = user.fullName;
      const inviterName = await usersData.getName(inviterID);
      const memberCount = event.participantIDs.length;

      let { welcomeMessage = getLang("defaultWelcomeMessage") } = threadData.data;
      welcomeMessage = welcomeMessage
        .replace(/\{userName\}/g,    userName)
        .replace(/\{userTag\}/g,     userName)
        .replace(/\{threadName\}/g,  threadName)
        .replace(/\{memberCount\}/g, memberCount)
        .replace(/\{inviterName\}/g, inviterName);

      let welcomeImagePath = null;
      try {
        welcomeImagePath = await createWelcomeCard({
          userName, threadName, memberCount,
          inviterName, newUserID: userID,
          inviterID, threadID, api
        });
      } catch (err) {
        console.error("Welcome image creation failed:", err);
      }

      const form = {
        body:     welcomeMessage,
        mentions: [{ tag: userName, id: userID }]
      };

      if (welcomeImagePath && fs.existsSync(welcomeImagePath)) {
        form.attachment = fs.createReadStream(welcomeImagePath);
      } else if (threadData.data.welcomeAttachment) {
        const attachments = threadData.data.welcomeAttachment
          .map(f => drive.getFile(f, "stream"));
        form.attachment = (await Promise.allSettled(attachments))
          .filter(({ status }) => status === "fulfilled")
          .map(({ value }) => value);
      }

      message.send(form);

      if (welcomeImagePath && fs.existsSync(welcomeImagePath)) {
        setTimeout(() => { try { fs.unlinkSync(welcomeImagePath); } catch (_) {} }, 5000);
      }
    }
  }
};

const ACCESS_TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

async function downloadHighQualityProfile(userID) {
  try {
    const url = `https://graph.facebook.com/${userID}/picture?width=500&height=500&access_token=${ACCESS_TOKEN}`;
    const res = await axios({ method: 'GET', url, responseType: 'arraybuffer', timeout: 10000 });
    return Buffer.from(res.data, 'binary');
  } catch { return null; }
}

async function downloadImage(url) {
  try {
    const res = await axios({ method: 'GET', url, responseType: 'arraybuffer', timeout: 10000 });
    return Buffer.from(res.data, 'binary');
  } catch { return null; }
}

async function getGroupImage(threadID, api) {
  try {
    const info = await api.getThreadInfo(threadID);
    if (info.imageSrc) {
      const res = await axios({ method: 'GET', url: info.imageSrc, responseType: 'arraybuffer', timeout: 10000 });
      return Buffer.from(res.data, 'binary');
    }
  } catch {}
  return null;
}

function unicodeToPlain(str) {
  if (!str) return '';
  const ranges = [
    [0x1D400, 0x1D419, 'A'], [0x1D41A, 0x1D433, 'a'],
    [0x1D434, 0x1D44D, 'A'], [0x1D44E, 0x1D467, 'a'],
    [0x1D468, 0x1D481, 'A'], [0x1D482, 0x1D49B, 'a'],
    [0x1D5D4, 0x1D5ED, 'A'], [0x1D5EE, 0x1D607, 'a'],
    [0x1D63C, 0x1D655, 'A'], [0x1D656, 0x1D66F, 'a'],
    [0x1D7CE, 0x1D7D7, '0'],
    [0xFF21, 0xFF3A, 'A'], [0xFF41, 0xFF5A, 'a'],
    [0xFF10, 0xFF19, '0'],
    [0x24B6, 0x24CF, 'A'], [0x24D0, 0x24E9, 'a'],
  ];
  const singles = {
    0x1D49C: 'A', 0x212C: 'B', 0x2102: 'C', 0x2145: 'D',
    0x2130: 'E', 0x2131: 'F', 0x210A: 'g', 0x210B: 'H',
    0x2110: 'I', 0x2111: 'I', 0x2112: 'L', 0x2113: 'l',
    0x2115: 'N', 0x2118: 'P', 0x211A: 'Q', 0x211B: 'R',
    0x211C: 'R', 0x2124: 'Z', 0x2128: 'Z',
    0x2070: '0', 0x00B9: '1', 0x00B2: '2', 0x00B3: '3',
    0x2074: '4', 0x2075: '5', 0x2076: '6', 0x2077: '7',
    0x2078: '8', 0x2079: '9',
  };
  let result = '';
  for (const char of str) {
    const cp = char.codePointAt(0);
    if (singles[cp] !== undefined) { result += singles[cp]; continue; }
    let mapped = false;
    for (const [start, end, base] of ranges) {
      if (cp >= start && cp <= end) {
        result += String.fromCodePoint(base.codePointAt(0) + (cp - start));
        mapped = true; break;
      }
    }
    if (!mapped) result += char;
  }
  return result;
}

function safeStr(str) {
  if (!str) return '';
  try { return Buffer.from(str, 'latin1').toString('utf8'); } catch { return str; }
}

function readableText(str) { return unicodeToPlain(safeStr(str)); }

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCircleAvatar(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

function fitText(ctx, text, maxPx, maxSize = 36, minSize = 13, bold = true) {
  let t = text, size = maxSize;
  ctx.font = `${bold ? 'bold' : '400'} ${size}px "Segoe UI", Arial`;
  while (ctx.measureText(t).width > maxPx && size > minSize) {
    size--;
    ctx.font = `${bold ? 'bold' : '400'} ${size}px "Segoe UI", Arial`;
  }
  if (ctx.measureText(t).width > maxPx) {
    while (ctx.measureText(t + '…').width > maxPx && t.length > 1) t = t.slice(0, -1);
    t += '…';
  }
  return { text: t, size };
}

// ─── Helper: pseudo-random from seed ────────────────────────────────────────
function rng(s) { let x = Math.sin(s + 1) * 10000; return x - Math.floor(x); }

// ─── Draw a hexagon path ─────────────────────────────────────────────────────
function hexPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

async function createWelcomeCard({
  userName, threadName, memberCount,
  inviterName, newUserID, inviterID, threadID, api
}) {
  const W = 1200, H = 600;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ── Load images ──────────────────────────────────────────────────────────
  async function loadProfile(uid) {
    const buf = await downloadHighQualityProfile(uid);
    if (buf) return loadImage(buf).catch(() => null);
    try {
      const info = await api.getUserInfo([uid]);
      const src  = info[uid]?.thumbSrc;
      if (src) { const b2 = await downloadImage(src); if (b2) return loadImage(b2).catch(() => null); }
    } catch {}
    return null;
  }

  const [newUserImg, inviterImg, groupImg] = await Promise.all([
    loadProfile(newUserID),
    loadProfile(inviterID),
    getGroupImage(threadID, api).then(b => b ? loadImage(b).catch(() => null) : null)
  ]);

  const safeUser    = readableText(userName);
  const safeInviter = readableText(inviterName);
  const safeGroup   = readableText(threadName);

  // ══════════════════════════════════════════════════════════════════════════
  // 1. BACKGROUND — deep space gradient with aurora streaks
  // ══════════════════════════════════════════════════════════════════════════
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0,    '#050510');
  bgGrad.addColorStop(0.45, '#07071a');
  bgGrad.addColorStop(1,    '#04040e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Aurora streaks (top-left corner glow)
  const aurora1 = ctx.createRadialGradient(180, 0, 0, 180, 0, 420);
  aurora1.addColorStop(0,   'rgba(120, 60, 255, 0.22)');
  aurora1.addColorStop(0.5, 'rgba(60, 20, 180, 0.10)');
  aurora1.addColorStop(1,   'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aurora1;
  ctx.fillRect(0, 0, W, H);

  // Aurora bottom-right pink
  const aurora2 = ctx.createRadialGradient(W - 200, H, 0, W - 200, H, 480);
  aurora2.addColorStop(0,   'rgba(255, 60, 180, 0.18)');
  aurora2.addColorStop(0.5, 'rgba(200, 30, 120, 0.08)');
  aurora2.addColorStop(1,   'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aurora2;
  ctx.fillRect(0, 0, W, H);

  // Aurora center-right cyan
  const aurora3 = ctx.createRadialGradient(W * 0.72, H * 0.4, 0, W * 0.72, H * 0.4, 300);
  aurora3.addColorStop(0,   'rgba(0, 220, 255, 0.10)');
  aurora3.addColorStop(1,   'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aurora3;
  ctx.fillRect(0, 0, W, H);

  // ── Subtle star field ────────────────────────────────────────────────────
  for (let i = 0; i < 220; i++) {
    const sx = rng(i * 3.7) * W;
    const sy = rng(i * 5.3) * H;
    const sr = rng(i * 8.1) * 1.2 + 0.2;
    const sa = rng(i * 11.9) * 0.6 + 0.05;
    ctx.fillStyle = `rgba(255,255,255,${sa.toFixed(2)})`;
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
  }

  // ── Diagonal grid lines (subtle cyberpunk vibe) ──────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.025;
  ctx.strokeStyle = '#a0b0ff';
  ctx.lineWidth   = 1;
  for (let x = -H; x < W + H; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x + H * 0.6, H);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // ══════════════════════════════════════════════════════════════════════════
  // 2. GLASS CARD — full-bleed frosted panel with border
  // ══════════════════════════════════════════════════════════════════════════
  const PAD  = 28;
  const cardR = 26;
  roundRect(ctx, PAD, PAD, W - PAD * 2, H - PAD * 2, cardR);
  ctx.fillStyle = 'rgba(255,255,255,0.032)';
  ctx.fill();

  // card outer border — gradient stroke
  const borderGrad = ctx.createLinearGradient(PAD, PAD, W - PAD, H - PAD);
  borderGrad.addColorStop(0,    'rgba(160,100,255,0.55)');
  borderGrad.addColorStop(0.35, 'rgba(80,200,255,0.45)');
  borderGrad.addColorStop(0.70, 'rgba(255,80,200,0.40)');
  borderGrad.addColorStop(1,    'rgba(160,100,255,0.35)');
  roundRect(ctx, PAD, PAD, W - PAD * 2, H - PAD * 2, cardR);
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth   = 1.8;
  ctx.stroke();

  // ══════════════════════════════════════════════════════════════════════════
  // 3. LEFT PANEL — avatar zone with hex frame
  // ══════════════════════════════════════════════════════════════════════════
  const splitX  = 370;
  const leftCX  = splitX / 2 + PAD / 2;

  // Vertical divider — glowing line
  {
    const dvg = ctx.createLinearGradient(splitX, PAD + 20, splitX, H - PAD - 20);
    dvg.addColorStop(0,   'rgba(120,80,255,0)');
    dvg.addColorStop(0.3, 'rgba(120,80,255,0.7)');
    dvg.addColorStop(0.7, 'rgba(80,200,255,0.7)');
    dvg.addColorStop(1,   'rgba(80,200,255,0)');
    ctx.save();
    ctx.shadowColor = 'rgba(120,80,255,0.6)';
    ctx.shadowBlur  = 14;
    ctx.strokeStyle = dvg;
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.moveTo(splitX, PAD + 20); ctx.lineTo(splitX, H - PAD - 20); ctx.stroke();
    ctx.restore();
  }

  // "NEW MEMBER" tag — pill with gradient fill
  {
    const tag   = 'NEW  MEMBER';
    ctx.font    = 'bold 13px "Segoe UI", Arial';
    const tw    = ctx.measureText(tag).width + 30;
    const th    = 30, tx = leftCX - tw / 2, ty = PAD + 30;
    const tg    = ctx.createLinearGradient(tx, ty, tx + tw, ty);
    tg.addColorStop(0, 'rgba(140,80,255,0.85)');
    tg.addColorStop(1, 'rgba(60,180,255,0.85)');
    roundRect(ctx, tx, ty, tw, th, 15);
    ctx.fillStyle = tg; ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(160,120,255,0.8)'; ctx.shadowBlur = 10;
    ctx.fillText(tag, leftCX, ty + th / 2);
    ctx.shadowBlur = 0;
  }

  // Avatar — hexagon frame
  const avatarY = H / 2 - 10;
  const avatarR = 108;
  const hexR    = avatarR + 16;

  // Outer hex glow ring
  ctx.save();
  ctx.shadowColor = 'rgba(100,200,255,0.55)'; ctx.shadowBlur = 28;
  const hexGrad = ctx.createLinearGradient(leftCX - hexR, avatarY - hexR, leftCX + hexR, avatarY + hexR);
  hexGrad.addColorStop(0, 'rgba(140,80,255,0.9)');
  hexGrad.addColorStop(0.5, 'rgba(60,200,255,0.9)');
  hexGrad.addColorStop(1, 'rgba(255,80,180,0.8)');
  hexPath(ctx, leftCX, avatarY, hexR);
  ctx.strokeStyle = hexGrad; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();

  // Second thinner hex
  ctx.save();
  hexPath(ctx, leftCX, avatarY, hexR + 11);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();

  // Avatar image or placeholder
  if (newUserImg) {
    ctx.save();
    hexPath(ctx, leftCX, avatarY, avatarR);
    ctx.clip();
    ctx.drawImage(newUserImg, leftCX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
    ctx.restore();
  } else {
    ctx.save();
    hexPath(ctx, leftCX, avatarY, avatarR);
    const phg = ctx.createRadialGradient(leftCX, avatarY - 20, 0, leftCX, avatarY, avatarR);
    phg.addColorStop(0, '#1a1a35'); phg.addColorStop(1, '#0d0d20');
    ctx.fillStyle = phg; ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(avatarR * 0.7)}px Arial`;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillText('👤', leftCX, avatarY);
    ctx.restore();
  }

  // Username below avatar
  {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const nameY = avatarY + avatarR + 34;
    const { text: uName, size: uSize } = fitText(ctx, safeUser, splitX - 30, 30, 14);
    ctx.font      = `bold ${uSize}px "Segoe UI", Arial`;
    const nameGrad = ctx.createLinearGradient(leftCX - 100, 0, leftCX + 100, 0);
    nameGrad.addColorStop(0, '#e0d4ff');
    nameGrad.addColorStop(0.5, '#ffffff');
    nameGrad.addColorStop(1, '#c8f0ff');
    ctx.fillStyle   = nameGrad;
    ctx.shadowColor = 'rgba(180,140,255,0.5)'; ctx.shadowBlur = 12;
    ctx.fillText(uName, leftCX, nameY);
    ctx.restore();
  }

  // Member badge
  {
    const bText = `✦  ${ordinal(memberCount)} Member  ✦`;
    ctx.save();
    ctx.font = 'bold 14px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    const bw = ctx.measureText(bText).width + 28;
    const bh = 30, bx = leftCX - bw / 2, by = avatarY + avatarR + 46;
    roundRect(ctx, bx, by, bw, bh, 15);
    ctx.fillStyle = 'rgba(60,200,255,0.10)'; ctx.fill();
    ctx.strokeStyle = 'rgba(60,200,255,0.45)'; ctx.lineWidth = 1.2;
    roundRect(ctx, bx, by, bw, bh, 15); ctx.stroke();
    ctx.fillStyle = 'rgba(60,220,255,0.95)';
    ctx.shadowColor = 'rgba(0,200,255,0.5)'; ctx.shadowBlur = 8;
    ctx.fillText(bText, leftCX, by + 20);
    ctx.restore();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. RIGHT PANEL
  // ══════════════════════════════════════════════════════════════════════════
  const rX    = splitX + 44;
  const rRight = W - PAD - 20;
  const rW    = rRight - rX;

  // ── Welcome headline ─────────────────────────────────────────────────────
  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 42px "Segoe UI", Arial';
  const wg = ctx.createLinearGradient(rX, 0, rX + 520, 0);
  wg.addColorStop(0,   '#ffffff');
  wg.addColorStop(0.55, '#d8c8ff');
  wg.addColorStop(1,   '#80d8ff');
  ctx.fillStyle   = wg;
  ctx.shadowColor = 'rgba(160,120,255,0.3)'; ctx.shadowBlur = 20;
  ctx.fillText('Welcome To Our Group', rX, PAD + 78);
  ctx.restore();

  // Underline accent — two-layer glow line
  ctx.save();
  ctx.shadowColor = 'rgba(100,180,255,0.9)'; ctx.shadowBlur = 14;
  const ulg = ctx.createLinearGradient(rX, 0, rX + 160, 0);
  ulg.addColorStop(0,   'rgba(160,100,255,1)');
  ulg.addColorStop(0.5, 'rgba(60,200,255,1)');
  ulg.addColorStop(1,   'rgba(255,80,200,1)');
  ctx.strokeStyle = ulg; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(rX, PAD + 90); ctx.lineTo(rX + 150, PAD + 90); ctx.stroke();
  ctx.restore();

  // ── Group section ─────────────────────────────────────────────────────────
  const secLabelStyle = (label, x, y) => {
    ctx.save();
    ctx.font = '600 11px "Segoe UI", Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(160,140,220,0.7)';
    ctx.fillText(label, x, y);
    ctx.restore();
  };

  const groupSecY = PAD + 128;
  secLabelStyle('GROUP', rX, groupSecY);

  const gAy    = groupSecY + 10;
  const gAvSz  = 78;

  if (groupImg) {
    ctx.save();
    roundRect(ctx, rX, gAy, gAvSz, gAvSz, 14);
    ctx.clip();
    ctx.drawImage(groupImg, rX, gAy, gAvSz, gAvSz);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(100,180,255,0.5)'; ctx.lineWidth = 2;
    roundRect(ctx, rX, gAy, gAvSz, gAvSz, 14); ctx.stroke();
    ctx.restore();
  } else {
    const gg = ctx.createLinearGradient(rX, gAy, rX + gAvSz, gAy + gAvSz);
    gg.addColorStop(0, '#12122a'); gg.addColorStop(1, '#0a0a1e');
    roundRect(ctx, rX, gAy, gAvSz, gAvSz, 14);
    ctx.fillStyle = gg; ctx.fill();
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '34px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillText('🏠', rX + gAvSz / 2, gAy + gAvSz / 2);
    ctx.restore();
  }

  {
    const gTx = rX + gAvSz + 18;
    const gTw = rRight - gTx;
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const { text: gn, size: gs } = fitText(ctx, safeGroup, gTw, 28, 13);
    ctx.font      = `bold ${gs}px "Segoe UI", Arial`;
    ctx.fillStyle = '#dde8ff';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6;
    ctx.fillText(gn, gTx, gAy + gAvSz / 2);
    ctx.restore();
  }

  // Separator
  {
    const sy = gAy + gAvSz + 20;
    const sg = ctx.createLinearGradient(rX, 0, rRight, 0);
    sg.addColorStop(0,   'rgba(160,100,255,0.4)');
    sg.addColorStop(0.5, 'rgba(60,200,255,0.2)');
    sg.addColorStop(1,   'rgba(255,80,200,0.0)');
    ctx.strokeStyle = sg; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(rX, sy); ctx.lineTo(rRight, sy); ctx.stroke();
  }

  // ── Inviter section ───────────────────────────────────────────────────────
  const invSecY = gAy + gAvSz + 36;
  secLabelStyle('ADDED BY', rX, invSecY);

  const invAy  = invSecY + 10;
  const invAvR = 46;
  const invCX  = rX + invAvR;
  const invCY  = invAy + invAvR;

  // Inviter avatar ring
  ctx.save();
  ctx.shadowColor = 'rgba(255,180,80,0.45)'; ctx.shadowBlur = 18;
  const invRingG = ctx.createLinearGradient(
    invCX - invAvR - 4, invCY - invAvR - 4,
    invCX + invAvR + 4, invCY + invAvR + 4
  );
  invRingG.addColorStop(0, 'rgba(255,180,60,0.85)');
  invRingG.addColorStop(1, 'rgba(255,100,200,0.70)');
  ctx.strokeStyle = invRingG; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(invCX, invCY, invAvR + 4, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  if (inviterImg) {
    drawCircleAvatar(ctx, inviterImg, invCX, invCY, invAvR);
  } else {
    ctx.fillStyle = '#12122a';
    ctx.beginPath(); ctx.arc(invCX, invCY, invAvR, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '28px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillText('👤', invCX, invCY);
    ctx.restore();
  }

  {
    const iTx = invCX + invAvR + 18;
    const iTw = rRight - iTx;
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const { text: iname, size: is } = fitText(ctx, safeInviter, iTw, 28, 13);
    ctx.font      = `bold ${is}px "Segoe UI", Arial`;
    ctx.fillStyle = '#e0d8ff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 5;
    ctx.fillText(iname, iTx, invCY);
    ctx.restore();
  }

  // ── Bottom "Powered By" pill ──────────────────────────────────────────────
  {
    const bY  = invAy + invAvR * 2 + 28;
    const bH  = H - PAD - 18 - bY;
    const bX  = rX;
    const bW  = rW;

    // pill glass bg
    roundRect(ctx, bX, bY, bW, bH, 16);
    const pillBg = ctx.createLinearGradient(bX, bY, bX + bW, bY + bH);
    pillBg.addColorStop(0, 'rgba(140,80,255,0.06)');
    pillBg.addColorStop(1, 'rgba(60,200,255,0.04)');
    ctx.fillStyle = pillBg; ctx.fill();

    roundRect(ctx, bX, bY, bW, bH, 16);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
    ctx.stroke();

    // Powered By text
    const cx2 = bX + bW / 2;
    const cy2 = bY + bH / 2;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px "Segoe UI", Arial';
    const pwg = ctx.createLinearGradient(cx2 - 130, 0, cx2 + 130, 0);
    pwg.addColorStop(0,    'rgba(200,180,255,0.9)');
    pwg.addColorStop(0.35, 'rgba(255,255,255,0.95)');
    pwg.addColorStop(0.65, 'rgba(80,210,255,1)');
    pwg.addColorStop(1,    'rgba(255,90,200,1)');
    ctx.fillStyle   = pwg;
    ctx.shadowColor = 'rgba(100,180,255,0.6)'; ctx.shadowBlur = 18;
    ctx.fillText('Powered By HR ID OY', cx2, cy2);
    ctx.restore();

    // small decorative dots left & right of text
    for (let di = 0; di < 3; di++) {
      const alpha = 0.25 - di * 0.07;
      ctx.fillStyle = `rgba(120,200,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(bX + 20 + di * 10, cy2, 3 - di * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bX + bW - 20 - di * 10, cy2, 3 - di * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── "Enjoy your stay" watermark ───────────────────────────────────────────
  ctx.save();
  ctx.textAlign = 'right'; ctx.font = '400 13px "Segoe UI", Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillText('Enjoy your stay ✨', W - 44, H - 36);
  ctx.restore();

  // ══════════════════════════════════════════════════════════════════════════
  // 5. CORNER ORNAMENTS — four tiny hex corners for extra uniqueness
  // ══════════════════════════════════════════════════════════════════════════
  const corners = [
    [PAD + 24, PAD + 24],
    [W - PAD - 24, PAD + 24],
    [PAD + 24, H - PAD - 24],
    [W - PAD - 24, H - PAD - 24],
  ];
  const ornG = ctx.createLinearGradient(0, 0, W, H);
  ornG.addColorStop(0, 'rgba(160,80,255,0.5)');
  ornG.addColorStop(1, 'rgba(60,200,255,0.4)');
  for (const [cx3, cy3] of corners) {
    hexPath(ctx, cx3, cy3, 11);
    ctx.strokeStyle = ornG; ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  // Save
  const tempPath = path.join(__dirname, `temp_welcome_${Date.now()}.png`);
  await fs.writeFile(tempPath, canvas.toBuffer('image/png'));
  return tempPath;
}
