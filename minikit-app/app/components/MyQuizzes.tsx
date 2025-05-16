"use client";
import { useState, useEffect } from "react";
import { Card, Button, Icon } from "./DemoComponents";
import { supabase } from "../lib/supabaseClient";


interface Quiz {
  id: string;
  title: string;
  questions: any[];
  created_at: string;
}

interface UserQuizInteraction {
  quiz_id: string;
  hearted: boolean;
  rating: number;
}

interface MyQuizzesProps {
  onBack: () => void;
  userFid: number; // Always present from Farcaster context/session
}

export default function MyQuizzes({ onBack, userFid }: MyQuizzesProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selected, setSelected] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [interactions, setInteractions] = useState<{[quizId: string]: UserQuizInteraction}>({});

  // Fetch quizzes and user interactions on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      // 1. Fetch quizzes created by this user
      const { data: quizData, error: quizErr } = await supabase
        .from('quizzes')
        .select('*')
        .eq('creator_fid', userFid)
        .order('created_at', { ascending: false });
      if (quizErr) {
        setQuizzes([]);
        setLoading(false);
        return;
      }
      setQuizzes(quizData || []);

      // 2. Fetch user interactions for these quizzes
      if (quizData && quizData.length > 0) {
        const quizIds = quizData.map((q: Quiz) => q.id);
        const { data: intData, error: intErr } = await supabase
          .from('user_quiz_interactions')
          .select('*')
          .eq('user_fid', userFid)
          .in('quiz_id', quizIds);
        if (!intErr && intData) {
          const intMap: {[quizId: string]: UserQuizInteraction} = {};
          intData.forEach((int: any) => {
            intMap[int.quiz_id] = int;
          });
          setInteractions(intMap);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  async function toggleHeart(quizId: string) {
    const current = interactions[quizId]?.hearted || false;
    const newHeart = !current;
    // Upsert interaction (must be array for supabase-js)
    await supabase.from('user_quiz_interactions').upsert([
      {
        user_fid: userFid,
        quiz_id: quizId,
        hearted: newHeart,
      }
    ]);
    setInteractions((prev) => ({
      ...prev,
      [quizId]: {
        ...prev[quizId],
        hearted: newHeart,
        rating: prev[quizId]?.rating || 0,
      },
    }));
  }

  async function setQuizRating(quizId: string, rating: number) {
    await supabase.from('user_quiz_interactions').upsert([
      {
        user_fid: userFid,
        quiz_id: quizId,
        rating,
      }
    ]);
    setInteractions((prev) => ({
      ...prev,
      [quizId]: {
        ...prev[quizId],
        rating,
        hearted: prev[quizId]?.hearted || false,
      },
    }));
  }

  if (loading) {
    return (
      <Card title="My Quizzes">
        <div className="text-center text-[var(--app-foreground-muted)]">Loading...</div>
      </Card>
    );
  }

  if (selected) {
    const isLiked = interactions[selected.id]?.hearted || false;
    const myRating = interactions[selected.id]?.rating || 0;
    return (
      <Card title={selected.title || "Untitled Quiz"}>
        <div className="mb-4 text-xs text-[var(--app-foreground-muted)]">Created: {new Date(selected.created_at).toLocaleString()}</div>
        <div className="flex gap-4 mb-4 items-center">
          <Button variant={isLiked ? "primary" : "outline"} onClick={() => toggleHeart(selected.id)}>
            <Icon name="heart" className={isLiked ? "text-red-500" : "text-gray-400"} /> {isLiked ? "Liked" : "Heart"}
          </Button>
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map((star) => (
              <span
                key={star}
                onClick={() => setQuizRating(selected.id, star)}
                style={{ cursor: 'pointer', display: 'inline-block' }}
              >
                <Icon
                  name="star"
                  className={myRating >= star ? "text-yellow-400" : "text-gray-400"}
                />
              </span>
            ))}
            <span className="text-xs ml-2">{myRating ? `Your Rating: ${myRating}` : "Rate this Quiz"}</span>
          </div>
        </div>
        <ol className="mb-4 space-y-4">
          {selected.questions.map((q, i) => (
            <li key={i} className="bg-gray-50 dark:bg-gray-900 rounded p-3">
              <div className="font-semibold mb-1 text-[var(--app-foreground)]">Q{i+1}: {q.text}</div>
              {q.media && (
                <div className="mb-2">
                  {q.media.startsWith("data:image/") && <img src={q.media} alt="media" className="w-full max-h-32 object-contain rounded" />}
                  {q.media.startsWith("data:audio/") && <audio controls src={q.media} className="w-full" />}
                  {q.media.startsWith("data:video/") && <video controls src={q.media} className="w-full max-h-32 rounded" />}
                </div>
              )}
              <ul className="ml-4 list-disc">
                {q.options.map((opt: string, j: number) => (
                  <li key={j} className={q.answer === j ? "font-bold text-blue-600 dark:text-blue-400" : "text-[var(--app-foreground)]"}>{opt}</li>
                ))}
              </ul>
              <div className="text-xs mt-2 text-green-700 dark:text-green-400">Correct Answer: {q.options[q.answer]}</div>
            </li>
          ))}
        </ol>
        <div className="flex gap-2 flex-wrap mb-4">
          <Button variant="primary" onClick={() => alert('Sharing not implemented yet!')}>Share as Farcaster Frame</Button>
        </div>
        <Button variant="secondary" onClick={() => setSelected(null)}>Back to List</Button>
      </Card>
    );
  }

  return (
    <Card title="My Quizzes">
      {quizzes.length === 0 ? (
        <div className="text-center text-[var(--app-foreground-muted)]">No quizzes created yet.</div>
      ) : (
        <ul className="space-y-3 mb-6">
          {quizzes.map((quiz) => (
            <li key={quiz.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-3 rounded" onClick={() => setSelected(quiz)}>
              <Icon name="star" className="text-[var(--app-accent)]" />
              <span className="flex-1 font-semibold">{quiz.title || "Untitled Quiz"}</span>
              <span className="text-xs text-[var(--app-foreground-muted)]">{quiz.questions.length} Qs</span>
              <span className="text-xs text-[var(--app-foreground-muted)]">{new Date(quiz.created_at).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      )}
      <Button variant="primary" onClick={onBack}>Back to Home</Button>
    </Card>
  );
}
