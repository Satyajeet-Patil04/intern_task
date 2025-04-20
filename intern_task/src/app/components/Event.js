"use client";
import React, { useState, useEffect } from "react";
import { auth, db, storage } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";


export default function Event({ eventId, startTime }) {
  const [user, setUser] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);

  
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (err) {
      console.error("Google sign-in error", err);
    }
  };

  
  const registerForEvent = async () => {
    if (!user) {
      return handleGoogleSignIn();
    }
    try {
      const regRef = doc(db, "registrations", `${eventId}_${user.uid}`);
      await setDoc(regRef, {
        uid: user.uid,
        email: user.email,
        eventId,
        registeredAt: new Date().toISOString(),
      });
      setRegistered(true);

      
      setSendingEmail(true);
      await fetch("/api/sendConfirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, eventId }),
      });
      setSendingEmail(false);
    } catch (err) {
      console.error("Registration error", err);
    }
  };

  
  useEffect(() => {
    (async () => {
      try {
        const audioRef = ref(storage, `events/${eventId}/audio.mp3`);
        const url = await getDownloadURL(audioRef);
        setAudioUrl(url);
      } catch (err) {
        console.error("Error fetching audio", err);
      }
    })();
  }, [eventId]);

  
  useEffect(() => {
    if (!startTime) return;
    const target = new Date(startTime).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((target - now) / 1000));
      setTimeLeft(diff);
    };
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [startTime]);

  
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Event: {eventId}</h2>

      {!registered ? (
        <button
          onClick={registerForEvent}
          className="w-full py-2 mb-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
        >
          {user ? "Confirm Registration" : "Sign in with Google"}
        </button>
      ) : (
        <p className="text-green-600 font-medium mb-4">
          You’re registered! {sendingEmail ? "Sending confirmation..." : "Confirmation sent."}
        </p>
      )}

      {audioUrl && (
        <div className="mt-6">
          <p className="mb-2">Starts in: <span className="font-mono">{formatTime(timeLeft)}</span></p>

          
          {timeLeft === 0 ? (
            <audio src={audioUrl} controls className="w-full mt-2 rounded" />
          ) : (
            <p className="text-gray-500">Audio will be available when the event starts.</p>
          )}
        </div>
      )}
    </div>
  );
}
