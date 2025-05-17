"use client";
import { useState } from "react";
import { Card, Button, Icon } from "./DemoComponents";
import { useEffect, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DAILY_QUIZ_KEY = "daily_quiz_last_completed_at";
const QUIZ_LENGTH = 5;
const QUESTION_TIME = 10; // seconds





// Global variable to cache fetched questions (shared across browser tabs)
// GLOBAL_CACHE_KEY removed: no cache in localStorage

// Type for question returned by the trivia API
interface TriviaApiQuestion {
  correctAnswer: string;
  incorrectAnswers: string[];
  question: { text: string };
}

function getISTDateString(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split('T')[0];
}

// Fetch daily questions from API or database
function shuffleArray<T>(array: T[], seed: number): T[] {
  // Seeded shuffle using Fisher-Yates
  const arr = array.slice();
  let m = arr.length, t: T, i: number;
  const random = mulberry32(seed);
  while (m) {
    i = Math.floor(random() * m--);
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
}
// Seeded random generator
function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

async function fetchDailyQuestions() {
  // Use a fixed seed for the day to ensure everyone gets the same random questions
  const today = getISTDateString();
  const daySeed = parseInt(today.replace(/-/g, ''));
  const seedParam = `&seed=${daySeed}`;

  try {
    const resp = await fetch('https://the-trivia-api.com/v2/questions?limit=5' + seedParam);
    const data = await resp.json();
    // Shuffle options for each question with a deterministic seed
    return (data.slice(0, QUIZ_LENGTH) as TriviaApiQuestion[]).map((q, idx) => {
      const allOptions = [q.correctAnswer, ...q.incorrectAnswers];
      // Use a different seed per question for shuffle
      const shuffled = shuffleArray(allOptions, daySeed + idx);
      const answer = shuffled.findIndex(opt => opt === q.correctAnswer);
      return {
        text: q.question.text,
        options: shuffled,
        answer,
      };
    });
  } catch (e) {
    console.error("Failed to fetch quiz questions:", e);
    return null;
  }
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { supabase } from "../lib/supabaseClient";

interface DailyQuizProps {
  onBack: () => void;
  userFid: number;
}

export default function DailyQuiz({ onBack, userFid }: DailyQuizProps) {
    // State for questions and loading
  const [questions, setQuestions] = useState<Array<{text: string; options: string[]; answer: number}>|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number|null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string|null>(null);

  // Helper to load questions
  async function loadQuestions() {
    setLoading(true);
    setError(false);
    const qs = await fetchDailyQuestions();
    setQuestions(qs);
    setLoading(false);
    if (!qs || !Array.isArray(qs) || qs.length === 0) setError(true);
  }

  // Retry handler
  function handleRetry() {
    setError(false);
    setLoading(true);
    setTimeout(() => loadQuestions(), 100);
  }

  // On mount, check if locked, else load questions
  // On mount, fetch streak and last completed from Supabase
  useEffect(() => {
    async function fetchStats() {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const { data, error } = await supabase
          .from('daily_quiz_user_stats')
          .select('*')
          .eq('user_fid', userFid)
          .single();
        if (error && error.code !== 'PGRST116') { // Not found is ok
          setStatsError('Failed to load quiz stats');
          setStatsLoading(false);
          setLoading(false);
          return;
        }
        if (data) {
          setStreak(data.streak || 0);
          if (data.last_completed_at) {
            const last = new Date(data.last_completed_at).getTime();
            const now = Date.now();
            if (now - last < 24 * 60 * 60 * 1000) {
              setLockedUntil(last + 24 * 60 * 60 * 1000);
              setLoading(false);
              setStatsLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        setStatsError('Failed to load quiz stats');
      }
      setStatsLoading(false);
      loadQuestions();
    }
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userFid]);

  const [step, setStep] = useState<"quiz"|"done"|"locked"|"error">("quiz");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number|null>(null);
  const [points, setPoints] = useState(0);
  const [timer, setTimer] = useState(QUESTION_TIME);
  const timerRef = useRef<NodeJS.Timeout|null>(null);





  // Timer logic
  useEffect(() => {
    if (step !== "quiz" || !questions) return;
    if (timer === 0) {
      handleAnswer(null);
      return;
    }
    const intervalId = setInterval(() => {
      setTimer(t => t - 1);
    }, 1000);
    timerRef.current = intervalId;
    return () => clearInterval(intervalId);
  }, [step, timer, questions]);

  function handleAnswer(selectedIdx: number | null) {
    if (!questions || !Array.isArray(questions) || questions.length === 0 || current < 0 || current >= questions.length) {
      setStep("error");
      return;
    }
    if (selected !== null) return; // Prevent double click
    setSelected(selectedIdx);
    // Give feedback for 1.2s, then go to next question or finish
    setTimeout(() => {
      if (selectedIdx === questions[current].answer) setPoints(p => p + 1);
      const next = current + 1;
      if (next < questions.length) {
        setCurrent(next);
        setSelected(null);
        setTimer(QUESTION_TIME);
      } else {
        setStep('done');
        setSelected(null);
        setTimer(0);
        // Lock quiz for 24 hours and update streak in Supabase
        (async () => {
          try {
            // Fetch current stats
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { data, error } = await supabase
              .from('daily_quiz_user_stats')
              .select('*')
              .eq('user_fid', userFid)
              .single();
            let newStreak = 1;
            const now = new Date();
            if (data) {
              const last = new Date(data.last_completed_at).getTime();
              // If last completed was more than 48 hours ago, reset streak
              if (Date.now() - last > 48 * 60 * 60 * 1000) {
                newStreak = 1;
              } else {
                newStreak = (data.streak || 0) + 1;
              }
            }
            // Upsert
            await supabase.from('daily_quiz_user_stats').upsert([
  {
    user_fid: userFid,
    last_completed_at: now.toISOString(),
    streak: newStreak,
  }
], { onConflict: 'user_fid' });
            setStreak(newStreak);
            setLockedUntil(Date.now() + 24 * 60 * 60 * 1000);
          } catch (err) {
            setStatsError('Failed to update quiz stats');
          }
        })();
      }
    }, 1200);
  }

  // Reset quiz if user is allowed to play again
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleRestart() {
    setStep("quiz");
    setCurrent(0);
    setSelected(null);
    setPoints(0);
    setTimer(QUESTION_TIME);
    setLockedUntil(null);
    loadQuestions();
  }

  // Main component return
  return (
    <Card title="Daily Quiz">
      {statsLoading && <div className="text-center text-[var(--app-foreground-muted)]">Loading quiz stats...</div>}
      {statsError && <div className="text-center text-red-500">{statsError}</div>}
      {loading && <div className="text-center text-[var(--app-foreground-muted)]">Loading...</div>}
      {error && <div className="text-center text-red-500">Failed to load questions. <Button onClick={handleRetry}>Retry</Button></div>}
      {!loading && lockedUntil && Date.now() < lockedUntil && (
        <div className="text-center">
          <div className="mb-2 text-[var(--app-foreground-muted)]">{'You have already completed today\'s Daily Quiz!'}</div>
          <div className="mb-2 text-lg">🔥 Current Streak: <span className="font-bold">{streak}</span></div>
          <div className="mb-4 text-sm">Come back in {Math.ceil((lockedUntil - Date.now())/1000/60/60)} hour(s) to play again.</div>
          <Button variant="primary" onClick={onBack}>Back to Home</Button>
        </div>
      )}
      {!loading && !lockedUntil && step === "quiz" && questions && questions.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <span className="font-semibold">Question {current+1} / {questions.length}</span>
            <span className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 text-blue-700 dark:text-blue-300 font-mono">{timer}s</span>
          </div>
          <div className="mb-4 text-lg font-bold text-[var(--app-foreground)]">{questions[current].text}</div>
          <div className="space-y-3">
            {questions[current].options.map((opt, i) => (
              <Button
                key={i}
                variant={selected === null ? "outline" : i === questions[current].answer ? (selected === i ? "primary" : "secondary") : selected === i ? "secondary" : "outline"}
                className={
                  `w-full justify-start border border-[var(--app-card-border)] rounded-lg text-base sm:text-lg font-semibold ` +
                  (selected !== null ? (i === questions[current].answer ? 'bg-blue-500 text-white' : selected === i ? 'bg-red-200 dark:bg-red-700 text-[var(--app-foreground)]' : 'bg-white dark:bg-gray-800 text-[var(--app-foreground)]') : 'bg-white dark:bg-gray-800 text-[var(--app-foreground)]')
                }
                onClick={() => selected === null && handleAnswer(i)}
                disabled={selected !== null}
              >
                {opt}
                {selected !== null && questions[current].answer === i && <Icon name="check" className="ml-2" />}
                {selected !== null && selected === i && selected !== questions[current].answer && <span className="ml-2 text-red-500">✗</span>}
              </Button>
            ))}
          </div>
        </div>
      )}
      {step === "done" && (
        <div className="text-center">
          <div className="mb-2 text-2xl font-bold">Quiz Complete!</div>
          <div className="mb-4 text-lg">You scored {points} / {questions?.length ?? 0} 🎉</div>
          <Button variant="primary" onClick={onBack}>Back to Home</Button>
        </div>
      )}
    </Card>
  );
}

