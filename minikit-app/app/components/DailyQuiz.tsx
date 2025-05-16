"use client";
import { useState } from "react";
import { Card, Button, Icon } from "./DemoComponents";

import { useEffect, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isAfterDailyResetIST() {
  const now = new Date();
  // Convert to IST
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60000;
  const ist = new Date(utc + istOffset);
  return ist.getHours() > 12 || (ist.getHours() === 12 && ist.getMinutes() >= 30);
}

// Global variable to cache fetched questions (shared across browser tabs)
// GLOBAL_CACHE_KEY removed: no cache in localStorage

// Type for question returned by the trivia API
interface TriviaApiQuestion {
  correctAnswer: string;
  incorrectAnswers: string[];
  question: { text: string };
}

// Fetch daily questions from API or database
async function fetchDailyQuestions() {
  // Use a fixed seed for the day to ensure everyone gets the same random questions
  const today = getISTDateString();
  const daySeed = parseInt(today.replace(/-/g, ''));
  const seedParam = `&seed=${daySeed}`;

  try {
    const resp = await fetch('https://the-trivia-api.com/v2/questions?limit=5' + seedParam);
    const data = await resp.json();
    // Don't sort or shuffle - use exactly what the API returned with our seed
    const questions = (data.slice(0, QUIZ_LENGTH) as TriviaApiQuestion[]).map((q) => {
      // Create a fixed order of options (correct answer always first)
      const options = [q.correctAnswer, ...q.incorrectAnswers];
      return {
        text: q.question.text,
        options: options,
        answer: 0, // Correct answer is always first in our array
      };
    });
    return questions;
  } catch (e) {
    console.error("Failed to fetch quiz questions:", e);
    return null;
  }
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function DailyQuiz({ onBack }: { onBack: () => void }) {
  // Helper to get today's IST date string
  function getToday() {
    return getISTDateString();
  }

  // State for questions and loading
  const [questions, setQuestions] = useState<Array<{text: string; options: string[]; answer: number}>|null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState(false);

  // Helper to get yesterday's IST date string
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const qs = await fetchDailyQuestions();
    setQuestions(qs);
    setLoading(false);
    if (!qs || !Array.isArray(qs) || qs.length === 0) setError(true);
  }

  // Retry handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleRetry() {
    setError(false);
    setLoading(true);
    setTimeout(() => loadQuestions(), 100);
  }

  // When component is first mounted, try to lock API fetching
  useEffect(() => {
    // Add an event listener to detect when other tabs fetch new questions
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('daily_quiz_questions_')) {
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [points, setPoints] = useState(0);
  const [timer, setTimer] = useState(QUESTION_TIME);
  const timerRef = useRef<NodeJS.Timeout|null>(null);

  // Check if quiz is already completed or failed today
  useEffect(() => {
    const today = getToday();
    // TODO: Fetch completion and failure state from backend
    const completedAt = null;
    const failedAt = null;
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
    // If not locked/failed, mark quiz as in progress (backend logic only now)
  }, []);

  // If user closes/reloads tab during quiz, mark as failed
  useEffect(() => {
    if (step !== "quiz") return;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const today = getToday();
    const handleBeforeUnload = () => {
      // Only fail if quiz is in progress and not finished
      // If quiz is in progress and not finished, mark as failed (backend logic only now)
      // TODO: Implement backend call for marking quiz as failed
      // Example: await api.markDailyQuizFailed(today)
      
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleAnswer(selectedIdx: number | null) {
    if (!questions || !Array.isArray(questions) || questions.length === 0 || current < 0 || current >= questions.length) {
      setStep("error");
      return;
    }
    // Next question
    const next = current + 1;
    if (next < questions.length) {
      setCurrent(next);
      setSelected(null);
      setTimer(QUESTION_TIME);
    } else {
      setStep('done');
      // All quiz completion/locking logic should now be handled by backend/database
    }
  }

  useEffect(() => {
    setStep("quiz");
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