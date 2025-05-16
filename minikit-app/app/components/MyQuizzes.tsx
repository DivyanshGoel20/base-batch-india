"use client";
import { useState, useEffect } from "react";
import { Card, Button, Icon } from "./DemoComponents";
import { supabase } from "../lib/supabaseClient";


interface Question {
  text: string;
  options: string[];
  answer: number;
  type?: string;
  media?: string;
}

// Raw data structure from the database
interface RawQuestion {
  text?: string;
  options?: string[];
  answer?: number;
  type?: string;
  media?: string;
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  created_at: string;
}

// Raw quiz data from the database
interface RawQuiz {
  id: string;
  title: string;
  questions: Question[] | string | null;
  created_at: string;
  [key: string]: unknown; // For other possible fields
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
  const [error, setError] = useState<string | null>(null);
  const [interactions, setInteractions] = useState<{[quizId: string]: UserQuizInteraction}>({});

  // Fetch quizzes and user interactions on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        // Ensure userFid is properly formatted
        const userFidNumber = Number(userFid);
        
        console.log('Fetching quizzes with creator_fid:', userFidNumber, typeof userFidNumber);
        
        // 1. Fetch quizzes created by this user
        const { data: quizData, error: quizErr } = await supabase
          .from('quizzes')
          .select('*')
          .eq('creator_fid', userFidNumber)
          .order('created_at', { ascending: false });
        
        console.log('Raw query results:', quizData);
        
        if (quizErr) {
          console.error('Error fetching quizzes:', quizErr);
          setError(`Failed to load quizzes: ${quizErr.message}`);
          setQuizzes([]);
          setLoading(false);
          return;
        }
        
        if (!quizData || quizData.length === 0) {
          console.log('No quizzes found for this user');
          setQuizzes([]);
          setLoading(false);
          return;
        }
        
        // Process the quiz data to ensure questions are properly formatted
        const processedQuizzes: Quiz[] = (quizData as RawQuiz[]).map((quiz: RawQuiz) => {
          // Ensure questions is an array even if stored as a string or null
          let parsedQuestions: Question[] = [];
          
          try {
            // Handle questions stored as string JSON
            if (typeof quiz.questions === 'string') {
              const parsedData = JSON.parse(quiz.questions) as RawQuestion[];
              parsedQuestions = transformQuestions(parsedData);
            } 
            // Handle questions already in array format
            else if (Array.isArray(quiz.questions)) {
              parsedQuestions = transformQuestions(quiz.questions as RawQuestion[]);
            }
            // Handle null or undefined questions - leave as empty array
          } catch (e) {
            console.error('Error parsing quiz questions:', e);
            // Keep as empty array if parsing fails
          }
          
          return {
            id: quiz.id,
            title: quiz.title,
            questions: parsedQuestions,
            created_at: quiz.created_at
          };
        });
        
        console.log('Processed quizzes:', processedQuizzes);
        setQuizzes(processedQuizzes);

        // 2. Fetch user interactions for these quizzes
        if (processedQuizzes.length > 0) {
          const quizIds = processedQuizzes.map((q: Quiz) => q.id);
          const { data: intData, error: intErr } = await supabase
            .from('user_quiz_interactions')
            .select('*')
            .eq('user_fid', userFidNumber)
            .in('quiz_id', quizIds);
            
          if (intErr) {
            console.error('Error fetching interactions:', intErr);
          } else if (intData) {
            const intMap: {[quizId: string]: UserQuizInteraction} = {};
            (intData as UserQuizInteraction[]).forEach((int: UserQuizInteraction) => {
              intMap[int.quiz_id] = int;
            });
            setInteractions(intMap);
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    if (userFid) {
      fetchData();
    }
  }, [userFid]);

  // Helper function to transform raw question data into properly formatted questions
  function transformQuestions(rawQuestions: RawQuestion[]): Question[] {
    if (!Array.isArray(rawQuestions)) return [];
    
    return rawQuestions.map((q: RawQuestion) => ({
      text: q.text || "No question text",
      options: Array.isArray(q.options) ? q.options : ["No options available"],
      answer: typeof q.answer === 'number' ? q.answer : 0,
      type: q.type || "text",
      media: q.media
    }));
  }

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

  if (error) {
    return (
      <Card title="My Quizzes">
        <div className="text-center text-red-500 mb-4">{error}</div>
        <Button variant="primary" onClick={onBack}>Back to Home</Button>
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
        
        {selected.questions.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded mb-4">
            This quiz doesn't have any questions yet.
          </div>
        ) : (
          <ol className="mb-4 space-y-4">
            {selected.questions.map((q, i) => (
              <li key={i} className="bg-gray-50 dark:bg-gray-900 rounded p-3">
                <div className="font-semibold mb-1 text-[var(--app-foreground)]">Q{i+1}: {q.text}</div>
                {q.media && (
                  <div className="mb-2">
                    {q.media.startsWith("data:image/") && (
                      <img src={q.media} alt="media" className="w-full max-h-32 object-contain rounded" />
                    )}
                    {q.media.startsWith("data:audio/") && <audio controls src={q.media} className="w-full" />}
                    {q.media.startsWith("data:video/") && <video controls src={q.media} className="w-full max-h-32 rounded" />}
                  </div>
                )}
                <ul className="ml-4 list-disc">
                  {q.options && q.options.length > 0 ? (
                    q.options.map((opt: string, j: number) => (
                      <li key={j} className={q.answer === j ? "font-bold text-blue-600 dark:text-blue-400" : "text-[var(--app-foreground)]"}>
                        {opt}
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500">No options available</li>
                  )}
                </ul>
                {q.options && q.options.length > 0 && q.answer >= 0 && q.answer < q.options.length && (
                  <div className="text-xs mt-2 text-green-700 dark:text-green-400">
                    Correct Answer: {q.options[q.answer]}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
        
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
        <div className="text-center text-[var(--app-foreground-muted)]">
          No quizzes created yet. Create a quiz to see it here.
        </div>
      ) : (
        <ul className="space-y-3 mb-6">
          {quizzes.map((quiz) => (
            <li key={quiz.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-3 rounded" onClick={() => setSelected(quiz)}>
              <Icon name="star" className="text-[var(--app-accent)]" />
              <span className="flex-1 font-semibold">{quiz.title || "Untitled Quiz"}</span>
              <span className="text-xs text-[var(--app-foreground-muted)]">
                {quiz.questions ? quiz.questions.length : 0} Qs
              </span>
              <span className="text-xs text-[var(--app-foreground-muted)]">
                {new Date(quiz.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Button variant="primary" onClick={onBack}>Back to Home</Button>
    </Card>
  );
}