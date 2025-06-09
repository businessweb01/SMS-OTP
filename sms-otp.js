import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseConfig.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();
// Helper to generate a 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Main OTP function using TextBee
export async function sendOtp(phoneNumber) {
  const otpCode = generateOtp();

  const message = `Your Siklo OTP code is ${otpCode}. Please use it within 5 minutes to verify your number.`;

  const response = await fetch('https://api.textbee.dev/api/v1/gateway/devices/684687fe5c3a8ee28885f0d5/send-sms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.SMS_API_KEY,
    },
    body: JSON.stringify({
      recipients: [phoneNumber], // Array of recipients as required by TextBee
      message: message,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to send OTP: ${err}`);
  }

  // Save OTP and expiry to Firestore
  const otpDocRef = doc(db, 'riderotps', phoneNumber);
  const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes from now

  await setDoc(otpDocRef, {
    code: otpCode,
    expiresAt: expiry,
  });

  return { success: true, message: 'OTP sent successfully', otp: otpCode }; // optional: return OTP for dev testing
}

export async function verifyOtp(phoneNumber, submittedOtp) {
  const otpDocRef = doc(db, 'riderotps', phoneNumber);
  const docSnap = await getDoc(otpDocRef);

  if (!docSnap.exists()) {
    return { success: false, message: 'No OTP found or OTP expired' };
  }

  const { code, expiresAt } = docSnap.data();

  if (Date.now() > expiresAt) {
    await deleteDoc(otpDocRef);
    return { success: false, message: 'OTP expired' };
  }

  if (submittedOtp !== code) {
    return { success: false, message: 'Invalid OTP' };
  }

  await deleteDoc(otpDocRef);

  return { success: true, message: 'OTP verified successfully' };
}
