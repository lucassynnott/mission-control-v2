import { AgentsPanel } from "@/components/agents-panel";
import { KanbanBoard } from "@/components/kanban-board";
import { ActivityFeed } from "@/components/activity-feed";

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-neutral-950">
      {/* Header */}
      <header className="h-14 border-b border-neutral-800 flex items-center px-4 bg-neutral-900">
        <h1 className="text-lg font-semibold text-neutral-100">Mission Control v2.0</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-neutral-400">🟢 Online</span>
        </div>
      </header>

      {/* Three-Column Layout */}
      <div className="flex-1 grid grid-cols-[280px_1fr_320px] overflow-hidden">
        {/* Left: Agents Panel */}
        <AgentsPanel />
        
        {/* Center: Kanban Board */}
        <KanbanBoard />
        
        {/* Right: Activity Feed */}
        <ActivityFeed />
      </div>
    </div>
  );
}
