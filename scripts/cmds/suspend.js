"use strict";
const fs = require("fs-extra");
const axios = require("axios");
const cheerio = require("cheerio");
const { loadImage, createCanvas } = require("canvas");

const BASE = "https://hridoy-api.vercel.app";

const DEBUG_CALIBRATE = false;

module.exports = {
  config: {
    name: "suspend ",
    aliases: ["suspended"],
    version: "4.0",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    description: {
      en: "Prank: shows the mentioned/replied user's profile as suspended",
      bn: "Prank: mention/reply kora user er profile suspended dekhabe",
    },
    category: "Tag Fun",
    guide: { en: "{pn} @mention or reply to a message" },
  },

  langs: {
    en: { noMention: "❌ | Mention someone or reply to a message!", error: "❌ | Failed to generate. Try again." },
    bn: { noMention: "❌ | কাউকে mention করুন বা reply করুন!", error: "❌ | তৈরি করতে সমস্যা হয়েছে।" },
  },

  onStart: async function ({ event, message, getLang, usersData, args, api }) {
    try {
      const targetID =
        Object.keys(event.mentions)[0] ||
        (event.messageReply ? event.messageReply.senderID : null) ||
        (args[0] && /^\d+$/.test(args[0]) ? args[0] : null) ||
        event.senderID;

      const targetName = (await usersData.getName(targetID).catch(() => null)) || "Unknown User";

      // ── API থেকে config নাও ──
      const { data: cfg } = await axios.get(`${BASE}/api/images/suspend`);

      const ts = Date.now();
      const avtPath    = __dirname + "/cache/invisible_avt_"  + ts + ".jpg";
      const coverPath  = __dirname + "/cache/invisible_cover_" + ts + ".jpg";
      const outputPath = __dirname + "/cache/invisible_out_"  + ts + ".png";

      const profilePicUrl = `https://graph.facebook.com/${targetID}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      const cookieStr = typeof api.getCookies === "function" ? api.getCookies() : null;

      let coverUrl = null;
      if (cookieStr) {
        try { coverUrl = await fetchViaMbasic(targetID, cookieStr); } catch (_) {}
      }
      if (!coverUrl && cookieStr) {
        try { coverUrl = await fetchCoverAlbum(targetID, cookieStr); } catch (_) {}
      }

      const [avatarBuffer, templateBuf] = await Promise.all([
        downloadImage(profilePicUrl, cookieStr),
        axios.get(cfg.url, { responseType: "arraybuffer" }),
      ]);
      fs.writeFileSync(avtPath, avatarBuffer);
      const rawAvatar = await loadImage(avtPath);
      const avatar    = autoCropPadding(rawAvatar);
      const template  = await loadImage(Buffer.from(templateBuf.data));

      let coverImg = avatar;
      if (coverUrl) {
        try {
          const coverBuffer = await downloadImage(coverUrl, cookieStr);
          if (coverBuffer && coverBuffer.length > 500) {
            fs.writeFileSync(coverPath, coverBuffer);
            coverImg = await loadImage(coverPath);
          }
        } catch (_) {}
      }

      const canvas = createCanvas(template.width, template.height);
      const ctx = canvas.getContext("2d");

      // ── cfg.positions から scale して描画 ──
      const TW = template.width;
      const TH = template.height;

      const cs = cfg.positions.coverSlot;
      const COVER = {
        x: TW * cs.x_pct,
        y: TH * cs.y_pct,
        w: TW * cs.w_pct,
        h: TH * cs.h_pct,
      };
      const av = cfg.positions.avatar;
      const avCx = TW * av.cx_pct;
      const avCy = TH * av.cy_pct;
      const avR  = TW * av.r_pct;

      const ts_hdr = cfg.textSlots.headerName;
      const ts_big = cfg.textSlots.bigName;
      const headerFontSize = Math.round(TW * ts_hdr.fontSize_pct);
      const bigFontSize    = Math.round(TW * ts_big.fontSize_pct);
      const HEADER_NAME_Y  = TH * ts_hdr.y_pct;
      const BIG_NAME_Y     = TH * ts_big.y_pct;
      const BIG_NAME_X     = TW * ts_big.x_pct;

      ctx.fillStyle = cfg.bgFill || "#808080";
      ctx.fillRect(0, 0, TW, TH);

      ctx.save();
      ctx.beginPath();
      ctx.rect(COVER.x, COVER.y, COVER.w, COVER.h);
      ctx.clip();
      drawCoverImage(ctx, coverImg, COVER.x, COVER.y, COVER.w, COVER.h);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(avCx, avCy, avR, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      drawCoverImage(ctx, avatar, avCx - avR, avCy - avR, avR * 2, avR * 2);
      ctx.restore();

      ctx.drawImage(template, 0, 0, TW, TH);

      if (DEBUG_CALIBRATE) {
        ctx.save();
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(avCx, avCy, avR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.textAlign = "center";
      ctx.fillStyle = ts_hdr.color;
      ctx.font = `bold ${headerFontSize}px Sans`;
      ctx.fillText(targetName, TW / 2, HEADER_NAME_Y);

      ctx.textAlign = "left";
      ctx.fillStyle = ts_big.color;
      ctx.font = `bold ${bigFontSize}px Sans`;
      ctx.fillText(targetName, BIG_NAME_X, BIG_NAME_Y);

      fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));

      const msgs = cfg.messages || ["👻 {target} এর profile এখন suspended! 😂"];
      const caption = msgs[Math.floor(Math.random() * msgs.length)]
        .replace("{target}", targetName);

      await message.reply({
        body: caption,
        attachment: fs.createReadStream(outputPath),
      });

      [avtPath, coverPath, outputPath].forEach(p => { try { fs.unlinkSync(p); } catch (_) {} });

    } catch (err) {
      console.error("suspend error:", err);
      message.reply(getLang("error"));
    }
  },
};

// ── Helper functions (same as original) ──

function autoCropPadding(img, tolerance = 24) {
  const off  = createCanvas(img.width, img.height);
  const octx = off.getContext("2d");
  octx.drawImage(img, 0, 0);
  const { data, width, height } = octx.getImageData(0, 0, img.width, img.height);
  function colorAt(x, y) { const i = (y * width + x) * 4; return [data[i], data[i+1], data[i+2]]; }
  function closeColor(a, b) { return Math.abs(a[0]-b[0])<=tolerance && Math.abs(a[1]-b[1])<=tolerance && Math.abs(a[2]-b[2])<=tolerance; }
  function rowIsBorder(y, ref) { const step=Math.max(1,Math.floor(width/60)); for(let x=0;x<width;x+=step){if(!closeColor(colorAt(x,y),ref))return false;} return true; }
  function colIsBorder(x, ref) { const step=Math.max(1,Math.floor(height/60)); for(let y=0;y<height;y+=step){if(!closeColor(colorAt(x,y),ref))return false;} return true; }
  const ref=colorAt(0,0); let top=0,bottom=height-1,left=0,right=width-1;
  const maxTrim=Math.floor(Math.min(width,height)*0.35);
  let t=0; while(top<bottom&&rowIsBorder(top,ref)&&t<maxTrim){top++;t++;} t=0;
  while(bottom>top&&rowIsBorder(bottom,ref)&&t<maxTrim){bottom--;t++;} t=0;
  while(left<right&&colIsBorder(left,ref)&&t<maxTrim){left++;t++;} t=0;
  while(right>left&&colIsBorder(right,ref)&&t<maxTrim){right--;t++;}
  const cw=right-left+1, ch=bottom-top+1;
  if(cw<=0||ch<=0||(cw===width&&ch===height)) return img;
  const cropped=createCanvas(cw,ch); const cctx=cropped.getContext("2d");
  cctx.drawImage(off,left,top,cw,ch,0,0,cw,ch); return cropped;
}

function drawCoverImage(ctx, img, x, y, w, h) {
  const scale=Math.max(w/img.width,h/img.height);
  const dw=img.width*scale, dh=img.height*scale;
  const dx=x+(w-dw)/2, dy=y+(h-dh)/2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

async function fetchViaMbasic(uid, cookieStr) {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
  const headers = { cookie: cookieStr, "user-agent": UA, "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8", "accept-language": "en-US,en;q=0.9", "upgrade-insecure-requests": "1" };
  for (const url of [`https://www.facebook.com/profile.php?id=${uid}`, `https://www.facebook.com/profile.php?id=${uid}&sk=about`]) {
    try {
      const res = await axios.get(url, { headers, timeout: 20000, maxRedirects: 5 });
      if (res.status === 200 && res.data?.length > 5000) { const found = extractCoverFromHtml(res.data); if (found?.url) return found.url; }
    } catch (_) {}
  }
  try {
    const mH = { ...headers, "user-agent": "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36" };
    const res = await axios.get(`https://mbasic.facebook.com/profile.php?id=${uid}`, { headers: mH, timeout: 15000, maxRedirects: 10 });
    return extractCoverFromHtml(res.data || "")?.url || null;
  } catch (_) { return null; }
}

async function fetchCoverAlbum(uid, cookieStr) {
  const headers = { cookie: cookieStr, "accept": "text/html,application/xhtml+xml", "accept-language": "en-US,en;q=0.9", "user-agent": "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36" };
  try {
    const res = await axios.get(`https://mbasic.facebook.com/media/albums/?id=${uid}`, { headers, timeout: 15000, maxRedirects: 10 });
    const html = res.data || ""; if (!html) return null;
    const albumMatch = html.match(/href="([^"]*cover[^"]*album[^"]*|[^"]*album[^"]*cover[^"]*)"/i);
    if (!albumMatch) return null;
    const albumUrl = "https://mbasic.facebook.com" + albumMatch[1].replace(/&amp;/g, "&");
    const res2 = await axios.get(albumUrl, { headers, timeout: 15000, maxRedirects: 10 });
    return extractCoverFromHtml(res2.data || "")?.url || null;
  } catch (_) { return null; }
}

function extractCoverFromHtml(html) {
  if (!html) return null;
  const r1 = extractCoverFromJsonText(html); if (r1) return { url: r1 };
  try {
    const $ = cheerio.load(html);
    const coverImg = $('img[data-imgperflogname="profileCoverPhoto"]').first();
    if (coverImg.length) { const src = coverImg.attr("src"); if (src?.startsWith("http")) return { url: src.replace(/&amp;/g, "&") }; }
    const containerImg = $("#profile_cover_photo_container img").first();
    if (containerImg.length) { const src = containerImg.attr("src"); if (src?.startsWith("http")) return { url: src.replace(/&amp;/g, "&") }; }
  } catch (_) {}
  const boxMatch = html.match(/id="profile_cover_photo_container"[^>]*>[\s\S]{0,500}?<img[^>]+src="([^"]+)"/);
  if (boxMatch) return { url: boxMatch[1].replace(/&amp;/g, "&") };
  const linkRe = /https:\/\/(?:scontent|lookaside)\.[^"'<>\s]+/g; const found = []; let m;
  while ((m = linkRe.exec(html)) !== null) { const u = m[0].replace(/&amp;/g, "&"); if (!u.includes("s160x160") && !u.includes("s40x40") && !u.includes("cp0_dst-jpg")) found.push(u); }
  const bySid = found.find(u => u.includes("_nc_sid=cc71e4")); if (bySid) return { url: bySid };
  const big = found.find(u => u.includes("_s720x720") || u.includes("1500x") || u.includes("t39.30808")); if (big) return { url: big };
  if (found[0]) return { url: found[0] };
  return null;
}

function extractCoverFromJsonText(text) {
  if (!text) return null;
  const patterns = [/"coverPhoto"\s*:\s*\{[^}]*"uri"\s*:\s*"([^"]+)"/,/"cover_photo"\s*:\s*\{[^}]*"uri"\s*:\s*"([^"]+)"/,/"cover"\s*:\s*\{[^}]*"source"\s*:\s*"([^"]+)"/,/"cover"\s*:\s*\{"uri"\s*:\s*"([^"]+)"/,/"cover_image"\s*:\s*\{[^}]*"uri"\s*:\s*"([^"]+)"/,/"CoverPhoto"\s*:\s*\{[^}]*"uri"\s*:\s*"([^"]+)"/,/"full_screen_image"\s*:\s*\{[^}]*"uri"\s*:\s*"([^"]+)"/,/"coverPhoto"\s*:\s*"(https:[^"]+)"/];
  for (const re of patterns) { const m = re.exec(text); if (m) return m[1].replace(/\\u0026/g,"&").replace(/\\u002F/g,"/").replace(/\\\//g,"/").replace(/\\/g,"").trim(); }
  return null;
}

async function downloadImage(url, cookieStr) {
  const headers = { "accept": "image/webp,image/apng,image/*,*/*;q=0.8", "referer": "https://www.facebook.com/", "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36", ...(cookieStr ? { cookie: cookieStr } : {}) };
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 20000, maxRedirects: 5, headers });
  return Buffer.from(res.data);
}
