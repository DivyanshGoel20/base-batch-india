"use client";

import {
  useMiniKit,
  useAddFrame,
} from "@coinbase/onchainkit/minikit";

// ig
import { useEffect, useMemo, useState, useCallback } from "react";
import { Home, Features } from "./components/DemoComponents";
import Leaderboard from "./components/Leaderboard";
import { Icon, Button } from "./components/DemoComponents";
import DailyQuiz from "./components/DailyQuiz";
import QuizCreator from "./components/QuizCreator";
import MyQuizzes from "./components/MyQuizzes";
import { sdk } from '@farcaster/frame-sdk';

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [streak, setStreak] = useState(0);
  const [userFid, setUserFid] = useState<number | null>(null);

  const addFrame = useAddFrame();


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


  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame]);

  const saveFrameButton = useMemo(() => {
    if (context && !context.client.added) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddFrame}
          className="text-[var(--app-accent)] p-4"
          icon={<Icon name="plus" size="sm" />}
        >
          Save Frame
        </Button>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-1 text-sm font-medium text-[#0052FF] animate-fade-out">
          <Icon name="check" size="sm" className="text-[#0052FF]" />
          <span>Saved</span>
        </div>
      );
    }

    return null;
  }, [context, frameAdded, handleAddFrame]);

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
  <div className="flex items-center space-x-2">
    <Icon name="star" size="lg" className="text-yellow-400 animate-bounce" />
    <span className="font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-[#ff4e50] via-[#f9d423] to-[#24c6dc] animate-gradient-x">QuizCast</span>
  </div>
  <div>{saveFrameButton}</div>
</header>

        <main className="flex-1">
          {activeTab === "home" && <Home setActiveTab={setActiveTab} streak={streak} />}
          {activeTab === "features" && <Features setActiveTab={setActiveTab} />}
          {activeTab === "daily-quiz" && <DailyQuiz onBack={() => setActiveTab("home")} />}
          {activeTab === "quiz-creator" && userFid && <QuizCreator onBack={() => setActiveTab("home")} userFid={userFid} />}
          {activeTab === "leaderboard" && <Leaderboard onBack={() => setActiveTab("home")} />}
          {activeTab === "my-quizzes" && userFid && <MyQuizzes onBack={() => setActiveTab("home")} userFid={userFid} />}
          {!userFid && <div>Loading Farcaster user...</div>}
        </main>
        
      </div>
    </div>
  );
}
