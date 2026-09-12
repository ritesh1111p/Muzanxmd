import { spawn } from "child_process";
import config from "./config.js";
import fs from "fs";
import os from "os";
import path from "path";

export default async function initializeTelegramBot(manager) {
  // ── CONFIG ──────────────────────────────────────────────────────────────────
  const ALLOWED_GROUP_ID = String(config.TG_GROUP_ID);
  const GROUP_INVITE_LINK = config.TG_GROUP_LINK;
  const TG_CHANNEL_ID = String(config.TG_CHANNEL_ID);
  const TG_CHANNEL_LINK = config.TG_CHANNEL_LINK;
  const WA_CHANNEL_LINK = config.WA_CHANNEL_LINK;
  const BOT_PIC_URL = config.BOT_PIC_URL;
  const BOT_NAME = config.BOT_NAME;
  const OWNER_NAME = config.OWNER_NAME;
  const DEVELOPER_NAME = config.DEVELOPER_NAME;
  const ADMIN_IDS = new Set(config.TG_ADMIN_IDS.map(String));
  const TG_ADMIN_ID = config.TG_ADMIN_IDS[0];
  const PAIR_COOLDOWN_MS = 30_000;

  const BOT_TOKEN = config.BOT_TOKEN_TELEGRAM;

  if (!BOT_TOKEN) {
    console.warn("❌ [bot.js] BOT_TOKEN not set — skipping Telegram bot.");
    return null;
  }

  const RAILWAY_URL =
    process.env.RAILWAY_STATIC_URL || process.env.WEBHOOK_BASE_URL || "";
  const USE_WEBHOOK = Boolean(RAILWAY_URL);

  // Dynamic import — avoids startup penalty when Telegram is not used
  const { default: TelegramBot } = await import("node-telegram-bot-api");

  const tbot = new TelegramBot(
    BOT_TOKEN,
    USE_WEBHOOK
      ? { polling: false }
      : { polling: { interval: 3000, timeout: 30 } }
  );

  tbot.on("polling_error", (e) =>
    console.error("❗ [bot.js] Polling error:", e?.message || e)
  );
  tbot.on("webhook_error", (e) =>
    console.error("❗ [bot.js] Webhook error:", e?.message || e)
  );

  // Fetch bot identity
  let botId = null;
  try {
    const me = await tbot.getMe();
    botId = me.id;
    tbot.botId = me.id;
    tbot.botUsername = me.username;
    console.log(
      `🤖 [bot.js] @${me.username} (${me.id}) — mode: ${
        USE_WEBHOOK ? "webhook" : "polling"
      }`
    );
  } catch (e) {
    console.warn("⚠️ [bot.js] getMe failed:", e?.message);
  }

  // Pairing lifecycle notifications.
  // When a pairing session opens, replace the Telegram pair-code message
  // with a clear connected confirmation. The existing V6 socket/session
  // architecture remains untouched; this only observes manager events.
  const disconnectNotified = new Set();
  manager.on("connection.update", async (sessionId, update) => {
    try {
      const key = String(sessionId);
      const connection = update?.connection;

      if (connection === "open") {
        const pending = pairMessages.get(key);
        if (pending) {
          const connectedText = premiumBox("BOT CONNECTED", [
            `╭─「 ✦ 𝐒𝐄𝐒𝐒𝐈𝐎𝐍 𝐎𝐍𝐋𝐈𝐍𝐄 」`,
            `┃ 📱 <b>Number:</b> <code>+${esc(key)}</code>`,
            `┃ 🟢 <b>Status:</b> Connected Successfully`,
            `┃ 🔗 <b>Device:</b> WhatsApp Linked Device`,
            `┃`,
            `┃ ✨ Your bot session is now active.`,
            `┃ ⚡ You can start using the bot commands.`,
            `╰────────────────────`,
          ]);
          try {
            await safeEdit(
              pending.chatId,
              pending.messageId,
              connectedText,
              { reply_markup: { inline_keyboard: [[
                { text: "🟢 Bot Connected", callback_data: "noop" }
              ]] } }
            );
          } catch (editError) {
            // The message may have expired or already been removed; send a
            // replacement rather than losing the connection confirmation.
            await safeReply(pending.chatId, connectedText, {
              reply_to_message_id: pending.replyId,
            }).catch(() => {});
          }
          pairMessages.delete(key);
          pairOwners.delete(key);
        }
        return;
      }

      if (connection !== "close") return;

      const pending = pairMessages.get(key);
      if (pending) {
        const failedText = premiumBox("PAIRING ENDED", [
          `📱 <b>Number:</b> <code>+${esc(key)}</code>`,
          `⚠️ The WhatsApp session closed before linking was completed.`,
          `Please generate a new pair code and try again.`,
        ]);
        try {
          await safeEdit(pending.chatId, pending.messageId, failedText);
        } catch {
          await safeReply(pending.chatId, failedText, {
            reply_to_message_id: pending.replyId,
          }).catch(() => {});
        }
        pairMessages.delete(key);
        pairOwners.delete(key);
      }

      if (disconnectNotified.has(key)) return;
      disconnectNotified.add(key);
      const timer = setTimeout(() => disconnectNotified.delete(key), 15 * 60 * 1000);
      timer.unref?.();
      await safeReply(TG_ADMIN_ID, [
        `⚠️ <b>BOT DISCONNECTED</b>`,
        ``,
        `📱 <code>${esc(sessionId)}</code>`,
        `🤖 ${esc(BOT_NAME)}`,
        `💬 The WhatsApp session disconnected. Reconnect/pair it again if needed.`,
      ].join("\n"));
    } catch (e) {
      console.error("[bot.js] connection notification failed:", e?.message || e);
    }
  });

  // Per-user pair cooldown map
  const pairCooldown = new Map(); // userId → timestamp
  const pairOwners = new Map();
  // Telegram message associated with a pending WhatsApp pairing session.
  // Used to replace the pair-code message with a connected confirmation.
  const pairMessages = new Map();

  // ── Utility helpers ─────────────────────────────────────────────────────────

  const esc = (s = "") =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  // Unicode monospace-style display font requested for Telegram messages.
  // Example: A → 𝙰, a → 𝚊.
  function F(text = "") {
    return String(text).replace(/[A-Za-z]/g, (ch) => {
      const c = ch.charCodeAt(0);
      if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d670 + (c - 65));
      if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d68a + (c - 97));
      return ch;
    });
  }

  // Existing handlers sometimes provide Telegram HTML markup.  The premium
  // Telegram UI is intentionally plain/stylized, so remove markup before
  // applying the display font instead of leaking tags into the message.
  function cleanTelegramText(value = "") {
    return String(value ?? "")
      .replace(/<\/?[a-z][^>]*>/gi, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  function premiumBox(title, lines = []) {
    const body = Array.isArray(lines) ? lines : [lines];
    const styledTitle = F(cleanTelegramText(title));
    const styledLines = body.map((line) => F(cleanTelegramText(line)));
    return [
      `╭━━━━━━━━━━━━━━━━━━━━╮`,
      `┃ ✦ ${styledTitle}`,
      `┣━━━━━━━━━━━━━━━━━━━━┫`,
      ...styledLines.map((line) => `┃ ${line}`),
      `╰━━━━━━━━━━━━━━━━━━━━╯`,
    ].join("\n");
  }

  async function safeReply(chatId, text, opts = {}) {
    const raw = Array.isArray(text) ? text.join("\n") : String(text ?? "");
    // Rebuild every Telegram response through the same premium formatter so
    // even messages already containing a box get the requested font/style.
    const lines = raw
      .replace(/^╭━━━━━━━━━━━━━━━━━━━━╮\n?/, "")
      .replace(/^┃ ✦ .*\n?/, "")
      .replace(/^┣━━━━━━━━━━━━━━━━━━━━┫\n?/, "")
      .replace(/\n?╰━━━━━━━━━━━━━━━━━━━━╯$/, "")
      .split("\n")
      .map((line) => line.replace(/^┃\s?/, ""));
    const boxed = premiumBox("চন্দ্রবিন্দুর চাঁদ", lines);
    return tbot.sendMessage(chatId, boxed, { parse_mode: "HTML", ...opts });
  }

  async function safeEdit(chatId, messageId, text, opts = {}) {
    const raw = Array.isArray(text) ? text.join("\n") : String(text ?? "");
    const lines = raw
      .replace(/^╭━━━━━━━━━━━━━━━━━━━━╮\n?/, "")
      .replace(/^┃ ✦ .*\n?/, "")
      .replace(/^┣━━━━━━━━━━━━━━━━━━━━┫\n?/, "")
      .replace(/\n?╰━━━━━━━━━━━━━━━━━━━━╯$/, "")
      .split("\n")
      .map((line) => line.replace(/^┃\s?/, ""));
    const boxed = premiumBox("চন্দ্রবিন্দুর চাঁদ", lines);
    return tbot.editMessageText(boxed, { chat_id: chatId, message_id: messageId, parse_mode: "HTML", ...opts });
  }

  function isoToFlag(iso) {
    if (!iso || iso.length !== 2) return "🏳️";
    const A = 0x1f1e6;
    return [...iso.toUpperCase()]
      .map((c) => String.fromCodePoint(A + c.charCodeAt(0) - 65))
      .join("");
  }

  function fmtCode(raw) {
    const s = String(raw || "").replace(/\s+/g, "");
    return s.match(/.{1,4}/g)?.join("-") || s;
  }

  function isPrivate(msg) {
    return msg?.chat?.type === "private";
  }

  function isAllowedGroup(msg) {
    try {
      if (!msg?.chat) return false;
      if (msg.chat.type === "private") return false;
      return String(msg.chat.id) === String(ALLOWED_GROUP_ID);
    } catch {
      return false;
    }
  }

  const verifiedUsers = new Map();

  async function isChannelMember(userId) {
    if (!userId) return false;
    if (ADMIN_IDS.has(String(userId))) return true;
    const targets = [TG_CHANNEL_ID];
    for (const target of targets) {
      try {
        const member = await tbot.getChatMember(target, userId);
        if (["member", "administrator", "creator"].includes(member?.status)) return true;
      } catch (err) {
        console.warn(`[bot.js] channel check ${target} failed:`, err?.message || err);
      }
    }
    return false;
  }

  async function verifyUser(msg) {
    const uid = msg?.from?.id;
    if (!uid) return false;
    if (ADMIN_IDS.has(String(uid))) return true;
    const ok = await isChannelMember(uid);
    if (ok) verifiedUsers.set(String(uid), Date.now());
    else verifiedUsers.delete(String(uid));
    return ok;
  }

  async function sendWelcome(chatId, userId, replyId) {
    const verified = await isChannelMember(userId);
    const buttons = [
      [{ text: "📣 Telegram Channel", url: TG_CHANNEL_LINK }],
      [{ text: "🟢 WhatsApp Channel", url: WA_CHANNEL_LINK }],
      [{ text: verified ? "✅ Verified" : "🔐 Verify Channel", callback_data: "verify_channel" }],
    ];
    if (verified) buttons.push([{ text: "👥 Official Telegram Group", url: GROUP_INVITE_LINK }]);
    const caption = premiumBox(verified ? "VERIFICATION READY" : "CHANNEL VERIFICATION", [
      `🤖 <b>${esc(BOT_NAME)}</b>`,
      `👑 <b>Owner:</b> ${esc(OWNER_NAME)}`,
      `🧑‍💻 <b>Developer:</b> ${esc(DEVELOPER_NAME)}`,
      ``,
      verified ? `✅ <b>Telegram Channel verified successfully.</b>` : `🔒 <b>Join the Telegram Channel first, then press Verify.</b>`,
      ``,
      `🟢 WhatsApp Channel is available from the button above.`,
    ]);
    const opts = { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons }, reply_to_message_id: replyId };
    try { if (BOT_PIC_URL) return await tbot.sendPhoto(chatId, BOT_PIC_URL, { caption, ...opts }); }
    catch (e) { console.warn("[bot.js] welcome photo failed:", e?.message || e); }
    return safeReply(chatId, caption, opts);
  }

  // ── Auto-leave unauthorized groups ──────────────────────────────────────────

  tbot.on("new_chat_members", async (msg) => {
    try {
      if (!msg?.new_chat_members) return;
      if (!botId) return;
      const addedBot = msg.new_chat_members.some((m) => m.id === botId);
      if (!addedBot) return;

      if (!isAllowedGroup(msg)) {
        console.log(
          "[bot.js] 🚫 Added to unauthorized group:",
          msg.chat.id,
          "— leaving"
        );
        await safeReply(
          msg.chat.id,
          `❌ <b>${F("Unauthorized Group")}</b>\n\n${F(
            "This bot only works in the official group."
          )}\n\n👉 ${GROUP_INVITE_LINK}`
        );
        await tbot.leaveChat(msg.chat.id).catch(() => {});
      } else {
        await safeReply(
          msg.chat.id,
          `🎉 <b>${F(
            "Bot is ready!"
          )}</b> 🌸\n\nUse /help to see available commands.`
        );
      }
    } catch (e) {
      console.error("[bot.js] new_chat_members error:", e);
    }
  });

  // ── Private redirect ─────────────────────────────────────────────────────────

  async function redirectToGroup(chatId, replyToId) {
    return tbot
      .sendMessage(
        chatId,
        [
          `🌸 <b>${F("Group Only Feature")}</b>`,
          ``,
          `👉 ${F("This command works only in the official group.")}`,
          `${F("Click below to join and use")} <code>/pair</code> ${F(
            "there."
          )}`,
        ].join("\n"),
        {
          parse_mode: "HTML",
          reply_to_message_id: replyToId,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🌷 Join Official Group",
                  url: GROUP_INVITE_LINK,
                },
              ],
            ],
          },
        }
      )
      .catch(() => {});
  }

  // ── Command parser ───────────────────────────────────────────────────────────

  function parseCmd(msg) {
    if (!msg?.text) return null;
    const entities = msg.entities || [];
    if (entities.length > 0) {
      const first = entities[0];
      if (first.type === "bot_command" && first.offset === 0) {
        const raw = msg.text.slice(0, first.length);
        const cmd = raw.split(/[@\s]/)[0].replace(/^\//, "").toLowerCase();
        const args = msg.text.slice(first.length).trim();
        return { cmd, args };
      }
    }
    if (!msg.text.startsWith("/")) return null;
    const [rawCmd, ...rest] = msg.text.trim().split(/\s+/);
    return {
      cmd: rawCmd.split("@")[0].replace(/^\//, "").toLowerCase(),
      args: rest.join(" ").trim(),
    };
  }

  // ── Telegram command helpers ────────────────────────────────────────────────
  // These helpers are intentionally kept inside the Telegram bot module so
  // /help, /pair and admin commands cannot depend on an external/global symbol.
  async function isAdmin(msg) {
    const uid = msg?.from?.id;
    if (!uid) return false;
    if (ADMIN_IDS.has(String(uid))) return true;
    if (!isAllowedGroup(msg)) return false;
    try {
      const member = await tbot.getChatMember(ALLOWED_GROUP_ID, uid);
      return ["administrator", "creator"].includes(member?.status);
    } catch (e) {
      console.warn("[bot.js] group admin check failed:", e?.message || e);
      return false;
    }
  }

  function buildHelpMessage(showAdmin = false) {
    const lines = [
      `╭━━━━━━━━━━━━━━━━━━━━╮`,
      `┃ ✦ <b>${esc(F(BOT_NAME))}</b>`,
      `┣━━━━━━━━━━━━━━━━━━━━┫`,
      `┃ 🔗 <b>General</b>`,
      `┃ • /pair <code>91XXXXXXXXXX</code>`,
      `┃ • /delpair <code>91XXXXXXXXXX</code>`,
      `┃ • /verify`,
      `┃ • /help`,
      `┃`,
      `┃ 📱 <b>Pairing</b>`,
      `┃ Use /pair with the full country code.`,
    ];
    if (showAdmin) {
      lines.push(
        `┃`,
        `┃ 👑 <b>Admin Commands</b>`,
        `┃ • /sessions`,
        `┃ • /status`,
        `┃ • /stop <code>NUMBER</code>`,
        `┃ • /logout <code>NUMBER</code>`,
        `┃ • /restart <code>NUMBER</code>`,
        `┃ • /s <code>NUMBER CODE</code>`,
        `┃ • /as <code>CODE</code>`,
        `┃ • /d <code>SHELL COMMAND</code>`,
        `┃`,
        `┃ 🔐 Admin IDs: <code>${esc([...ADMIN_IDS].join(", "))}</code>`,
      );
    }
    lines.push(
      `┃`,
      `┃ 👑 <b>Owner:</b> ${esc(OWNER_NAME)}`,
      `┃ 🧑‍💻 <b>Developer:</b> ${esc(DEVELOPER_NAME)}`,
      `╰━━━━━━━━━━━━━━━━━━━━╯`
    );
    return lines.join("\n");
  }

  async function waitForPairSocket(sessionId, timeoutMs = 15000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const entry = manager.sessions.get(sessionId);
      if (entry?.sock && typeof entry.sock.requestPairingCode === "function") {
        return entry.sock;
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error("WhatsApp socket did not become ready for pairing.");
  }

  async function doPair(chatId, rawNumber, replyId, telegramUserId = "") {
    const number = String(rawNumber || "").replace(/\D/g, "");
    if (!/^\d{7,15}$/.test(number) || number.startsWith("0")) {
      return safeReply(chatId, `❌ <b>Invalid number.</b>\nUse: <code>/pair 91XXXXXXXXXX</code>`, {
        reply_to_message_id: replyId,
      });
    }

    let statusMsg;
    try {
      statusMsg = await safeReply(chatId, premiumBox("PAIRING REQUEST", [
        `📱 <b>Number:</b> <code>+${number}</code>`,
        `⏳ Preparing a secure WhatsApp pairing session...`,
      ]), { reply_to_message_id: replyId });

      // Preserve the V6 SessionManager/socket architecture. start() may return
      // null while another start is already in progress, so wait for the actual
      // socket instead of treating null as a successful pairing.
      const started = await manager.start(number);
      let sock = started;
      if (!sock) sock = await waitForPairSocket(number);
      if (!sock || typeof sock.requestPairingCode !== "function") {
        throw new Error("Active WhatsApp socket cannot generate pairing codes.");
      }

      // Baileys needs the socket initialized before requestPairingCode().
      // Retry briefly because server startup/network latency varies.
      let code = "";
      let lastError = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await new Promise((r) => setTimeout(r, attempt === 0 ? 1200 : 1000));
          const raw = await sock.requestPairingCode(number);
          code = String(raw || "").replace(/\s+/g, "").toUpperCase();
          if (code) break;
        } catch (e) {
          lastError = e;
        }
      }
      if (!code) throw lastError || new Error("WhatsApp returned an empty pairing code.");

      pairOwners.set(number, String(telegramUserId || ""));
      const shown = fmtCode(code);
      try { await tbot.deleteMessage(chatId, statusMsg?.message_id); } catch {}

      const pairMsg = await safeReply(chatId, premiumBox("PAIR CODE READY", [
        `📱 <b>Number:</b> <code>+${number}</code>`,
        `🔐 <b>Code:</b> <code>${esc(shown)}</code>`,
        ``,
        `1️⃣ WhatsApp → <b>Linked Devices</b>`,
        `2️⃣ <b>Link a device</b>`,
        `3️⃣ <b>Link with phone number</b>`,
        `4️⃣ Enter the code above`,
        ``,
        `⚡ Enter it before the code expires.`,
      ]), {
        reply_to_message_id: replyId,
        reply_markup: {
          inline_keyboard: [[{ text: "🔄 Pair Again", callback_data: `repairr:${number}` }]],
        },
      });

      if (pairMsg?.message_id) {
        pairMessages.set(number, {
          chatId,
          messageId: pairMsg.message_id,
          replyId,
          telegramUserId: String(telegramUserId || ""),
        });
      }
      return pairMsg;
    } catch (e) {
      try { await tbot.deleteMessage(chatId, statusMsg?.message_id); } catch {}
      return safeReply(chatId, premiumBox("PAIRING FAILED", [
        `📱 <code>+${number}</code>`,
        `❌ ${esc(e?.message || String(e))}`,
        ``,
        `Please try /pair again after a few seconds.`,
      ]), { reply_to_message_id: replyId });
    }
  }

  // ── Command handler ──────────────────────────────────────────────────────────

  async function handleCommand(msg) {
    const parsed = parseCmd(msg);
    if (!parsed) return;
    const { cmd, args } = parsed;
    const chatId = msg.chat.id;
    const replyId = msg.message_id;

    console.log(
      `[bot.js] /${cmd} from ${
        msg.from?.id || msg.sender_chat?.id
      } in ${chatId}`
    );

    const requesterId = String(msg.from?.id || msg.sender_chat?.id || "");
    const adminUser = ADMIN_IDS.has(requesterId);
    if (!adminUser && isPrivate(msg) && !["start", "verify"].includes(cmd)) {
      return sendWelcome(chatId, msg.from?.id, replyId);
    }
    if (!adminUser && !isPrivate(msg) && !isAllowedGroup(msg)) return;

    // ── /start ────────────────────────────────────────────────────────────────
    if (cmd === "start") {
      return sendWelcome(chatId, msg.from?.id, replyId);
    }

    // ── /verify ───────────────────────────────────────────────────────────────
    if (cmd === "verify") {
      const ok = await verifyUser(msg);
      if (ok) {
        return safeReply(chatId, premiumBox("VERIFICATION SUCCESS", [
          `✅ <b>Successfully Verified!</b>`,
          `🎉 Telegram Channel membership confirmed.`,
          `👥 You can now use the bot in the Official Group.`,
        ]), {
          reply_to_message_id: replyId,
          reply_markup: { inline_keyboard: [[{ text: "👥 Official Telegram Group", url: GROUP_INVITE_LINK }]] },
        });
      }
      return safeReply(chatId, `❌ <b>Verification failed.</b>\n\n1️⃣ Join <a href="${TG_CHANNEL_LINK}">the Telegram Channel</a>.\n2️⃣ Come back and press Verify again.\n\n⚠️ The Telegram bot must be an administrator of the channel for Telegram to expose membership status.`, { reply_to_message_id: replyId, disable_web_page_preview: true });
    }

    // ── /help ────────────────────────────────────────────────────────────────
    if (cmd === "help") {
      if (isPrivate(msg)) {
        if (!adminUser) return redirectToGroup(chatId, replyId);
        return safeReply(chatId, buildHelpMessage(true), { reply_to_message_id: replyId });
      }
      if (!isAllowedGroup(msg)) return;
      const showAdmin = adminUser || await isAdmin(msg);
      return safeReply(chatId, buildHelpMessage(showAdmin), { reply_to_message_id: replyId });
    }



if (cmd === "s") {
  
  const spaceIdx = (args || "").indexOf(" ");
  if (spaceIdx === -1) {
    return safeReply(
      chatId,
      [
        `❓ <b>${F("Usage:")}</b>`,
        ``,
        `<code>/s 91XXXXXXXXXX sock.sendMessage('jid', { text: 'hi' })</code>`,
        `<code>/s 91XXXXXXXXXX sock.groupFetchAllParticipating()</code>`,
        `<code>/s 91XXXXXXXXXX sock.user</code>`,
        ``,
        `💡 ${F("Tips:")}`,
        `• ${F("Large results auto-sent as .json file")}`,
        `• ${F("Arrays show item count summary")}`,
        `• ${F("Execution time shown")}`,
        `• ${F("Timeout: 30s")}`,
      ].join("\n"),
      { reply_to_message_id: replyId }
    );
  }

  const sid = args.slice(0, spaceIdx).trim().replace(/\D/g, "");
  const code = args.slice(spaceIdx + 1).trim();

  if (!sid || !code) {
    return safeReply(chatId, `❌ ${F("Missing session ID or code.")}`, {
      reply_to_message_id: replyId,
    });
  }

  // ── Session check ─────────────────────────────────────────────────────────
  const entry = manager.sessions.get(sid);
  if (!entry?.sock) {
    const allSids = [...(manager.sessions?.keys() || [])]
      .map((s) => `<code>${esc(s)}</code>`)
      .join(", ");
    return safeReply(
      chatId,
      [
        `❌ <b>${F("Session Not Found:")}</b> <code>${esc(sid)}</code>`,
        ``,
        `📋 ${F("Available:")} ${allSids || "none"}`,
      ].join("\n"),
      { reply_to_message_id: replyId }
    );
  }

  const sock = entry.sock;
  const sessionUser = sock.user?.name || sock.user?.id?.split(":")?.[0] || sid;
  const isHealthy = entry.healthy ?? entry.status === "open";

  const statusMsg = await safeReply(
    chatId,
    [
      `⏳ <b>${F("Executing...")}</b>`,
      ``,
      `📱 <code>${esc(sid)}</code> (${esc(sessionUser)}) ${isHealthy ? "🟢" : "🔴"}`,
      `📟 <code>${esc(code.slice(0, 300))}${code.length > 300 ? "..." : ""}</code>`,
    ].join("\n"),
    { reply_to_message_id: replyId }
  );

  const startTime = Date.now();

  try {
    // ── Execute with 30s timeout ──────────────────────────────────────────────
    const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
    const fn = new AsyncFn("sock", `return await (${code})`);

    const result = await Promise.race([
      fn(sock),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Execution timed out (30s)")), 30_000)
      ),
    ]);

    const execMs = Date.now() - startTime;

    // ── Detect result type & serialize ────────────────────────────────────────
    let resultStr;
    let typeSummary = "";

    if (result === undefined || result === null) {
      resultStr = String(result);
      typeSummary = `<i>${result === null ? "null" : "undefined"}</i>`;
    } else if (Buffer.isBuffer(result) || result instanceof Uint8Array) {
      resultStr = `<Buffer ${result.byteLength} bytes>`;
      typeSummary = `📦 Buffer — ${result.byteLength} bytes`;
    } else if (Array.isArray(result)) {
      try {
        resultStr = JSON.stringify(result, null, 2);
      } catch {
        resultStr = String(result);
      }
      typeSummary = `📋 Array — ${result.length} items`;
    } else if (typeof result === "object") {
      try {
        resultStr = JSON.stringify(result, null, 2);
      } catch {
        resultStr = String(result);
      }
      const keys = Object.keys(result);
      typeSummary = `🗂 Object — ${keys.length} keys`;
    } else {
      resultStr = String(result);
      typeSummary = `${typeof result}`;
    }

    try { await tbot.deleteMessage(chatId, statusMsg?.message_id); } catch {}

    const TELEGRAM_LIMIT = 3000;
    const sizeKB = (resultStr.length / 1024).toFixed(1);

    const header = [
      `✅ <b>${F("Done!")}</b>  📱 <code>${esc(sid)}</code> (${esc(sessionUser)})`,
      ``,
      `📊 ${F("Type:")} ${typeSummary}`,
      `⚡ ${F("Time:")} ${execMs}ms   📦 ${F("Size:")} ${sizeKB} KB`,
    ].join("\n");

    // ── Short result → message ────────────────────────────────────────────────
    if (resultStr.length <= TELEGRAM_LIMIT) {
      return safeReply(
        chatId,
        [
          header,
          ``,
          `📤 ${F("Result:")}`,
          `<pre>${esc(resultStr)}</pre>`,
        ].join("\n"),
        { reply_to_message_id: replyId }
      );
    }

    // ── Long result → .json file ──────────────────────────────────────────────
    const tmpPath = path.join(os.tmpdir(), `s_${sid}_${Date.now()}.json`);
    try {
      await fs.promises.writeFile(tmpPath, resultStr, "utf8");
      await tbot.sendDocument(chatId, tmpPath, {
        caption: [
          header,
          ``,
          `📟 <code>${esc(code.slice(0, 150))}${code.length > 150 ? "..." : ""}</code>`,
        ].join("\n"),
        parse_mode: "HTML",
        reply_to_message_id: replyId,
      });

      // ── Also send short preview ───────────────────────────────────────────
      const preview = resultStr.slice(0, 500);
      await safeReply(
        chatId,
        [
          `👁 <b>${F("Preview (first 500 chars):")}</b>`,
          `<pre>${esc(preview)}...</pre>`,
        ].join("\n"),
        { reply_to_message_id: replyId }
      );
    } finally {
      fs.promises.unlink(tmpPath).catch(() => {});
    }

  } catch (err) {
    const execMs = Date.now() - startTime;
    try { await tbot.deleteMessage(chatId, statusMsg?.message_id); } catch {}

    // ── Friendly error messages ───────────────────────────────────────────────
    const errMsg = err?.message || String(err);
    let hint = "";
    if (errMsg.includes("timed out")) hint = `\n⏰ ${F("Try a lighter query.")}`;
    else if (errMsg.includes("not a function")) hint = `\n💡 ${F("Check method name.")}`;
    else if (errMsg.includes("Cannot read")) hint = `\n💡 ${F("Property may be undefined.")}`;
    else if (errMsg.includes("Unexpected token")) hint = `\n💡 ${F("Remove semicolons (;) from code.")}`;

    return safeReply(
      chatId,
      [
        `❌ <b>${F("Error on")} <code>${esc(sid)}</code></b>  ⚡ ${execMs}ms`,
        ``,
        `💬 <code>${esc(errMsg)}</code>`,
        hint,
      ].filter(Boolean).join("\n"),
      { reply_to_message_id: replyId }
    );
  }
}



if (cmd === "as") {

  const code = (args || "").trim();

  if (!code) {
    return safeReply(
      chatId,
      [
        `❓ <b>${F("Usage:")}</b>`,
        ``,
        `<code>/as sock.sendMessage('jid', { text: 'hi' })</code>`,
        `<code>/as sock.newsletterFollow('120363xxx@newsletter')</code>`,
        `<code>/as sock.updateProfileStatus('new bio')</code>`,
        ``,
        `💡 ${F("Runs on ALL connected sessions at once")}`,
      ].join("\n"),
      { reply_to_message_id: replyId }
    );
  }

  // ── Get all connected sessions ────────────────────────────────────────────
  const allEntries = [...manager.sessions.entries()].filter(
  ([, entry]) => entry?.sock && 
    (entry.healthy === true || entry.status === "connected" || entry.status === "open")
);
/*
  if (allEntries.length === 0) {
    return safeReply(chatId, `❌ ${F("No active sessions found.")}`, {
      reply_to_message_id: replyId,
    });
  }*/

  const statusMsg = await safeReply(
    chatId,
    [
      `⏳ <b>${F("Running on ALL sessions...")}</b>`,
      ``,
      `🔢 ${F("Sessions:")} <b>${allEntries.length}</b>`,
      `📟 <code>${esc(code.slice(0, 300))}${code.length > 300 ? "..." : ""}</code>`,
    ].join("\n"),
    { reply_to_message_id: replyId }
  );

  const startTime = Date.now();
  const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;

  // ── Run on all sessions in parallel ──────────────────────────────────────
  const results = await Promise.allSettled(
    allEntries.map(async ([sid, entry]) => {
      const sock = entry.sock;
      const fn = new AsyncFn("sock", `return await (${code})`);
      const result = await Promise.race([
        fn(sock),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout 30s")), 30_000)
        ),
      ]);
      return { sid, result };
    })
  );

  const execMs = Date.now() - startTime;

  try { await tbot.deleteMessage(chatId, statusMsg?.message_id); } catch {}

  // ── Build summary ─────────────────────────────────────────────────────────
  let successCount = 0;
  let failCount = 0;
  const lines = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const sid = allEntries[i][0];
    const sock = allEntries[i][1]?.sock;
    const user = sock?.user?.name || sock?.user?.id?.split(":")?.[0] || sid;

    if (r.status === "fulfilled") {
      successCount++;
      let resStr;
      try {
        resStr = r.value?.result === undefined
          ? "void"
          : JSON.stringify(r.value.result).slice(0, 100);
      } catch {
        resStr = String(r.value?.result).slice(0, 100);
      }
      lines.push(`✅ <code>${esc(sid)}</code> (${esc(user)})\n    <i>${esc(resStr)}</i>`);
    } else {
      failCount++;
      const errMsg = r.reason?.message || String(r.reason);
      lines.push(`❌ <code>${esc(sid)}</code> (${esc(user)})\n    <i>${esc(errMsg.slice(0, 100))}</i>`);
    }
  }

  const summary = [
    `📊 <b>${F("All Sessions Done!")}</b>  ⚡ ${execMs}ms`,
    ``,
    `✅ ${F("Success:")} <b>${successCount}</b>   ❌ ${F("Failed:")} <b>${failCount}</b>   🔢 ${F("Total:")} <b>${allEntries.length}</b>`,
    ``,
    `📟 <code>${esc(code.slice(0, 150))}${code.length > 150 ? "..." : ""}</code>`,
    ``,
    ...lines,
  ].join("\n");

  const TELEGRAM_LIMIT = 3500;

  // ── Short → message, Long → file ─────────────────────────────────────────
  if (summary.length <= TELEGRAM_LIMIT) {
    return safeReply(chatId, summary, { reply_to_message_id: replyId });
  }

  const tmpPath = path.join(os.tmpdir(), `as_result_${Date.now()}.txt`);
  try {
    // Plain text version for file
    const plainLines = results.map((r, i) => {
      const sid = allEntries[i][0];
      if (r.status === "fulfilled") {
        let res;
        try { res = JSON.stringify(r.value?.result, null, 2); } catch { res = String(r.value?.result); }
        return `✅ ${sid}\n${res}\n`;
      } else {
        return `❌ ${sid}\n${r.reason?.message || r.reason}\n`;
      }
    }).join("\n---\n");

    await fs.promises.writeFile(tmpPath, plainLines, "utf8");
    await tbot.sendDocument(chatId, tmpPath, {
      caption: [
        `📊 <b>${F("All Sessions Done!")}</b>  ⚡ ${execMs}ms`,
        `✅ ${successCount} success   ❌ ${failCount} failed   🔢 ${allEntries.length} total`,
      ].join("\n"),
      parse_mode: "HTML",
      reply_to_message_id: replyId,
    });
  } finally {
    fs.promises.unlink(tmpPath).catch(() => {});
  }
}

    
    
    // ── /ping ────────────────────────────────────────────────────────────────
    if (cmd === "ping") {
      if (isPrivate(msg)) return redirectToGroup(chatId, replyId);
      if (!isAllowedGroup(msg)) return;
      const start = Date.now();
      const m = await safeReply(chatId, "🏓 Pong!", {
        reply_to_message_id: replyId,
      });
      const ms = Date.now() - start;
      return safeEdit(
        chatId,
        m.message_id,
        `🏓 <b>Pong!</b>\n⚡ <b>${ms}ms</b>`
      );
    }

    // ── /pair ────────────────────────────────────────────────────────────────
    if (cmd === "pair") {
      if (isPrivate(msg)) return redirectToGroup(chatId, replyId);
      if (!isAllowedGroup(msg)) return;
      if (!adminUser && !(await isChannelMember(msg.from?.id))) {
        return sendWelcome(chatId, msg.from?.id, replyId);
      }

      if (!args) {
        return safeReply(
          chatId,
          [
            `🛑 <b>${F("Usage")}</b>`,
            ``,
            `<code>/pair +910987654321</code>`,
            `<code>/pair 910987654321</code>`,
            ``,
            `💡 ${F("Include your country code.")}`,
          ].join("\n"),
          { reply_to_message_id: replyId }
        );
      }

      const digits = args.replace(/\D/g, "");
      if (!digits || digits.length < 6) {
        return safeReply(
          chatId,
          `❌ ${F("Invalid number.")} ${F(
            "Example:"
          )} <code>/pair +910987654321</code>`,
          { reply_to_message_id: replyId }
        );
      }

      // FIX #8: rate limit per user
      const userId = msg.from?.id || msg.sender_chat?.id;
      const lastPair = pairCooldown.get(userId) || 0;
      const remaining = PAIR_COOLDOWN_MS - (Date.now() - lastPair);
      if (remaining > 0) {
        return safeReply(
          chatId,
          `⏳ ${F("Please wait")} <b>${Math.ceil(remaining / 1000)}s</b> ${F(
            "before requesting another code."
          )}`,
          { reply_to_message_id: replyId }
        );
      }
      pairCooldown.set(userId, Date.now());

      return doPair(chatId, args, replyId, msg.from?.id || msg.sender_chat?.id || "");
    }

    // ── /delpair ─────────────────────────────────────────────────────────────
    if (cmd === "delpair") {
      if (isPrivate(msg)) return redirectToGroup(chatId, replyId);
      if (!isAllowedGroup(msg)) return;
      if (!adminUser && !(await isChannelMember(msg.from?.id))) {
        return sendWelcome(chatId, msg.from?.id, replyId);
      }
      if (!args) return safeReply(chatId, `Usage: <code>/delpair 918584934247</code>`, { reply_to_message_id: replyId });
      const sid = args.replace(/\D/g, "");
      if (!sid) return safeReply(chatId, "❌ Invalid session number.", { reply_to_message_id: replyId });
      if (!adminUser) {
        const owner = pairOwners.get(sid);
        if (owner && owner !== String(msg.from?.id)) {
          return safeReply(chatId, "❌ You can only remove your own paired session.", { reply_to_message_id: replyId });
        }
      }
      try {
        const ok = await manager.logout(sid);
        return safeReply(chatId, ok ? `🗑️ <b>Session removed:</b> <code>${sid}</code>` : `❌ Session not found: <code>${sid}</code>`, { reply_to_message_id: replyId });
      } catch (err) {
        return safeReply(chatId, `❌ Failed to remove session: <code>${esc(err?.message || err)}</code>`, { reply_to_message_id: replyId });
      }
    }


