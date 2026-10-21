const axios = require("axios");

const baseApiUrl = async () => {
  const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
  return base.data.mahmud;
};

/**
* @author MahMUD
* @author: do not delete it
*/

module.exports = {
  config: {
		shortDescription: "Github (System)", // auto-added: was missing, caused blank entry in help
		role: 0, // auto-added: was missing
    name: "github",
    aliases: ["git"],
    version: "1.8",
    author: "MahMUD",
    countDown: 10,
    category: "System",
    guide: { en: "{pn} [username]" }
  },

  onStart: async function ({ api, event, args }) {
    const obfuscatedAuthor = String.fromCharCode(77, 97, 104, 77, 85, 68); 
    if (module.exports.config.author !== obfuscatedAuthor) {
      return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
    }
    
    const { threadID, messageID } = event;
    const username = args[0];
    if (!username) return api.sendMessage("Please Provide a Github Username.\n\nExample: {pn} GitHub kakashi420", threadID, messageID);

    try {
      const apiUrl = await baseApiUrl();
      const res = await axios.get(`${apiUrl}/api/github?user=${encodeURIComponent(username)}`);
      const d = res.data.data;

      const info = `>🎀 USER GITHUB INFO
• Name: ${d.profile.name || "N/A"}
• Username: ${d.profile.username}
• ID: ${d.profile.id}
• Type: ${d.profile.type}
• Verified: ${d.profile.is_staff ? "GitHub Staff" : "No"}
• Bio: ${d.profile.bio || "N/A"}
• Most Use Language: ${d.stats.favorite_language}

👥 FOLLOWER 
• Followers: ${d.stats.followers}
• Following: ${d.stats.following}

📧 USER CONTACT 
• Public Email: ${d.contact.email || "Not Found"}
• Location: ${d.contact.location || "N/A"}
• Website: ${d.contact.website || "N/A"}

📦 PUBLIC REPO 
• Public Repos: ${d.stats.public_repos}
• Archived: ${d.stats.archived_repos}
• Total Forks: ${d.stats.total_forks}
• Total Stars: ${d.stats.total_stars}
• Code Size: ${d.stats.code_size_mb} MB

🔗 TOP REPOSITORY
• Repo Name: ${d.highlights.top_repo ? d.highlights.top_repo.name : "N/A"} 
• Repo Star: ${d.highlights.top_repo ? d.highlights.top_repo.stars : "0"} 
• Repo Fork: ${d.highlights.top_repo ? d.highlights.top_repo.forks : "0"}
• Repo Link: ${d.highlights.top_repo ? d.highlights.top_repo.url : "N/A"}

📅 JOIN & UPDATE 
• Joined: ${new Date(d.meta.joined_at).toDateString()}
• Account Age: ${d.meta.account_age_years} years
• Last Active Repo: ${d.highlights.last_active_repo || "N/A"}
• Last Profile Update: ${new Date(d.meta.updated_at).toDateString()}`;

      return api.sendMessage({
        body: info,
        attachment: await global.utils.getStreamFromURL(d.profile.avatar)
      }, threadID, messageID);

    } catch (e) {
      console.error(e);
      return api.sendMessage("API error, Contact Kakashi.", threadID, messageID);
    }
  }
};
