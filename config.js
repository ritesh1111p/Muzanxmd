import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// ISHAN MD BOT — DIRECT PANEL CONFIG
// Edit values in THIS file only. No .env/config.env file is required.
// ============================================================================
const BOT_NAME = " ‎🩸 Mᴜᴢᴀɴ Xᴍᴅ ";
const OWNER_NAME = "চন্দ্রবিন্দুর চাঁদ";
const DEVELOPER_NAME = "চন্দ্রবিন্দুর চাঁদ";
const OWNER_NUMBER = "917980046966";
const PREFIX = ".";
const ANTIBOT_NUMBERS = process.env.ANTIBOT_NUMBERS || "";

// Telegram
const BOT_TOKEN_TELEGRAM = process.env.BOT_TOKEN_TELEGRAM || "8800097663:AAEKQrzoVGE1JhBWXvA8yQ2wUab1iRQYX28";
const TG_ADMIN_IDS = ["5924662015"];
const TG_CHANNEL_ID = "-1003233462140";
const TG_CHANNEL_LINK = "https://t.me/chandxxd";
const TG_GROUP_ID = "-1004410232326";
const TG_GROUP_LINK = "https://t.me/amuzanxxmd";
const TG_ADMIN_LINK = "https://t.me/mooN_X_2006";

// WhatsApp channel + menu media
const WA_CHANNEL_LINK = "https://whatsapp.com/channel/0029VbB4OB8AzNc4Da23JY05";
const WA_CHANNEL_JID = "120363419521830202@newsletter";
const BOT_PIC_URL = "https://files.catbox.moe/7oax6b.jpg";
const MENU_VIDEO_URL = "https://files.catbox.moe/n74rka.mp4";
const MENU_AUDIO_URL = "https://files.catbox.moe/s76fo4.mp3";

// Local persistence — no MongoDB.
const SESSION_DIR = path.join(__dirname, "sessions");
const META_FILE = path.join(__dirname, "data", "sessions.json");

// Compatibility bridge for older plugins that still read process.env.
const env = {
  BOT_NAME, OWNER_NAME, DEVELOPER_NAME, OWNER_NUMBER, PREFIX,
  BOT_TOKEN_TELEGRAM, ANTIBOT_NUMBERS, TG_CHANNEL_ID, TG_CHANNEL_LINK, TG_GROUP_ID,
  TG_GROUP_LINK, TG_ADMIN_LINK, WA_CHANNEL_LINK, WA_CHANNEL_JID,
  BOT_PIC_URL, MENU_VIDEO_URL, MENU_AUDIO_URL,
};
for (const [k, v] of Object.entries(env)) process.env[k] = String(v);
process.env.ANTIBOT_NUMBERS = String(ANTIBOT_NUMBERS);
process.env.NODE_ENV = "production";

export default {
  prefix: PREFIX,
  owner: OWNER_NUMBER,
  ownerNumber: OWNER_NUMBER,
  ownerContact: OWNER_NUMBER,
  sudo: OWNER_NUMBER,
  botName: BOT_NAME,
  BOT_NAME,
  ownerName: OWNER_NAME,
  OWNER_NAME,
  developerName: DEVELOPER_NAME,
  DEVELOPER_NAME,
  packname: BOT_NAME,
  author: DEVELOPER_NAME,
  version: "3.1.0",
  mode: "public",
  workType: "public",
  WORK_TYPE: "public",
  theme: "t",
  THEME: "t",
  timezone: "Asia/Kolkata",
  maxFileSize: 100 * 1024 * 1024,
  statusReact: false,
  STATUS_REACT: false,
  BOT_TOKEN_TELEGRAM,
  TG_ADMIN_ID: TG_ADMIN_IDS[0],
  TG_ADMIN_IDS,
  TG_ADMIN_LINK,
  TG_CHANNEL_ID,
  TG_CHANNEL_LINK,
  TG_GROUP_ID,
  TG_GROUP_LINK,
  WA_CHANNEL_LINK,
  WA_CHANNEL_JID,
  BOT_PIC_URL,
  MENU_VIDEO_URL,
  MENU_AUDIO_URL,
  whatsapp: {
    botPic: BOT_PIC_URL,
    channelLink: WA_CHANNEL_LINK,
    channelId: WA_CHANNEL_JID,
    menuVideo: MENU_VIDEO_URL,
    menuAudio: MENU_AUDIO_URL,
  },
  tg: {
    token: BOT_TOKEN_TELEGRAM,
    adminIds: TG_ADMIN_IDS,
    adminId: TG_ADMIN_IDS[0],
    adminLink: TG_ADMIN_LINK,
    channelId: TG_CHANNEL_ID,
    channelLink: TG_CHANNEL_LINK,
    groupId: TG_GROUP_ID,
    groupLink: TG_GROUP_LINK,
  },
  authDir: SESSION_DIR,
  AUTH_DIR: SESSION_DIR,
  SESSION_DIR,
  META_FILE,
  SESSION_ID: "",
  CONCURRENCY: 5,
  START_DELAY_MS: 500,
  RECONNECT_LIMIT: 10,
};
