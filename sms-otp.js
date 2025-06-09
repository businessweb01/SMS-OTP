// import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
// import { db } from './firebaseConfig.js';
// import fetch from 'node-fetch';
// import dotenv from 'dotenv';

// dotenv.config();
// const SEMAPHORE_OTP_URL = 'https://api.semaphore.co/api/v4/messages';

// export async function sendOtp(phoneNumber) {
//   const message = 'Your Siklo OTP code is {otp}. Please use it within 5 minutes to verify your number.';

//   const params = new URLSearchParams();
//   params.append('apikey', process.env.SEMAPHORE_API_KEY);
//   params.append('sendername', 'SIKLO');
//   params.append('number', phoneNumber);
//   params.append('message', message); 

//   const response = await fetch(SEMAPHORE_OTP_URL, {
//     method: 'POST',
//     body: params,
//   });

//   if (!response.ok) {
//     const err = await response.text();
//     throw new Error(`Failed to send OTP: ${err}`);
//   }

//   const data = await response.json();

//   if (!data || !data[0]?.code) {
//     throw new Error('No OTP code returned from Semaphore');
//   }

//   const otpCode = data[0].code;

//   const otpDocRef = doc(db, 'otps', phoneNumber);
//   const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

//   await setDoc(otpDocRef, {
//     code: otpCode,
//     expiresAt: expiry,
//   });

//   return { success: true, message: 'OTP sent successfully' };
// }

// export async function verifyOtp(phoneNumber, submittedOtp) {
//   const otpDocRef = doc(db, 'otps', phoneNumber);
//   const docSnap = await getDoc(otpDocRef);

//   if (!docSnap.exists()) {
//     return { success: false, message: 'No OTP found or OTP expired' };
//   }

//   const { code, expiresAt } = docSnap.data();

//   if (Date.now() > expiresAt) {
//     await deleteDoc(otpDocRef);
//     return { success: false, message: 'OTP expired' };
//   }

//   if (submittedOtp !== code) {
//     return { success: false, message: 'Invalid OTP' };
//   }

//   await deleteDoc(otpDocRef);

//   return { success: true, message: 'OTP verified successfully' };
// }
import { config } from 'dotenv';
import twilio from 'twilio';

config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

/**
 * Send OTP using Twilio Verify API
 */
export async function sendOtp(phoneNumber) {
  try {
    const verification = await client.verify.v2
      .services(verifySid)
      .verifications.create({ to: phoneNumber, channel: 'sms' });

    if (verification.status === 'pending') {
      return { success: true, message: 'OTP sent successfully' };
    } else {
      return { success: false, message: 'Failed to send OTP' };
    }
  } catch (error) {
    console.error('Twilio Send OTP Error:', error.message);
    return { success: false, message: 'Twilio error: ' + error.message };
  }
}

/**
 * Verify submitted OTP using Twilio Verify API
 */
export async function verifyOtp(phoneNumber, submittedOtp) {
  try {
    const verificationCheck = await client.verify.v2
      .services(verifySid)
      .verificationChecks.create({ to: phoneNumber, code: submittedOtp });

    if (verificationCheck.status === 'approved') {
      return { success: true, message: 'OTP verified successfully' };
    } else {
      return { success: false, message: 'Invalid or expired OTP' };
    }
  } catch (error) {
    console.error('Twilio Verify OTP Error:', error.message);
    return { success: false, message: 'Twilio error: ' + error.message };
  }
}
