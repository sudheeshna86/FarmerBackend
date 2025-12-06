// // config/twilio.js
// import twilio from "twilio";
// import dotenv from "dotenv";
// // // dotenv.config();
// // dotenv.config({ path: new URL("../.env", import.meta.url).pathname });

// console.log(
//   "ACCOUNT:", process.env.TWILIO_ACCOUNT_SID,
//   "AUTH:", process.env.TWILIO_AUTH_TOKEN,
//   "VERIFY:", process.env.TWILIO_VERIFY_SERVICE_SID
// );

// const client = twilio(
//   process.env.TWILIO_ACCOUNT_SID,   // correct
//   process.env.TWILIO_AUTH_TOKEN     // correct
// );

// export default client;
// config/twilio.js
import twilio from "twilio";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 1. Get the current directory name (ES Module fix)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Load the .env file from the PARENT directory (../.env)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

console.log(
  "ACCOUNT:", process.env.TWILIO_ACCOUNT_SID,
  "AUTH:", process.env.TWILIO_AUTH_TOKEN , // Don't log the full token for security
  "VERIFY:", process.env.TWILIO_VERIFY_SERVICE_SID
);

// 3. Check if variables exist before creating client
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  throw new Error("❌ Twilio credentials missing from .env file");
}

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default client;