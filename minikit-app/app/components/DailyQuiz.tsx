"use client";
import { useState } from "react";
import { Card, Button, Icon } from "./DemoComponents";

import { useEffect, useRef } from "react";

const DAILY_QUIZ_KEY = "daily_quiz_completed_at";
const QUIZ_LENGTH = 5;
const QUESTION_TIME = 10; // seconds

// Helper to get today's date string in IST (YYYY-MM-DD)
function getISTDateString() {
  const now = new Date();
  // Convert to IST
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60000;
  const ist = new Date(utc + istOffset);
  return `${ist.getFullYear()}-${(ist.getMonth()+1).toString().padStart(2,'0')}-${ist.getDate().toString().padStart(2,'0')}`;
}

// Helper to check if it's after 12:30 PM IST
function isAfterDailyResetIST() {
  const now = new Date();
  // Convert to IST
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60000;
  const ist = new Date(utc + istOffset);
  return ist.getHours() > 12 || (ist.getHours() === 12 && ist.getMinutes() >= 30);
}

// No longer needed - we're using API seeding instead

// Global variable to cache fetched questions (shared across browser tabs)
const GLOBAL_CACHE_KEY = "global_daily_quiz_fetched";

// Fetch and store daily questions if needed
async function ensureDailyQuestions() {
  const today = getISTDateString();
  const key = `daily_quiz_questions_${today}`;
  
  // Check if we already have today's questions
  if (localStorage.getItem(key)) {
    return; // Already have questions, no need to fetch
  }
  
  // Check if another tab/instance has already fetched today's questions
  if (localStorage.getItem(GLOBAL_CACHE_KEY) === today) {
    // Wait a moment and check again - maybe another tab just finished fetching
    await new Promise(resolve => setTimeout(resolve, 500));
    if (localStorage.getItem(key)) {
      return; // Another tab has fetched, we can use those questions
    }
  }
  
  // Set the global flag to prevent other tabs from fetching simultaneously
  localStorage.setItem(GLOBAL_CACHE_KEY, today);
  
  try {
    // Use a fixed seed for the day to ensure everyone gets the same random questions
    const daySeed = parseInt(today.replace(/-/g, ''));
    const seedParam = `&seed=${daySeed}`;
    
    const resp = await fetch('https://the-trivia-api.com/v2/questions?limit=5' + seedParam);
    const data = await resp.json();
    
    // Don't sort or shuffle - use exactly what the API returned with our seed
    const questions = data.slice(0, QUIZ_LENGTH).map((q: any) => {
      // Create a fixed order of options (correct answer always first)
      const options = [q.correctAnswer, ...q.incorrectAnswers];
      return {
        text: q.question.text,
        options: options,
        answer: 0, // Correct answer is always first in our array
      };
    });
    
    // Store the exact same questions for everyone
    localStorage.setItem(key, JSON.stringify(questions));
  } catch (e) {
    // Remove the global flag so other tabs can try fetching
    localStorage.removeItem(GLOBAL_CACHE_KEY);
    console.error("Failed to fetch quiz questions:", e);
  }
}

export function getStreak() {
  const streakKey = 'quiz_streak';
  const lastPlayedKey = 'quiz_streak_last_played';
  const streak = parseInt(localStorage.getItem(streakKey) || '0', 10);
  const lastPlayed = parseInt(localStorage.getItem(lastPlayedKey) || '0', 10);
  if (!lastPlayed) return 0;
  const last = new Date(lastPlayed);
  const now = new Date();
  // If last played is yesterday, streak continues; if today, keep; else reset
  const diff = Math.floor((now.setHours(0,0,0,0) - last.setHours(0,0,0,0)) / (1000*60*60*24));
  if (diff === 0) return streak;
  if (diff === 1) return streak;
  return 0;
}

