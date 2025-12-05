// utils/sendOTP.js
import client from "../config/twilio.js";

export const sendOTP = async (phoneNumber, otp) => {
  try {
    const message = await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${phoneNumber}`, // modify prefix if testing international
    });
    console.log("✅ OTP sent successfully:", message.sid);
    return message;
  } catch (error) {
    console.error("❌ Error sending OTP:", error.message);
    throw new Error(error.message);
  }
};

