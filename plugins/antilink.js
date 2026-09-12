// plugins/antilink.js - restored from raw Miku MD handler and hardened for Baileys v7
import { Module } from "../lib/plugins.js";
import { db } from "../lib/client.js";

const LINK_REGEX = /(?:https?:\/\/[^\s]+)|(?:www\.[^\s]+)|(?:chat\.whatsapp\.com\/[A-Za-z0-9_-]+)|(?:wa\.me\/[0-9]+)|(?:t\.me\/[A-Za-z0-9_-]+)|(?:telegram\.me\/[A-Za-z0-9_-]+)|(?:discord\.gg\/[A-Za-z0-9_-]+)|(?:bit\.ly\/[A-Za-z0-9_-]+)|(?:tinyurl\.com\/[A-Za-z0-9_-]+)|\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|gg|xyz|me|app|online|site|link)\b/gi;

const botNumber = (conn) => String(conn?.user?.id || conn?.user?.jid || "bot").split("@")[0].split(":")[0];
const key = (jid, part) => `antilink:${jid}:${part}`;

async function ensureGroupAdmin(message) {
  if (!message?.isGroup) { await message.send("❌ This command works only in groups."); return false; }
  await message.loadGroupInfo();
  if (!(message.isAdmin || message.isFromMe || message.isfromMe)) {
    await message.send("❌ Only group admins/owner can use this command.");
    return false;
  }
  if (!message.isBotAdmin) {
    await message.send("❌ Please make the bot an admin first.");
    return false;
  }
  return true;
}

Module({
  command: "antilink",
  package: "group",
  aliases: ["antilinks"],
  description: "Enable/disable anti-link and choose kick/warn/delete mode",
})(async (message, match) => {
  try {
    if (!(await ensureGroupAdmin(message))) return;
    const sid = botNumber(message.conn);
    const enabledKey = key(message.from, "enabled");
    const modeKey = key(message.from, "mode");
    const raw = String(match || "").trim().toLowerCase();

    if (!raw) {
      const enabled = db.get(sid, enabledKey, false) === true;
      const mode = String(db.get(sid, modeKey, "kick") || "kick").toLowerCase();
      return message.send(`╭━━〔 🔗 𝐀𝐍𝐓𝐈𝐋𝐈𝐍𝐊 〕━━┈⊷\n┃✧ Status : ${enabled ? "✅ ON" : "❌ OFF"}\n┃✧ Mode   : ${mode.toUpperCase()}\n╰━━━━━━━━━━━━━━━━━━⊷\n\nUse:\n${process.env.PREFIX || "."}antilink on\n${process.env.PREFIX || "."}antilink off\n${process.env.PREFIX || "."}antilink kick\n${process.env.PREFIX || "."}antilink warn\n${process.env.PREFIX || "."}antilink delete`);
    }

    if (raw === "on") {
      db.setHot(sid, enabledKey, true);
      if (!db.get(sid, modeKey, null)) db.setHot(sid, modeKey, "kick");
      await message.react("✅");
      return message.send("✅ *AntiLink enabled.*");
    }
    if (raw === "off") {
      db.setHot(sid, enabledKey, false);
      await message.react("❌");
      return message.send("❌ *AntiLink disabled.*");
    }
    if (["kick", "remove", "warn", "delete", "null"].includes(raw)) {
      const mode = raw === "remove" ? "kick" : raw;
      db.setHot(sid, modeKey, mode);
      db.setHot(sid, enabledKey, true);
      await message.react("🔗");
      return message.send(`✅ AntiLink mode: *${mode.toUpperCase()}*`);
    }
    return message.send("Usage: .antilink on/off/kick/warn/delete");
  } catch (e) {
    console.error("[antilink command]", e);
    await message.react("❌").catch(() => {});
    return message.send(`❌ AntiLink error: ${e?.message || e}`);
  }
});

// Event handler: this is deliberately separate from the command handler.
// The plugin loader must register on:"text" plugins before messages are processed.
Module({ on: "text", package: "group", description: "Enforce anti-link policy" })(async (message) => {
  try {
    if (!message?.isGroup || !message.body) return;
    const sid = botNumber(message.conn);
    if (db.get(sid, key(message.from, "enabled"), false) !== true) return;

    await message.loadGroupInfo();
    if (!message.isBotAdmin) return;
    if (message.isAdmin || message.isFromMe || message.isfromMe) return;

    const matches = String(message.body).match(LINK_REGEX);
    if (!matches?.length) return;

    const sender = message.sender || message.key?.participant || message.key?.participantAlt;
    if (!sender) return;
    const mode = String(db.get(sid, key(message.from, "mode"), "kick") || "kick").toLowerCase();
    const number = String(sender).split("@")[0].split(":")[0];

    // Delete first. Failure here must not stop the kick/warn action.
    try {
      await message.conn.sendMessage(message.from, { delete: message.key });
    } catch (e) {
      console.warn("[antilink] message delete failed:", e?.message || e);
    }

    if (mode === "warn") {
      await message.send(`⚠️ @${number}, links are not allowed in this group.`, { mentions: [sender] });
      return;
    }
    if (mode === "delete" || mode === "null" || mode === "remove_link") {
      await message.send(`🗑️ Link removed from @${number}.`, { mentions: [sender] });
      return;
    }

    await message.send(`🚫 @${number} posted a prohibited link and will be removed.`, { mentions: [sender] });
    await new Promise((r) => setTimeout(r, 600));

    try {
      const result = await message.conn.groupParticipantsUpdate(message.from, [sender], "remove");
      const failed = JSON.stringify(result || "").match(/"status"\s*:\s*(?:4\d\d|5\d\d)/);
      if (failed) throw new Error("WhatsApp rejected the participant removal");
    } catch (e) {
      console.error("[antilink] kick failed:", e);
      await message.send(`❌ Could not remove @${number}. Make sure the bot is an admin and the user is removable.`, { mentions: [sender] });
    }
  } catch (e) {
    console.error("[antilink enforcement]", e);
  }
});
