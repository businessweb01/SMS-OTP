import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseConfig.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();
const SEMAPHORE_OTP_URL = 'https://api.semaphore.co/api/v4/messages';

export async function sendOtp(phoneNumber) {
  const message = 'Your Siklo OTP code is {otp}. Please use it within 5 minutes to verify your number.';

  const params = new URLSearchParams();
  params.append('apikey', process.env.SEMAPHORE_API_KEY);
  params.append('sendername', 'SIKLO');
  params.append('number', phoneNumber);
  params.append('message', message); 

  const response = await fetch(SEMAPHORE_OTP_URL, {
    method: 'POST',
    body: params,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to send OTP: ${err}`);
  }

  const data = await response.json();

  if (!data || !data[0]?.code) {
    throw new Error('No OTP code returned from Semaphore');
  }

  const otpCode = data[0].code;

  const otpDocRef = doc(db, 'riderotps', phoneNumber);
  const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

  await setDoc(otpDocRef, {
    code: otpCode,
    expiresAt: expiry,
  });

  return { success: true, message: 'OTP sent successfully' };
}

export async function verifyOtp(phoneNumber, submittedOtp) {
  const otpDocRef = doc(db, 'otps', phoneNumber);
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
