import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseConfig.js'; // ✅ Firestore instance
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 🚀 Send OTP (resends overwrite old OTP)
export async function sendOtp(phoneNumber) {
  const otpCode = generateOtp();
  const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes from now

  const message = `Your Siklo OTP code is ${otpCode}. Please use it within 5 minutes to verify your number.`;

  const response = await fetch('https://api.textbee.dev/api/v1/gateway/devices/684687fe5c3a8ee28885f0d5/send-sms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.SMS_API_KEY,
    },
    body: JSON.stringify({
      recipients: [phoneNumber],
      message: message,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to send OTP: ${err}`);
  }

  // ✅ Overwrite existing OTP in Firestore
  const otpDocRef = doc(db, 'riderotps', phoneNumber);
  await setDoc(otpDocRef, {
    code: otpCode,
    expiresAt: expiry,
  });

  return { success: true, message: 'OTP sent successfully' };
}

// ✅ Verify OTP
export async function verifyOtp(phoneNumber, submittedOtp) {
  const otpDocRef = doc(db, 'riderotps', phoneNumber);
  const docSnap = await getDoc(otpDocRef);

  if (!docSnap.exists()) {
    return { success: false, message: 'No OTP found or already used/expired' };
  }

  const { code, expiresAt } = docSnap.data();

  if (Date.now() > expiresAt) {
    await deleteDoc(otpDocRef); // delete expired OTP
    return { success: false, message: 'OTP expired' };
  }

  if (submittedOtp !== code) {
    return { success: false, message: 'Invalid OTP' };
  }

  // ✅ Valid OTP - delete after use
  await deleteDoc(otpDocRef);

  return { success: true, message: 'OTP verified successfully' };
}
