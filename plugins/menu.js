import os from "os";
import config from "../config.js";
import { Module } from "../lib/plugins.js";

const runtime = (secs) => {
  const pad = (s) => String(s).padStart(2, "0");
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
};

const menuBody = (message) => `
*╭━━〔〄ꜱʏꜱᴛᴇᴍ ɪɴꜰᴏ〄〕━━⊷*
*┃‎🩸 Mᴜᴢᴀɴ Xᴍᴅ*
*╰═══════════════⊷*

*╭━━〔ᴄᴜꜱᴛᴏᴍɪᴢɪɴɢ 〕━━╮*
*┃👑 ᴏᴡɴᴇʀ : ➜‎ᯓִ࣪ ִֶָ𖾕𖾝𖽙𖾟 ་༘ R>꯭꧕༊*
*┃📦 ᴠᴇʀsɪᴏɴ  :➜𝟹.𝟶.𝟶*
*┃📡 ꜱᴜᴩᴩᴏʀᴛ :➜ 𝚳𝚯𝚯𝚴-𝚾 𝚾𝐃 💥";*
*┃📱ᴍᴏᴅᴇ➜𝙿𝚄𝙱𝙻𝙸𝙲*
*┃👨🏻‍💻ᴅᴇᴠᴇʟᴏᴩᴇʀ➜ চন্দ্রবিন্দুর চাঁদ*
*┃⏰ᴜᴩᴛɪᴍᴇ➜${runtime(process.uptime())}*
*┃⏹️ꜱᴩᴀᴄᴇ➜${((os.totalmem()-os.freemem())/1073741824).toFixed(2)} / ${(os.totalmem()/1073741824).toFixed(2)} GB*
*┃🙍🏻ᴜꜱᴇʀ➜${message.pushName || "User"}*
*╰━━━━━━━━━━━━━━━╯*
*▱▰▱▰▱▰▱▰▱▰▱▰*
*𝗔𝗟𝗟 𝗠𝗘𝗡𝗨 𝗟𝗢𝗔𝗗𝗘𝗗⬇️.....*
*▱▰▱▰▱▰▱▰▱▰▱▰*

*╭━〔 👑 ᴏᴡɴᴇʀ ᴍᴇɴᴜ 〕━┈⊷*
*┃ꨄ│➤𝙰𝙽𝚃𝙸𝙲𝙰𝙻𝙻*
*┃ꨄ│➤𝙰𝙽𝚃𝙸𝙻𝙸𝙽𝙺*
*┃ꨄ│➤𝚂𝚄𝙳𝙾*
*┃ꨄ│➤𝙳𝙴𝙻𝚂𝚄𝙳𝙾*
*┃ꨄ│➤𝚂𝚄𝙳𝙾𝙻𝙸𝚂𝚃*
*┃ꨄ│➤𝙰𝚄𝚃𝙾𝚁𝙴𝙰𝙲𝚃*
*┃ꨄ│➤𝙰𝚄𝚃𝙾𝚁𝙴𝙰𝙳*
*┃ꨄ│➤𝙰𝚄𝚃𝙾𝚁𝙴𝙲𝙾𝚁𝙳*
*┃ꨄ│➤𝙰𝚄𝚃𝙾𝚂𝚃𝙰𝚃𝚄𝚂*
*┃ꨄ│➤𝙰𝚄𝚃𝙾𝚃𝚈𝙿𝙸𝙽𝙶*
*┃ꨄ│➤𝙱𝙻𝙾𝙲𝙺*
*┃ꨄ│➤𝙱𝙻𝙾𝙲𝙺𝙻𝙸𝚂𝚃*
*┃ꨄ│➤𝙱𝚁𝙾𝙰𝙳𝙲𝙰𝚂𝚃*
*┃ꨄ│➤𝙳𝙴𝙻𝙴𝚃𝙴*
*┃ꨄ│➤𝙳𝙴𝙻𝙼𝙴*
*┃ꨄ│➤𝙵𝙾𝚁𝚆𝙰𝚁𝙳*
*┃ꨄ│➤𝙵𝚄𝙻𝙻𝙿𝙿*
*┃ꨄ│➤𝙵𝚆𝙳*
*┃ꨄ│➤𝙶𝙴𝚃𝙱𝙸𝙾*
*┃ꨄ│➤𝙶𝙴𝚃𝙽𝙰𝙼𝙴*
*┃ꨄ│➤𝙶𝙴𝚃𝙿𝙿*
*┃ꨄ│➤𝙹𝙸𝙳*
*┃ꨄ│➤𝙹𝙾𝙸𝙽*
*┃ꨄ│➤𝙻𝙴𝙰𝚅𝙴𝙰𝙻𝙻*
*┃ꨄ│➤𝙻𝙸𝚂𝚃𝙶𝙲*
*┃ꨄ│➤𝙼𝙴𝙽𝚃𝙸𝙾𝙽*
*┃ꨄ│➤𝙼𝙾𝙳𝙴*
*┃ꨄ│➤𝙼𝚈𝙽𝙰𝙼𝙴*
*┃ꨄ│➤𝙼𝚈𝙿𝚁𝙸𝚅𝙰𝙲𝚈*
*┃ꨄ│➤𝙼𝚈𝚂𝚃𝙰𝚃𝚄𝚂*
*┃ꨄ│➤𝙾𝚆𝙽𝙴𝚁*
*┃ꨄ│➤𝙿𝚁𝙸𝚅𝙰𝚃𝙴*
*┃ꨄ│➤𝙿𝚄𝙱𝙻𝙸𝙲*
*┃ꨄ│➤𝙿𝚁𝙴𝙵𝙸𝚇*
*┃ꨄ│➤𝚀𝚄𝙾𝚃𝙴𝙳*
*┃ꨄ│➤𝚁𝙴𝙼𝙾𝚅𝙴𝙿𝙿*
*┃ꨄ│➤𝚂𝙰𝚅𝙴*
*┃ꨄ│➤𝚂𝙰𝚅𝙴𝙳*
*┃ꨄ│➤𝚂𝙴𝚃𝙿𝙿*
*┃ꨄ│➤𝚂𝙴𝚃𝙱𝙸𝙾*
*┃ꨄ│➤𝚂𝙴𝚃𝙽𝙰𝙼𝙴*
*┃ꨄ│➤𝚄𝙽𝙱𝙻𝙾𝙲𝙺*
*┃ꨄ│➤𝚄𝙽𝙱𝙻𝙾𝙲𝙺𝙰𝙻𝙻*
*╰════════════════⊷*
*▱▰▱▰▱▰▱▰▱▰▱▰*

*╭━〔🎭ᴀɴɪᴍᴇ ᴍᴇɴᴜ〕━┈⊷*
*┃ꨄ│➤𝙰𝙲𝙷𝙰𝚁*
*┃ꨄ│➤𝙰𝚀𝚄𝙾𝚃𝙸𝙴*
*┃ꨄ│➤𝙰𝚁𝙴𝙲𝙾𝙼𝙼𝙴𝙽𝙳*
*┃ꨄ│➤𝙰𝚂𝙴𝙰𝚁𝙲𝙷*
*┃ꨄ│➤𝙻𝙾𝙻𝙸*
*┃ꨄ│➤𝙼𝙰𝙸𝙳*
*┃ꨄ│➤𝙼𝙴𝙶𝚄𝙼𝙸𝙽*
*┃ꨄ│➤𝙽𝙴𝙺𝙾*
*┃ꨄ│➤𝚂𝙷𝙸𝙽𝙾𝙱𝚄*
*┃ꨄ│➤𝚆𝙰𝙸𝙵𝚄*
*╰════════════════⊷*
*▱▰▱▰▱▰▱▰▱▰▱▰*

*╭━〔♻️ᴄᴏɴᴠᴇʀᴛ ᴍᴇɴᴜ〕━┈⊷*
*┃ꨄ│➤𝚄𝚁𝙻*
*╰════════════════⊷*
*▱▰▱▰▱▰▱▰▱▰▱▰*

*╭━〔⏬ᴅᴏᴡɴʟᴏᴀᴅ ᴍᴇɴᴜ〕━┈⊷*
*┃ꨄ│➤𝙰𝙿𝙺*
*┃ꨄ│➤𝙵𝙱*
*┃ꨄ│➤𝙶𝙸𝚃*
*┃ꨄ│➤𝙶𝙸𝚃𝙲𝙻𝙾𝙽𝙴*
*┃ꨄ│➤𝙸𝙽𝚂𝚃𝙰*
*┃ꨄ│➤𝚂𝙾𝙽𝙶*
*┃ꨄ│➤𝙿𝙻𝙰𝚈*
*┃ꨄ│➤𝚈𝚃𝙼𝙿𝟹*
*┃ꨄ│➤𝚈𝚃𝙰*
*┃ꨄ│➤𝙿𝙸𝙽𝚃*
*┃ꨄ│➤𝙼𝙴𝙶𝙰*
*╰════════════════⊷*
*▱▰▱▰▱▰▱▰▱▰▱▰*

*╭━〔 ⚙️ɢᴇɴᴇʀᴀʟ 〕━┈⊷*
*┃ꨄ│➤𝙰𝙻𝙸𝚅𝙴*
*┃ꨄ│➤𝙿𝙰𝙸𝚁*
*┃ꨄ│➤𝙶𝙼𝙴𝙽𝚄*
*┃ꨄ│➤𝙻𝙸𝚂𝚃*
*┃ꨄ│➤𝙼𝙴𝙽𝚄*
*╰════════════════⊷*
*▱▰▱▰▱▰▱▰▱▰▱▰*

*╭━〔 👥ɢʀᴏᴜᴩ ᴍᴇɴᴜ 〕━┈⊷*
*┃ꨄ│➤𝙰𝙳𝙳*
*┃ꨄ│➤𝙰𝙳𝙼𝙸𝙽*
*┃ꨄ│➤𝙰𝙽𝙽𝙾𝚄𝙽𝙲𝙴*
*┃ꨄ│➤𝙰𝙿𝙿𝚁𝙾𝚅𝙴*
*┃ꨄ│➤𝙲𝙻𝙾𝚂𝙴*
*┃ꨄ│➤𝙳𝙴𝙼𝙾𝚃𝙴*
*┃ꨄ│➤𝙳𝙴𝚂𝙲*
*┃ꨄ│➤𝙳𝙸𝚂𝙰𝙿𝙿𝙴𝙰𝚁*
*┃ꨄ│➤𝙵𝚄𝙻𝙻𝙶𝙲𝙿𝙿*
*┃ꨄ│➤𝙶𝙴𝚃𝙶𝙲𝙿𝙿*
*┃ꨄ│➤𝙶𝙾𝙾𝙳𝙱𝚈𝙴*
*┃ꨄ│➤𝙶𝚁𝙾𝚄𝙿𝙸𝙽𝙵𝙾*
*┃ꨄ│➤𝙶𝚁𝙾𝚄𝙿𝚂𝚃𝙰𝚃𝚄𝚂*
*┃ꨄ│➤𝙷𝙸𝙳𝙴𝚃𝙰𝙶*
*┃ꨄ│➤𝙸𝙽𝚅𝙸𝚃𝙴*
*┃ꨄ│➤𝙸𝙽𝚅𝙸𝚃𝙴𝚄𝚂𝙴𝚁*
*┃ꨄ│➤𝙺𝙸𝙲𝙺*
*┃ꨄ│➤𝙺𝙸𝙲𝙺𝙰𝙻𝙻*
*┃ꨄ│➤𝙻𝙴𝙰𝚅𝙴*
*┃ꨄ│➤𝙻𝙾𝙲𝙺*
*┃ꨄ│➤𝙾𝙿𝙴𝙽*
*┃ꨄ│➤𝙿𝙾𝙻𝙻*
*┃ꨄ│➤𝙿𝚁𝙾𝙼𝙾𝚃𝙴*
*┃ꨄ│➤𝚁𝙴𝙹𝙴𝙲𝚃*
*┃ꨄ│➤𝚁𝙴𝚀𝚄𝙴𝚂𝚃𝚂*
*┃ꨄ│➤𝚁𝙴𝚅𝙾𝙺𝙴*
*┃ꨄ│➤𝚁𝚃𝙰𝙶*
*┃ꨄ│➤𝚂𝙴𝚃𝙶𝙿𝙿*
*┃ꨄ│➤𝚂𝚄𝙱𝙹𝙴𝙲𝚃*
*┃ꨄ│➤𝚂𝙴𝚃𝚆𝙴𝙻𝙲𝙾𝙼𝙴*
*┃ꨄ│➤𝚂𝙴𝚃𝙶𝙾𝙾𝙳𝙱𝚈𝙴*
*┃ꨄ│➤𝚂𝙴𝚃𝙼𝙴𝙽𝚃𝙸𝙾𝙽*
*┃ꨄ│➤𝙳𝙴𝙻𝙼𝙴𝙽𝚃𝙸𝙾𝙽*
*┃ꨄ│➤𝚃𝙰𝙶𝙰𝙻𝙻*
*┃ꨄ│➤𝚃𝙾𝚃𝙰𝙶*
*┃ꨄ│➤𝚄𝙽𝙻𝙾𝙲𝙺*
*┃ꨄ│➤𝚆𝙴𝙻𝙲𝙾𝙼𝙴*
*┃ꨄ│➤ᴄsᴏɴɢ*
*╰════════════════⊷*
*▱▰▱▰▱▰▱▰▱▰▱▰*

*╭━〔 🔎ɪɴꜰᴏ ᴍᴇɴᴜ 〕━┈⊷*
*┃ꨄ│➤𝙰𝙽𝙸𝙼𝙴*
*┃ꨄ│➤𝙲𝙷𝙰𝚁𝙰𝙲𝚃𝙴𝚁*
*┃ꨄ│➤𝙻𝚈𝚁𝙸𝙲𝚂*
*┃ꨄ│➤𝙼𝙰𝙽𝙶𝙰*
*┃ꨄ│➤𝚆𝙴𝙰𝚃𝙷𝙴𝚁*
*╰════════════════⊷*
*▱▰▱▰▱▰▱▰▱▰▱▰*

*╭━〔 📂ᴍᴇᴅɪᴀ ᴍᴇɴᴜ 〕━┈⊷*
*┃ꨄ│➤𝙸𝙼𝙰𝙶𝙴𝙷𝙴𝙻𝙿*
*┃ꨄ│➤𝙸𝙼𝙰𝙶𝙴𝙸𝙽𝙵𝙾*
*┃ꨄ│➤𝚁𝙴𝙼𝙸𝙽𝙸*
*┃ꨄ│➤𝚂*
*┃ꨄ│➤𝚂𝚃𝙸𝙲𝙺𝙴𝚁*
*┃ꨄ│➤𝚂𝚃𝙸𝙲𝙺𝙴𝚁𝟸𝙸𝙼𝙰𝙶𝙴*
*┃ꨄ│➤𝚃𝙰𝙺𝙴*
*┃ꨄ│➤𝚃𝙾𝙸𝙼𝙰𝙶𝙴*
*┃ꨄ│➤𝚅𝙸𝙳𝙴𝙾𝟸𝙸𝙼𝙰𝙶𝙴*
*┃ꨄ│➤𝚅𝚂*
*╰════════════════⊷*
*▱▰▱▰▱▰▱▰▱▰▱▰*

*╭━〔 👾ᴍɪꜱᴄ ᴍᴇɴᴜ 〕━┈⊷*
*┃ꨄ│➤𝙱𝚃𝙿𝙽*
*┃ꨄ│➤𝙿𝙸𝙽𝙶*
*┃ꨄ│➤𝚃𝚁𝚃*
*┃ꨄ│➤𝚄𝙿𝚃𝙸𝙼𝙴*
*╰════════════════⊷*
*▱▰▱▰▱▰▱▰▱▰▱▰*

*╭━〔🌐ꜱᴇᴀʀᴄʜ ᴍᴇɴᴜ〕━┈⊷*
*┃ꨄ│➤𝚆𝙸𝙺𝙸*
*┃ꨄ│➤𝚈𝚃𝚂*
*╰════════════════⊷*
*▱▰▱▰▱▰▱▰▱▰▱▰*

*╭━〔 🔩ᴛᴏᴏʟꜱ 〕━┈⊷*
*┃ꨄ│➤𝙲𝙰𝙻𝙲*
*┃ꨄ│➤𝙲𝙸𝚁𝙲𝙻𝙴*
*┃ꨄ│➤𝙶𝙴𝚃*
*┃ꨄ│➤𝚀𝚁*
*┃ꨄ│➤𝚂𝙷𝙾𝚁𝚃𝚄𝚁𝙻*
*┃ꨄ│➤𝚂𝚂𝚆𝙴𝙱*
*┃ꨄ│➤𝚃𝙾𝙼𝙿𝟹*
*╰════════════════⊷*
*▱▰▱▰▱▰▱▰▱▰▱▰*

*╭━〔ᴜɴᴄᴀᴛᴇɢᴏʀɪᴢᴇᴅ〕━┈⊷*
*┃ꨄ│➤𝙲𝙺𝙸𝙳*
*╰════════════════⊷*
*▱▰▱▰▱▰▱▰▱▰▱▰*

*╭━〔 ✨ᴜᴛɪʟɪᴛʏ 〕━┈⊷*
*┃ꨄ│➤𝚃𝚃𝚂*
*╰════════════════⊷*
*▱▰▱▰▱▰▱▰▱▰▱▰*

*╭━〔 👁️‍🗨️ᴠɪᴇᴡ ᴏɴᴄᴇ 〕━┈⊷*
*┃ꨄ│➤😂*
*┃ꨄ│➤😃*
*┃ꨄ│➤𝚅𝚅*
*┃ꨄ│➤𝚅𝚅𝟸*
*╰════════════════⊷*
*▱▰▱▰▱▰▱▰▱▰▱▰*
> *┈➤‎ᯓִ࣪ ִֶָ𖾕𖾝𖽙𖾟 ་༘ R>꯭꧕༊*
*▱▰▱▰▱▰▱▰▱▰▱▰*`;

