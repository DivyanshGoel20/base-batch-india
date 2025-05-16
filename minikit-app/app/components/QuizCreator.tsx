"use client";
import { useState, useRef, useEffect } from "react";
import { Card, Button, Icon } from "./DemoComponents";
import { supabase } from "../lib/supabaseClient";

type QuestionType = "text" | "image" | "audio" | "video";

interface CreateQuestion {
  type: QuestionType;
  text: string;
  media?: string;
  options: string[];
  answer: number | null;
}

const QUESTION_TIME = 5;

interface QuizCreatorProps {
  onBack: () => void;
  userFid: number; // Always present from Farcaster context/session
}

export default function QuizCreator({ onBack, userFid }: QuizCreatorProps) {
  const [step, setStep] = useState<"form"|"preview"|"shared">("form");
  const [questions, setQuestions] = useState<CreateQuestion[]>([{
    type: "text",
    text: "",
    options: ["", "", "", ""],
    answer: null,
  }]);
  const [current, setCurrent] = useState(0);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [timer, setTimer] = useState(QUESTION_TIME);
  const [title, setTitle] = useState("");
  const [created, setCreated] = useState(false);
  const timerRef = useRef<NodeJS.Timeout|null>(null);

  async function handleCreateQuiz() {
    setCreated(true);
    // Replace with your actual auth/session logic

    // Generate a random id (uuid or random string)
    const quizId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const { error } = await supabase.from('quizzes').insert([
      {
        id: quizId,
        creator_fid: userFid,
        title: title.trim() || "Untitled Quiz",
        questions: questions,
        created_at: new Date().toISOString(),
      }
    ]);
    if (!error) {
      setStep("form");
      setQuestions([{ type: "text" as QuestionType, text: "", options: ["", "", "", ""], answer: null }]);
      setCurrent(0);
      setTitle("");
      setTimeout(() => {
        setCreated(false);
        onBack();
      }, 1200);
    } else {
      alert("Failed to create quiz: " + error.message);
      setCreated(false);
    }
  }


  // Timer for preview
  useEffect(() => {
    if (step !== "preview") return;
    if (timer === 0) return;
    timerRef.current = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(timerRef.current!);
  }, [timer, step]);

  function handleQuestionChange(idx: number, field: keyof CreateQuestion, value: any) {
    setQuestions((qs) => qs.map((q, i) => i === idx ? { ...q, [field]: value } : q));
    // If changing media, set type as well
    if (field === 'media' && value) {
      const fileType = value.startsWith('data:image/') ? 'image' : value.startsWith('data:audio/') ? 'audio' : value.startsWith('data:video/') ? 'video' : 'text';
      setQuestions((qs) => qs.map((q, i) => i === idx ? { ...q, type: fileType } : q));
    }
  }
  function handleOptionChange(qIdx: number, optIdx: number, value: string) {
    setQuestions((qs) => qs.map((q, i) =>
      i === qIdx ? { ...q, options: q.options.map((o, j) => j === optIdx ? value : o) } : q
    ));
  }
  function handleAddQuestion() {
    setQuestions((qs) => {
      const next = [
        ...qs,
        { type: "text" as QuestionType, text: "", options: ["", "", "", ""], answer: null }
      ];
      setCurrent(next.length - 1);
      return next;
    });
  }
  function handleRemoveQuestion(idx: number) {
    if (questions.length === 1) return;
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
    setCurrent((c) => c > 0 ? c - 1 : 0);
  }
  function handleMoveQuestion(idx: number, dir: -1 | 1) {
    const newQs = [...questions];
    const tgt = idx + dir;
    if (tgt < 0 || tgt >= questions.length) return;
    [newQs[idx], newQs[tgt]] = [newQs[tgt], newQs[idx]];
    setQuestions(newQs);
    setCurrent(tgt);
  }
  function handlePreview() {
    setStep("preview");
    setTimer(QUESTION_TIME);
  }
  function handleShare() {
    setShareUrl("https://farcaster.xyz/frame/quiz/" + Math.floor(Math.random()*10000));
    setStep("shared");
  }
  function isValidQuestion(q: CreateQuestion) {
    return q.text && q.options.every(o => o) && q.answer !== null && (q.type === "text" || q.media);
  }
  // Form step
  const [musicMuted, setMusicMuted] = useState(false);
const musicUrl = "https://cdn.pixabay.com/audio/2022/10/16/audio_12b7f3b7e5.mp3"; // Royalty-free upbeat background music

if (step === "form") {
    const q = questions[current];
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        animation: 'gradientBG 10s ease infinite',
      }}>
        <style>{`
          @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
        <audio src={musicUrl} autoPlay loop hidden={!musicMuted} muted={musicMuted} />
        <Card title={<div className="flex items-center justify-between w-full">
          <span>Create a Quiz</span>
          <button
            onClick={() => setMusicMuted(m => !m)}
            className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${musicMuted ? 'bg-gray-200 text-gray-600' : 'bg-pink-200 text-pink-800'} transition-all`}
            aria-label={musicMuted ? 'Unmute music' : 'Mute music'}
          >
            {musicMuted ? '🔇 Music Off' : '🎵 Music On'}
          </button>
        </div>}>

        <Button variant="ghost" onClick={onBack} className="mb-2">← Back to Home</Button>
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs">Question {current + 1} of {questions.length}</div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" disabled={current === 0} onClick={() => handleMoveQuestion(current, -1)}><Icon name="arrow-right" className="rotate-180" /></Button>
            <Button variant="ghost" size="sm" disabled={current === questions.length - 1} onClick={() => handleMoveQuestion(current, 1)}><Icon name="arrow-right" /></Button>
            <Button variant="ghost" size="sm" disabled={questions.length === 1} onClick={() => handleRemoveQuestion(current)}>🗑️</Button>
          </div>
        </div>
        <input
          className="w-full border rounded px-3 py-2 mb-4 text-[var(--app-foreground)] bg-white dark:bg-gray-800"
          placeholder="Quiz Title (optional)"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <input
          className="w-full border rounded px-3 py-2 mb-2 text-[var(--app-foreground)] bg-white dark:bg-gray-800"
          placeholder="Enter your quiz question"
          value={q.text}
          onChange={e => handleQuestionChange(current, "text", e.target.value)}
        />
        <div className="mb-2">
          <input
            type="file"
            accept="image/*,audio/*,video/*"
            className="block w-full text-[var(--app-foreground)] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  handleQuestionChange(current, "media", ev.target?.result as string);
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          {q.media && (
            <div className="mt-2">
              {q.media.startsWith('data:image/') && (
                <img src={q.media} alt="preview" className="w-full max-h-40 object-contain rounded" />
              )}
              {q.media.startsWith('data:audio/') && (
                <audio controls src={q.media} className="w-full" />
              )}
              {q.media.startsWith('data:video/') && (
                <video controls src={q.media} className="w-full max-h-40 rounded" />
              )}
            </div>
          )}
        </div>
        <div className="space-y-2 mb-2">
          {q.options.map((opt, i) => (
            <div key={i} className="flex items-center space-x-2">
              <input
                className="flex-1 border rounded px-3 py-2 text-[var(--app-foreground)] bg-white dark:bg-gray-800"
                placeholder={`Option ${i+1}`}
                value={opt}
                onChange={e => handleOptionChange(current, i, e.target.value)}
              />
              <input
                type="radio"
                name={`answer-${current}`}
                checked={q.answer === i}
                onChange={() => handleQuestionChange(current, "answer", i)}
              />
              <span className="text-xs text-[var(--app-foreground)]">Correct</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={handleAddQuestion} icon={<Icon name="plus" size="sm" />}>Add Question</Button>
        </div>
        <Button
          variant="primary"
          onClick={handlePreview}
          disabled={!questions.every(isValidQuestion) || questions.length === 0}
        >
          Preview Quiz
        </Button>
      </Card>
    </div>
    );
  }
  // Preview step
  if (step === "preview") {
    const q = questions[current];
    return (
      <Card title={`Preview: Question ${current + 1} of ${questions.length}`}>
        <div className="flex justify-between items-center mb-2">
          <Button variant="ghost" size="sm" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>←</Button>
          <div className="text-xs font-mono px-2 py-1 bg-gray-100 rounded text-[var(--app-foreground)]">Preview</div>
          <Button variant="ghost" size="sm" onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))} disabled={current === questions.length - 1}>→</Button>
        </div>
        <div className="text-lg font-bold mb-2">{title}</div>
        <div className="text-lg font-semibold mb-2 text-[var(--app-foreground)]">{q.text}</div>
        {q.media && (
          <div className="mb-2">
            {q.media.startsWith('data:image/') && (
              <img src={q.media} alt="quiz" className="w-full max-h-48 object-contain rounded" />
            )}
            {q.media.startsWith('data:audio/') && (
              <audio controls src={q.media} className="w-full" />
            )}
            {q.media.startsWith('data:video/') && (
              <video controls src={q.media} className="w-full max-h-48 rounded" />
            )}
          </div>
        )}
        <div className="space-y-2 mb-4">
          {q.options.map((opt, i) => (
            <Button
              key={i}
              variant={q.answer === i ? "primary" : "outline"}
              className="w-full justify-start text-[var(--app-foreground)] bg-white dark:bg-gray-800 border border-[var(--app-card-border)] rounded-lg text-base sm:text-lg font-semibold"
              disabled
            >
              {opt}
              {q.answer === i && <Icon name="check" className="ml-2" />}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => { setStep("form"); }}>Edit</Button>
          <Button variant="primary" onClick={handleCreateQuiz} disabled={created}>{created ? "Created!" : "Create Quiz"}</Button>
        </div>
      </Card>
    );
  }
  // Shared step
  return (
    <Card title="Quiz Shared!">
      <div className="space-y-4 text-center">
        <Icon name="star" size="lg" className="mx-auto mb-2 text-[var(--app-accent)]" />
        <div className="text-xl font-bold">Quiz Shared!</div>
        <div className="text-md">Share this link on Farcaster:</div>
        <div className="bg-gray-100 rounded p-2 break-all text-xs font-mono select-all">{shareUrl}</div>
        <Button variant="primary" onClick={onBack} className="mt-4">Back to Home</Button>
      </div>
    </Card>
  );
}

