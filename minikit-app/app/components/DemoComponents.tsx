"use client";

import { type ReactNode, useState } from "react";


type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  icon?: ReactNode;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  onClick,
  disabled = false,
  type = "button",
  icon,
}: ButtonProps) {
  // Redesigned for a calm, modern, balanced look
  const baseClasses =
    "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--app-accent)] disabled:opacity-50 disabled:pointer-events-none rounded-lg";

  const variantClasses = {
    primary:
      "bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent-hover)] active:bg-[var(--app-accent-active)] shadow-sm",
    secondary:
      "bg-[var(--app-accent-light)] text-[var(--app-accent)] border border-[var(--app-accent)] hover:bg-[var(--app-accent)] hover:text-white",
    outline:
      "bg-transparent border border-[var(--app-card-border)] text-[var(--app-foreground)] hover:bg-[var(--app-accent-light)] hover:text-[var(--app-accent)]",
    ghost:
      "hover:bg-[var(--app-accent-light)] text-[var(--app-foreground-muted)]",
  };

  const sizeClasses = {
    sm: "text-xs px-3 py-1.5 rounded-md",
    md: "text-sm px-4 py-2 rounded-lg",
    lg: "text-base px-6 py-3 rounded-lg",
  };


  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="flex items-center mr-2">{icon}</span>}
      {children}
    </button>
  );
}

type CardProps = {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({
  title,
  children,
  className = "",
  onClick,
}: CardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`bg-white/80 dark:bg-[#18181b]/80 border border-[var(--app-card-border)] rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden ${className} ${onClick ? "cursor-pointer" : ""}`}
      style={{ boxShadow: '0 2px 12px 0 rgba(31, 38, 135, 0.07)' }}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
    >
      {title && (
        <div className="px-5 py-3 border-b border-[var(--app-card-border)] bg-transparent">
          <h3 className="text-lg font-bold text-[var(--app-foreground)]">
            {title}
          </h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

type FeaturesProps = {
  setActiveTab: (tab: string) => void;
};

export function Features({ setActiveTab }: FeaturesProps) {
  return (
    <div className="space-y-6 animate-fadein">
      <Card title="Key Features">
        <ul className="space-y-3 mb-4">
          <li className="flex items-start">
            <Icon name="check" className="text-[var(--app-accent)] mt-1 mr-2" />
            <span className="text-[var(--app-foreground-muted)]">Daily quiz with new questions every day</span>
          </li>
          <li className="flex items-start">
            <Icon name="check" className="text-[var(--app-accent)] mt-1 mr-2" />
            <span className="text-[var(--app-foreground-muted)]">Create and share your own quizzes</span>
          </li>
          <li className="flex items-start">
            <Icon name="check" className="text-[var(--app-accent)] mt-1 mr-2" />
            <span className="text-[var(--app-foreground-muted)]">Compete on the leaderboard with friends</span>
          </li>
          <li className="flex items-start">
            <Icon name="check" className="text-[var(--app-accent)] mt-1 mr-2" />
            <span className="text-[var(--app-foreground-muted)]">Minimal, beautiful, and responsive UI</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

type HomeProps = {
  setActiveTab: (tab: string) => void;
};

export function Home({ setActiveTab, streak = 0 }: HomeProps & { streak?: number }) {
  const [musicMuted, setMusicMuted] = useState(true);

  return (
    <div className="space-y-6 animate-fadein">
      {/* App Name & Music Toggle */}
      <div className="flex justify-between items-center mb-4">
        <span className="font-bold text-3xl text-[var(--app-accent)] tracking-tight">WarpQuiz</span>
        <button
          onClick={() => setMusicMuted((m: boolean) => !m)}
          className={`px-3 py-1 rounded text-xs font-semibold border border-[var(--app-accent)] ml-2 transition-all ${musicMuted ? 'bg-white text-[var(--app-accent)]' : 'bg-[var(--app-accent)] text-white'}`}
          aria-label={musicMuted ? 'Unmute music' : 'Mute music'}
        >
          {musicMuted ? '🎵 Music Off' : '🎶 Music On'}
        </button>
      </div>
      {/* Music Player (hidden visually) */}
      <audio
        ref={audio => {
          if (audio) audio.volume = 0.25;
        }}
        src="/funk-music.mp3"
        autoPlay
        loop
        muted={musicMuted}
        style={{ display: 'none' }}
      />
      {/* Streak with Fire Emoji */}
      <div className="flex justify-center mb-2">
        <span className="inline-flex items-center px-4 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold shadow text-base">
          <span className="mr-1">🔥</span> Streak: {streak} {streak === 1 ? 'day' : 'days'}
        </span>
      </div>
      {/* Card with Options */}
      <Card className="bg-white/90 dark:bg-zinc-900/90 shadow-lg p-6">
        <p className="text-[var(--app-foreground-muted)] mb-6 text-center text-base">
          Welcome to the most fun quiz app on Base! Play daily quizzes, create your own, and compete with friends.
        </p>
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => setActiveTab("quiz-creator")}
          >
            Create a Quiz
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setActiveTab("daily-quiz")}
          >
            Play Daily Quiz
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setActiveTab("leaderboard")}
          >
            Leaderboard
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setActiveTab("my-quizzes")}
          >
            My Quizzes
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Local demo for tab switching if setActiveTab is not passed as a prop
function DemoTabSwitcher() {
  const [activeTab, setActiveTab] = useState("leaderboard");
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => setActiveTab("leaderboard")}
        className={`flex-1 ${activeTab === "leaderboard" ? 'font-bold border-b-2 border-[var(--app-accent)]' : ''}`}
      >
        Leaderboard
      </Button>
      <Button
        variant="ghost"
        onClick={() => setActiveTab("my-quizzes")}
        className={`flex-1 ${activeTab === "my-quizzes" ? 'font-bold border-b-2 border-[var(--app-accent)]' : ''}`}
      >
        My Quizzes
      </Button>
    </div>
  );
}

// Export or use <DemoTabSwitcher /> wherever you need a local tab switcher for demo/testing



type IconProps = {
  name: "heart" | "star" | "check" | "plus" | "arrow-right";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Icon({ name, size = "md", className = "" }: IconProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  // Use a neutral, calm color for icons by default
  const iconColorClass = "text-[var(--app-accent)]";

  const icons = {
    heart: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Heart</title>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    star: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Star</title>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    check: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Check</title>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    plus: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Plus</title>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    "arrow-right": (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Arrow Right</title>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    ),
  };

  return (
    <span className={`inline-block ${sizeClasses[size]} ${iconColorClass} ${className}`}>
      {icons[name]}
    </span>
  );
}