export default function DailyQuiz({ onBack }: { onBack: () => void }) {
  // Helper to get today's IST date string
  function getToday() {
    return getISTDateString();
  }

  // State for questions and loading
  const [questions, setQuestions] = useState<Array<{text: string; options: string[]; answer: number}>|null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to get yesterday's IST date string
  function getYesterdayISTDateString() {
    const now = new Date();
    // Convert to IST
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istOffset = 5.5 * 60 * 60000;
    const ist = new Date(utc + istOffset);
    ist.setDate(ist.getDate() - 1);
    return `${ist.getFullYear()}-${(ist.getMonth()+1).toString().padStart(2,'0')}-${ist.getDate().toString().padStart(2,'0')}`;
  }

  // Helper to load the correct day's questions
  async function loadQuestions() {
    setLoading(true);
    setError(false);
    
    let useToday = isAfterDailyResetIST();
    const todayKey = `daily_quiz_questions_${getISTDateString()}`;
    const yestKey = `daily_quiz_questions_${getYesterdayISTDateString()}`;
    let key = useToday ? todayKey : yestKey;
    
    // Step 1: Try to get the questions directly from localStorage first
    let qs: any = null;
    if (localStorage.getItem(key)) {
      try { 
        qs = JSON.parse(localStorage.getItem(key)!); 
      } catch { 
        qs = null; 
      }
    }
    
    // Step 2: If questions aren't found, try to fetch them only once per day
    if (!qs) {
      try {
        // This will only fetch if no questions exist for today and no other tab is fetching
        await ensureDailyQuestions();
        
        // Try to get questions again after fetch attempt
        if (localStorage.getItem(key)) {
          try { 
            qs = JSON.parse(localStorage.getItem(key)!); 
          } catch { 
            qs = null; 
          }
        }
      } catch (e) {
        console.error("Error fetching questions:", e);
      }
    }
    
    // Step 3: Fallback - if after fetching we still don't have questions, try the other day's questions
    if (!qs && !useToday && localStorage.getItem(todayKey)) {
      try { 
        qs = JSON.parse(localStorage.getItem(todayKey)!); 
      } catch { 
        qs = null; 
      }
    } else if (!qs && useToday && localStorage.getItem(yestKey)) {
      try { 
        qs = JSON.parse(localStorage.getItem(yestKey)!); 
      } catch { 
        qs = null; 
      }
    }
    
    // Set questions and update UI state
    setQuestions(qs);
    setLoading(false);
    if (!qs || !Array.isArray(qs) || qs.length === 0) setError(true);
  }

  // Error state for loading
  const [error, setError] = useState(false);
  // Retry handler
  function handleRetry() {
    setError(false);
    setLoading(true);
    setTimeout(() => loadQuestions(), 100);
  }

  // When component is first mounted, try to lock API fetching
  useEffect(() => {
    // Add an event listener to detect when other tabs fetch new questions
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === GLOBAL_CACHE_KEY || e.key?.startsWith('daily_quiz_questions_')) {
        // Another tab may have fetched new questions, check again
        loadQuestions();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    const timeout = setTimeout(() => {
      setLoading(false);
      setError(true);
    }, 4000);
    
    loadQuestions().then(() => clearTimeout(timeout));
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const [step, setStep] = useState<"quiz"|"done"|"locked"|"failed"|"error">("quiz");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number|null>(null);
  const [points, setPoints] = useState(0);
  const [timer, setTimer] = useState(QUESTION_TIME);
  const timerRef = useRef<NodeJS.Timeout|null>(null);

  // Check if quiz is already completed or failed today
  useEffect(() => {
    const today = getToday();
    const completedAt = localStorage.getItem(DAILY_QUIZ_KEY);
    const failedAt = localStorage.getItem('daily_quiz_failed');
    if (failedAt === today) {
      setStep("failed");
      return;
    }
    if (completedAt) {
      const now = new Date();
      const last = new Date(parseInt(completedAt, 10));
      if (
        now.getDate() === last.getDate() &&
        now.getMonth() === last.getMonth() &&
        now.getFullYear() === last.getFullYear()
      ) {
        setStep("locked");
        return;
      }
    }
    // If not locked/failed, mark quiz as in progress
    localStorage.setItem('daily_quiz_in_progress', today);
  }, []);

  // If user closes/reloads tab during quiz, mark as failed
  useEffect(() => {
    if (step !== "quiz") return;
    const today = getToday();
    const handleBeforeUnload = () => {
      // Only fail if quiz is in progress and not finished
      if (localStorage.getItem('daily_quiz_in_progress') === today) {
        localStorage.setItem('daily_quiz_failed', today);
        localStorage.removeItem('daily_quiz_in_progress');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [step]);

  // Timer logic
  useEffect(() => {
    if (step !== "quiz") return;
    if (timer === 0) {
      handleAnswer(null);
      return;
    }
    const intervalId = setInterval(() => {
      setTimer(timer - 1);
    }, 1000);
    timerRef.current = intervalId;
    return () => clearInterval(intervalId);
  }, [step, timer]);

  // Update handleAnswer function
  function handleAnswer(selectedIdx: number | null) {
    if (!questions || !Array.isArray(questions) || questions.length === 0 || current < 0 || current >= questions.length) {
      setStep("error");
      return;
    }
    // If answering last question, clear in-progress/failed flags
    if (current + 1 === QUIZ_LENGTH) {
      localStorage.removeItem('daily_quiz_in_progress');
      localStorage.removeItem('daily_quiz_failed');
    }
    // Next question
    const next = current + 1;
    if (next < questions.length) {
      setCurrent(next);
      setSelected(null);
      setTimer(QUESTION_TIME);
    } else {
      setStep('done');
      localStorage.setItem(DAILY_QUIZ_KEY, Date.now().toString());
      localStorage.setItem("daily_quiz_last_completed", Date.now().toString());
      // Streak logic
      const streakKey = 'quiz_streak';
      const lastPlayedKey = 'quiz_streak_last_played';
      const prevStreak = parseInt(localStorage.getItem(streakKey) || '0', 10);
      // ...
    }
  }

  // Check if quiz is already completed or failed today
  useEffect(() => {
    const today = getToday();
    const completedAt = localStorage.getItem(DAILY_QUIZ_KEY);
    const failedAt = localStorage.getItem('daily_quiz_failed');
    if (failedAt === today) {
      setStep("failed");
      return;
    }
    if (completedAt) {
      const now = new Date();
      const last = new Date(parseInt(completedAt, 10));
      if (
        now.getDate() === last.getDate() &&
        now.getMonth() === last.getMonth() &&
        now.getFullYear() === last.getFullYear()
      ) {
        setStep("locked");
        return;
      }
    }
    // If not locked/failed, mark quiz as in progress
    localStorage.setItem('daily_quiz_in_progress', today);
  }, []);

  // If user closes/reloads tab during quiz, mark as failed
  useEffect(() => {
    if (step !== "quiz") return;
    const today = getToday();
    const handleBeforeUnload = () => {
      // Only fail if quiz is in progress and not finished
      if (localStorage.getItem('daily_quiz_in_progress') === today) {
        localStorage.setItem('daily_quiz_failed', today);
        localStorage.removeItem('daily_quiz_in_progress');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [step]);

  // When component is first mounted, try to lock API fetching
  useEffect(() => {
    // Add an event listener to detect when other tabs fetch new questions
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === GLOBAL_CACHE_KEY || e.key?.startsWith('daily_quiz_questions_')) {
        // Another tab may have fetched new questions, check again
        loadQuestions();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    const timeout = setTimeout(() => {
      setLoading(false);
      setError(true);
    }, 4000);
    
    loadQuestions().then(() => clearTimeout(timeout));
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Main component return
  return (
    <Card>
      <div>
        {questions && questions.length > 0 && (
          <div>
            {questions[current].options.map((opt, i) => (
              <Button
                key={i}
                variant={selected === null ? "outline" : i === questions[current].answer ? "primary" : selected === i ? "secondary" : "outline"}
                className={
                  `w-full justify-start border border-[var(--app-card-border)] rounded-lg text-base sm:text-lg font-semibold ` +
                  (selected !== null ? (i === questions[current].answer ? 'bg-blue-500 text-white' : selected === i ? 'bg-gray-200 dark:bg-gray-700 text-[var(--app-foreground)]' : 'bg-white dark:bg-gray-800 text-[var(--app-foreground)]') : 'bg-white dark:bg-gray-800 text-[var(--app-foreground)]')
                }
                onClick={() => selected === null && handleAnswer(i)}
                disabled={selected !== null}
              >
                {opt}
                {selected !== null && questions[current].answer === i && <Icon name="check" className="ml-2" />}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}