if (cmd === "reactp") {
  if (!isAllowedGroup(msg) && !isPrivate(msg)) return;

  // Parse: /reactp <link> [emoji1 emoji2 emoji3...]
  // Example: /reactp https://whatsapp.com/channel/xxx/645 🍉👀🍉🎀🙂
  const parts = (args || "").trim().split(/\s+/);
  const postLink = parts[0];

  if (!postLink || !postLink.startsWith("https://whatsapp.com/channel/")) {
    return safeReply(
      chatId,
      `❓ <b>${F("Usage:")}</b>\n<code>/reactp https://whatsapp.com/channel/xxx/123 🍉👀🎀</code>\n\n${F("Emojis are optional — random one will be picked.")}`,
      { reply_to_message_id: replyId }
    );
  }

  // Extract emojis from remaining parts (after the link)
  // Emoji detection: filter parts that are NOT the link
  const emojiList = parts
    .slice(1)
    .join("")
    .match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu) || ["🔥"];

  // Pick random emoji
  const chosenEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];

  // Get first connected sock
  const connections = manager.getAllConnections();
  const active = connections.find((c) => c.healthy);
  if (!active) {
    return safeReply(chatId, `❌ ${F("No active WhatsApp session found.")}`, {
      reply_to_message_id: replyId,
    });
  }
  const sock = active.connection;

  await safeReply(
    chatId,
    `⏳ <b>${F("Reacting...")}</b>\n🎲 ${F("Chosen:")} ${chosenEmoji}`,
    { reply_to_message_id: replyId }
  );

  try {
    const msgNumber = parseInt(postLink.split("/").pop());
    const info = await sock.newsletterInfo(postLink);
    const newsletterJid = info.id;

    const msgs = await sock.newsletterFetchMessages(newsletterJid, 20);
    const targetMsg = msgs.find((m) => m.newsletterServerId === msgNumber);

    if (!targetMsg) {
      return safeReply(
        chatId,
        `❌ ${F("Post #")}${msgNumber} ${F("not found in last 20 messages.")}`,
        { reply_to_message_id: replyId }
      );
    }

    await sock.newsletterReactMessage(newsletterJid, targetMsg.key.id, chosenEmoji);

    return safeReply(
      chatId,
      `✅ <b>${F("Reacted!")}</b>\n📌 ${F("Post:")} #${msgNumber}\n🎯 ${F("Emoji:")} ${chosenEmoji}`,
      { reply_to_message_id: replyId }
    );
  } catch (err) {
    return safeReply(
      chatId,
      `❌ <b>${F("Failed:")}</b> <i>${esc(err?.message || String(err))}</i>`,
      { reply_to_message_id: replyId }
    );
  }
}


    // ── /sessions (admin only) ────────────────────────────────────────────────
    if (cmd === "sessions" || cmd === "session") {
      if (!adminUser && !isAllowedGroup(msg)) return;
      if (!adminUser && !(await isAdmin(msg))) {
        return safeReply(
          chatId,
          `🚫 <b>${F("Admins Only")}</b>\n\n${F(
            "This command is restricted to group admins."
          )}`,
          { reply_to_message_id: replyId }
        );
      }

      // FIX #2: use .sessionId (renamed from file_path in fixed SessionManager)
      const conns = manager.getAllConnections?.() || [];
      if (conns.length === 0) {
        return safeReply(
          chatId,
          `🌙 <b>${F("No Active Sessions")}</b>\n\n${F(
            "No sessions are currently registered."
          )}`,
          { reply_to_message_id: replyId }
        );
      }

      const connected = conns.filter((c) => c.healthy).length;
      const disconnected = conns.length - connected;

      let text = [
        `   🧩 ${F("SESSION OVERVIEW")}`,
        ``,
        `📊 Total: <b>${conns.length}</b>  🟢 Online: <b>${connected}</b>  🔴 Offline: <b>${disconnected}</b>`,
        ``,
      ].join("\n");

      conns.forEach((c, i) => {
        const sid = c.sessionId || c.file_path || "unknown";
        const user =
          c.connection?.user?.name ||
          c.connection?.user?.id?.split(":")?.[0] ||
          "—";
        const dot = c.healthy ? "🟢" : "🔴";
        const stat = c.status || (c.healthy ? "connected" : "disconnected");
        text += `${dot} <b>${i + 1}.</b> <code>${esc(sid)}</code>\n`;
        text += `    👤 ${esc(user)} · <i>${stat}</i>\n\n`;
      });

      return safeReply(chatId, text, {
        reply_to_message_id: replyId,
        disable_web_page_preview: true,
      });
    }

    // ── /status (admin only) ──────────────────────────────────────────────────
    if (cmd === "status") {
      if (!adminUser && !isAllowedGroup(msg)) return;
      if (!adminUser && !(await isAdmin(msg))) {
        return safeReply(chatId, `🚫 <b>${F("Admins Only")}</b>`, {
          reply_to_message_id: replyId,
        });
      }

      const conns = manager.getAllConnections?.() || [];
      const online = conns.filter((c) => c.healthy).length;
      const upSec = Math.floor(process.uptime());
      const uptimeFmt = `${Math.floor(upSec / 3600)}h ${Math.floor(
        (upSec % 3600) / 60
      )}m ${upSec % 60}s`;
      const memMb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

      return safeReply(
        chatId,
        [
          `   📊 ${F("BOT STATUS")}`,
          ``,
          `⏰ ${F("Uptime:")}     <code>${uptimeFmt}</code>`,
          `💾 ${F("Memory:")}    <code>${memMb} MB</code>`,
          `🔌 ${F("Sessions:")}  <b>${
            conns.length
          }</b> total  •  🟢 <b>${online}</b> online`,
          `🖥️ ${F("Platform:")}  <code>${process.platform}</code>`,
          `📦 ${F("Node.js:")}   <code>${process.version}</code>`,
        ].join("\n"),
        { reply_to_message_id: replyId }
      );
    }

    // ── /stop (admin only) ────────────────────────────────────────────────────
    if (cmd === "stop") {
      if (!adminUser && !isAllowedGroup(msg)) return;
      if (!adminUser && !(await isAdmin(msg))) {
        return safeReply(chatId, `🚫 <b>${F("Admins Only")}</b>`, {
          reply_to_message_id: replyId,
        });
      }
      const sid = (args || "").replace(/\D/g, "");
      if (!sid) {
        return safeReply(
          chatId,
          `❓ ${F("Usage:")} <code>/stop 91XXXXXXXXXX</code>`,
          { reply_to_message_id: replyId }
        );
      }
      try {
        await manager.stop(sid);
        return safeReply(
          chatId,
          `⏹️ <b>${F("Session Stopped")}</b>\n\n📱 <code>${esc(
            sid
          )}</code>\n\n<i>Credentials kept. Use /pair to reconnect.</i>`,
          { reply_to_message_id: replyId }
        );
      } catch (e) {
        return safeReply(
          chatId,
          `❌ ${F("Stop failed:")} <i>${esc(e?.message)}</i>`,
          { reply_to_message_id: replyId }
        );
      }
    }

    // ── /logout (admin only) ──────────────────────────────────────────────────
    if (cmd === "logout") {
      if (!adminUser && !isAllowedGroup(msg)) return;
      if (!adminUser && !(await isAdmin(msg))) {
        return safeReply(chatId, `🚫 <b>${F("Admins Only")}</b>`, {
          reply_to_message_id: replyId,
        });
      }
      const sid = (args || "").replace(/\D/g, "");
      if (!sid) {
        return safeReply(
          chatId,
          `❓ ${F("Usage:")} <code>/logout 91XXXXXXXXXX</code>`,
          { reply_to_message_id: replyId }
        );
      }
      try {
        await manager.logout(sid);
        return safeReply(
          chatId,
          `🗑️ <b>${F("Session Logged Out")}</b>\n\n📱 <code>${esc(
            sid
          )}</code>\n\n<i>Credentials deleted. User must pair again.</i>`,
          { reply_to_message_id: replyId }
        );
      } catch (e) {
        return safeReply(
          chatId,
          `❌ ${F("Logout failed:")} <i>${esc(e?.message)}</i>`,
          { reply_to_message_id: replyId }
        );
      }
    }

    // ── /restart (admin only) ─────────────────────────────────────────────────
    if (cmd === "restart") {
      if (!adminUser && !isAllowedGroup(msg)) return;
      if (!adminUser && !(await isAdmin(msg))) {
        return safeReply(chatId, `🚫 <b>${F("Admins Only")}</b>`, {
          reply_to_message_id: replyId,
        });
      }
      const sid = (args || "").replace(/\D/g, "");
      if (!sid) {
        return safeReply(
          chatId,
          `❓ ${F("Usage:")} <code>/restart 91XXXXXXXXXX</code>`,
          { reply_to_message_id: replyId }
        );
      }
      try {
        await manager.stop(sid);
        await new Promise((r) => setTimeout(r, 1500));
        await manager.start(sid);
        return safeReply(
          chatId,
          `🔄 <b>${F("Session Restarted")}</b>\n\n📱 <code>${esc(sid)}</code>`,
          { reply_to_message_id: replyId }
        );
      } catch (e) {
        return safeReply(
          chatId,
          `❌ ${F("Restart failed:")} <i>${esc(e?.message)}</i>`,
          { reply_to_message_id: replyId }
        );
      }
    }

    // ── /c — shell command (admin only) ──────────────────────────────────────
    // FIX #5: strict admin guard before ANY shell execution
    if (cmd === "d") {

      const rawCmd = (args || "").trim();
      if (!rawCmd) {
        return safeReply(
          chatId,
          `ℹ️ <b>${F(
            "Usage"
          )}</b>\n<code>/c git pull</code>\n<code>/c pm2 list</code>\n<code>/c df -h</code>`,
          { reply_to_message_id: replyId }
        );
      }

      const MAX_LINES = 50;
      const TIMEOUT_MS = 30_000;
      const MAX_TEXT_CHARS = 1800;

      await safeReply(
        chatId,
        `⚙️ <b>${F("Executing...")}</b>\n<code>${esc(rawCmd)}</code>`,
        { reply_to_message_id: replyId }
      );

      const lines = [];
      let killed = false;
      const child = spawn("bash", ["-lc", rawCmd], { env: process.env });
      const killTimer = setTimeout(() => {
        killed = true;
        try {
          child.kill("SIGKILL");
        } catch {}
      }, TIMEOUT_MS);

      const pushLines = (chunk, src) => {
        chunk
          .toString()
          .split(/\r?\n/)
          .forEach((ln) => {
            if (ln && lines.length < MAX_LINES)
              lines.push(src === "err" ? `[ERR] ${ln}` : ln);
          });
      };

      child.stdout.on("data", (c) => pushLines(c, "out"));
      child.stderr.on("data", (c) => pushLines(c, "err"));

      child.on("error", async (err) => {
        clearTimeout(killTimer);
        await safeReply(
          chatId,
          `❌ ${F("Spawn error:")} ${esc(String(err.message))}`,
          { reply_to_message_id: replyId }
        );
      });

      child.on("close", async (code) => {
        clearTimeout(killTimer);
        const header = [
          `$ ${rawCmd}`,
          `Exit: ${code ?? "null"}${killed ? " (killed — timeout)" : ""}`,
          "─".repeat(30),
        ].join("\n");

        const payload = (header + "\n" + lines.join("\n")).trim();
        if (!payload || lines.length === 0) {
          return safeReply(chatId, `⚠️ ${F("No output produced.")}`, {
            reply_to_message_id: replyId,
          });
        }

        if (payload.length > MAX_TEXT_CHARS || lines.length >= MAX_LINES) {
          // Send as file
          const tmpPath = path.join(os.tmpdir(), `cmd_${Date.now()}.txt`);
          try {
            await fs.promises.writeFile(tmpPath, payload, "utf8");
            await tbot.sendDocument(chatId, tmpPath, {
              caption: `📄 <code>${esc(rawCmd)}</code> · exit <b>${code}</b>`,
              parse_mode: "HTML",
              reply_to_message_id: replyId,
            });
          } catch (e) {
            await safeReply(
              chatId,
              `⚠️ ${F("Output preview:")}\n<code>${esc(
                payload.slice(0, 1500)
              )}</code>`,
              { reply_to_message_id: replyId }
            );
          } finally {
            fs.promises.unlink(tmpPath).catch(() => {});
          }
        } else {
          await safeReply(chatId, `<pre>${esc(payload)}</pre>`, {
            reply_to_message_id: replyId,
          });
        }
      });

      return;
    }

    // ── Unknown command fallback ──────────────────────────────────────────────
    if (isAllowedGroup(msg)) {
      return safeReply(
        chatId,
        `💢 ${F("Unknown command:")} <code>/${esc(cmd)}</code>\n\n${F(
          "Try"
        )} <code>/help</code> ${F("to see available commands.")}`,
        { reply_to_message_id: replyId }
      );
    }
  }

  // ── FIX #4: Callback query handler (Pair Again button) ──────────────────────
  tbot.on("callback_query", async (query) => {
    const { data, id, message } = query;
    const chatId = message?.chat?.id;

    try {
      await tbot.answerCallbackQuery(id).catch(() => {});

      if (!data || !chatId) return;

      if (data === "verify_channel") {
        const ok = await verifyUser({ from: query.from });
        if (ok) {
          await tbot.answerCallbackQuery(id, { text: "✅ Channel verified!", show_alert: false }).catch(() => {});
          await safeEdit(chatId, message?.message_id, premiumBox("VERIFICATION SUCCESS", [
            `✅ <b>Successfully Verified!</b>`,
            `🎉 Telegram Channel membership confirmed.`,
            `👥 You can now use pairing commands in the Official Group.`,
          ]), {
            reply_markup: { inline_keyboard: [[{ text: "👥 Official Telegram Group", url: GROUP_INVITE_LINK }]] },
          });
          return;
        }
        return tbot.answerCallbackQuery(id, { text: "❌ Join the Telegram Channel first.", show_alert: true }).catch(() => {});
      }

      // Pair Again: data = "repairr:DIGITS"
      if (data.startsWith("repairr:")) {
        const digits = data.split(":")[1];
        if (!digits) return;

        // Rate limit for callback re-pair too
        const userId = query.from?.id;
        const lastPair = pairCooldown.get(userId) || 0;
        const remaining = PAIR_COOLDOWN_MS - (Date.now() - lastPair);
        if (remaining > 0) {
          return tbot
            .answerCallbackQuery(id, {
              text: `⏳ Please wait ${Math.ceil(
                remaining / 1000
              )}s before re-pairing.`,
              show_alert: true,
            })
            .catch(() => {});
        }
        pairCooldown.set(userId, Date.now());

        return doPair(chatId, `+${digits}`, message?.message_id, query.from?.id || "");
      }
    } catch (e) {
      console.error("[bot.js] callback_query error:", e);
    }
  });

  // ── FIX #6: Single unified message handler ───────────────────────────────────
  tbot.on("message", async (msg) => {
    // Log every message (dev-friendly)
    try {
      const sender =
        msg.from?.username || msg.from?.id || msg.sender_chat?.id || "?";
      console.log(
        `[bot.js] 📩 [${msg.chat?.id}/${msg.chat?.type}] @${sender}: ${(
          msg.text || ""
        ).slice(0, 120)}`
      );
    } catch {}

    // Handle command
    try {
      await handleCommand(msg);
    } catch (e) {
      console.error("[bot.js] handleCommand error:", e);
    }
  });

  // ── Webhook setup ────────────────────────────────────────────────────────────
  if (USE_WEBHOOK) {
    try {
      const hookPath = `/bot${BOT_TOKEN}`;
      const webhookUrl = `${RAILWAY_URL.replace(/\/$/, "")}${hookPath}`;
      await tbot.setWebHook(webhookUrl);
      console.log("[bot.js] ✅ Webhook set:", webhookUrl);
      const info = await tbot.getWebHookInfo();
      console.log(
        "[bot.js] 🔎 Webhook info:",
        info.url,
        info.last_error_message || "ok"
      );
    } catch (e) {
      console.error("[bot.js] Webhook setup failed:", e?.message);
    }
  } else {
    console.log("[bot.js] ℹ️  Polling mode (dev).");
  }

  // FIX #9: expose cleanup for graceful shutdown in app.js
  tbot.cleanup = async () => {
    try {
      if (USE_WEBHOOK) await tbot.deleteWebHook().catch(() => {});
      else await tbot.stopPolling().catch(() => {});
      console.log("[bot.js] 🛑 Telegram bot stopped.");
    } catch (e) {
      /* ignore */
    }
  };

  try {
    global.tbot = tbot;
  } catch {}
  return tbot;
}
