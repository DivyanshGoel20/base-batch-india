"use client";

import {
  useMiniKit
} from "@coinbase/onchainkit/minikit";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useEffect, useMemo, useState, useCallback } from "react";
import { Home, Features } from "./components/DemoComponents";
import Leaderboard from "./components/Leaderboard";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Icon, Button } from "./components/DemoComponents";
import DailyQuiz from "./components/DailyQuiz";
import QuizCreator from "./components/QuizCreator";
import MyQuizzes from "./components/MyQuizzes";
import { sdk } from '@farcaster/frame-sdk';

export default function App() {
  const { setFrameReady, isFrameReady } = useMiniKit();
  const [activeTab, setActiveTab] = useState("home");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [streak, setStreak] = useState(0);
  const [userFid, setUserFid] = useState<number | null>(null);


  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Farcaster Frame SDK: signal ready as soon as UI is ready
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  useEffect(() => {
    async function getUserFID() {
      try {
        const context = await sdk.context;
        if (context && context.user && context.user.fid) {
          setUserFid(context.user.fid);
        } else {
          setUserFid(null);
        }
      } catch {
        setUserFid(null);
      }
    }
    getUserFID();
  }, []);



  return (
    <div
      className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)]"
      style={{
        background: 'linear-gradient(120deg, #ffecd2 0%, #fcb69f 50%, #24c6dc 100%)',
        backgroundSize: '200% 200%',
        animation: 'gradientBG 12s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-fadein { animation: fadeIn 1.2s cubic-bezier(.39,.575,.565,1) both; }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(24px); }
          100% { opacity: 1; transform: none; }
        }
      `}</style>
      <div className="w-full max-w-md mx-auto px-4 py-3 animate-fadein">
        <header className="flex justify-between items-center mb-3 h-11">
</header>

        <main className="flex-1">
          {activeTab === "home" && <Home setActiveTab={setActiveTab} streak={streak} />}
          {activeTab === "features" && <Features setActiveTab={setActiveTab} />}
          {activeTab === "daily-quiz" && userFid && <DailyQuiz onBack={() => setActiveTab("home")} userFid={userFid}/>}
          {activeTab === "quiz-creator" && userFid && <QuizCreator onBack={() => setActiveTab("home")} userFid={userFid} />}
          {activeTab === "leaderboard" && <Leaderboard onBack={() => setActiveTab("home")} />}
          {activeTab === "my-quizzes" && userFid && <MyQuizzes onBack={() => setActiveTab("home")} userFid={userFid} />}
          {!userFid && <div>Loading Farcaster user...</div>}
        </main>
        
      </div>
    </div>
  );
}