Module({
  command: "menu",
  aliases: ["listmenu"],
  package: "general",
  description: "Full NOBITA MD command menu",
})(async (message) => {
  const videoUrl = config.MENU_VIDEO_URL;
  const audioUrl = config.MENU_AUDIO_URL;
  const waJid = config.WA_CHANNEL_JID;
  const waName = config.BOT_NAME;
  const text = menuBody(message);

  const contextInfo = {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: waJid,
      newsletterName: waName,
      serverMessageId: -1,
    },
  };

  try {
    await message.react("📜");
    if (!videoUrl) throw new Error("MENU_VIDEO_URL is not configured");

    // IMPORTANT: gifPlayback is intentionally false. The menu must remain a real
    // MP4 so its original audio is preserved and WhatsApp shows video controls.
    await message.conn.sendMessage(message.from, {
      video: { url: videoUrl },
      mimetype: "video/mp4",
      gifPlayback: false,
      caption: text,
      contextInfo,
    }, { quoted: message.gift });

    // Optional separate menu song/audio requested by the source specification.
    if (audioUrl) {
      await new Promise((r) => setTimeout(r, 1200));
      await message.conn.sendMessage(message.from, {
        audio: { url: audioUrl },
        mimetype: "audio/mp4",
        ptt: false,
      }, { quoted: message.gift });
    }
  } catch (err) {
    console.error("[menu] failed:", err?.message || err);
    try {
      await message.conn.sendMessage(message.from, {
        text: `${text}\n\n❌ Menu media failed: ${err?.message || "unknown error"}`,
        contextInfo,
      }, { quoted: message.gift });
    } catch (e) {
      console.error("[menu] fallback failed:", e?.message || e);
    }
  }
});

Module({
  command: "alive",
  package: "general",
  description: "Check bot status",
})(async (message) => {
  await message.send(`*🜲›‎🩸 Mᴜᴢᴀɴ Xᴍᴅ* is online\n\n⏱️ Uptime: ${runtime(process.uptime())}\n💾 RAM: ${(process.memoryUsage().rss/1024/1024).toFixed(1)} MB\n\n> Powered by চন্দ্রবিন্দুর চাঁদ`);
});
