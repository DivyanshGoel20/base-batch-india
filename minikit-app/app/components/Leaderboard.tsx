"use client";
import { Card, Button, Icon } from "./DemoComponents";

const mockLeaders = [
  { name: "Alice", points: 120 },
  { name: "Bob", points: 95 },
  { name: "Charlie", points: 80 },
];

export default function Leaderboard({ onBack }: { onBack: () => void }) {
  return (
    <Card title="Leaderboard">
      <ul className="space-y-3 mb-6">
        {mockLeaders.map((user, i) => (
          <li key={i} className="flex items-center space-x-3">
            <span className="font-bold text-lg">{i+1}</span>
            <Icon name={i===0 ? "star" : "check"} className="text-[var(--app-accent)]" />
            <span className="flex-1">{user.name}</span>
            <span className="font-mono">{user.points} pts</span>
          </li>
        ))}
      </ul>
      <Button variant="primary" onClick={onBack}>Back to Home</Button>
    </Card>
  );
}
