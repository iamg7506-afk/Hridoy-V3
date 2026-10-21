const axios = require("axios");
const fs = require("fs");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "manga", aliases: ["man","ani-manga"], version: "2.1", author: "HR ID OY", countDown: 0, role: 0, description: "Search Manga info using AniList", category: "Utility", guide: { en: "{pn} [manga name]" } },
  onStart: async function ({ api, event, args }) {
    const query = args.join(" ");
    if (!query) return api.sendMessage("🔍 | Please provide a manga name.", event.threadID);
    const config = (await axios.get(`${API_BASE}/api/links/manga`)).data;
    const anilistQuery = `query ($search: String) { Media(search: $search, type: MANGA) { title { romaji english native } description(asHtml: false) status chapters volumes averageScore genres siteUrl coverImage { large } } }`;
    const res = await axios.post(config.url, { query: anilistQuery, variables: { search: query } });
    const manga = res.data.data.Media;
    const title = manga.title.english || manga.title.romaji || manga.title.native;
    const desc = manga.description?.replace(/<br>/g,"\n").replace(/<\/?[^>]+(>|$)/g,"").substring(0, 300) || "No description.";
    const msg = `📖 ${title}\n\n📌 Status: ${manga.status}\n📚 Chapters: ${manga.chapters||"?"}\n📘 Volumes: ${manga.volumes||"?"}\n⭐ Score: ${manga.averageScore||"?"}/100\n🎭 Genres: ${manga.genres.join(", ")}\n\n📝 Description:\n${desc}...\n\n🔗 ${manga.siteUrl}`;
    const img = (await axios.get(manga.coverImage.large, { responseType: "arraybuffer" })).data;
    const imgPath = __dirname + "/manga_tmp.jpg";
    fs.writeFileSync(imgPath, Buffer.from(img));
    api.sendMessage({ body: msg, attachment: fs.createReadStream(imgPath) }, event.threadID, () => fs.unlinkSync(imgPath));
  }
};
