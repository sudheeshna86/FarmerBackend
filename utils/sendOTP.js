// utils/sendOTP.js
import client from "../config/twilio.js";

// export const sendOTP = async (phoneNumber, otp) => {
//   try {
//     const message = await client.messages.create({
//       body: `Your OTP is ${otp}`,
//       from: process.env.TWILIO_PHONE_NUMBER,
//       to: `+91${phoneNumber}`, // modify prefix if testing international
//     });
//     console.log("✅ OTP sent successfully:", message.sid);
//     return message;
//   } catch (error) {
//     console.error("❌ Error sending OTP:", error.message);
//     throw new Error(error.message);
//   }
// };

export const sendOTP = async (phone) => {
  if (!phone) throw new Error("Phone number is required");

  const verification = await client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({ to: phone, channel: "sms" });

  return verification;
};


export const verifyOTP = async (phone, otp) => {
  if (!phone || !otp) throw new Error("Phone and OTP are required");

  const verificationCheck = await client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({ to: phone, code: otp });

  return verificationCheck;
};

// // ---- RUN DIRECTLY ----
// if (process.argv[1].includes("sendOTP.js")) {
//   console.log("Twilio Account SID:", process.env.TWILIO_ACCOUNT_SID); 
//   console.log("Twilio Verify Service SID:", process.env.TWILIO_VERIFY_SERVICE_SID);
//   console.log("----------------------------------------------");

//   (async () => {
//     try {
//       console.log("Sending OTP to:", "+918919366234");

//       const res = await sendOTP("+918919366234");
//       console.log("OTP Sent. Status:", res.status);
//     } catch (err) {
//       console.error("Error sending OTP:", err.message);
//     }
//   })();
// }
