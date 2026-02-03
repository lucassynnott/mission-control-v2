"use client";

import { useState, useEffect } from "react";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, MessageSquare, GitPullRequest, AlertCircle, Radio } from "lucide-react";
import { highlightMentions } from "@/lib/mention-parser";

interface Activity {
  id: string;
  type: "task" | "agent" | "system" | "mention";
  message: string;
  agent: string;
  agentAvatar?: string;
  timestamp: string;
  metadata?: {
    taskId?: string;
    taskTitle?: string;
    mentionedUsers?: string[];
  };
}

const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: "1",
    type: "mention",
    message: "@Johnny check the SSE implementation",
    agent: "Claws",
    agentAvatar: "🐾",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    metadata: { mentionedUsers: ["Johnny"] },
  },
  {
    id: "2",
    type: "task",
    message: "Moved \"API Endpoint\" to Review",
    agent: "Johnny",
    agentAvatar: "🤘",
    timestamp: new Date(Date.now() - 300000).toISOString(),
    metadata: { taskId: "task-1", taskTitle: "API Endpoint" },
  },
  {
    id: "3",
    type: "agent",
    message: "Agent \"Code Reviewer\" deployed",
    agent: "System",
    timestamp: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: "4",
    type: "system",
    message: "Token usage alert: 85% threshold",
    agent: "System",
    timestamp: new Date(Date.now() - 900000).toISOString(),
  },
];

const TYPE_ICONS = {
  task: GitPullRequest,
  agent: Bot,
  system: AlertCircle,
  mention: MessageSquare,
};

// Cyberpunk type colors
const TYPE_COLORS = {
  task: "bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/50",
  agent: "bg-green-500/20 text-green-400 border-green-500/50",
  system: "bg-cyber-yellow/20 text-cyber-yellow border-cyber-yellow/50",
  mention: "bg-purple-500/20 text-purple-400 border-purple-500/50",
};

function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return "NOW";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}M`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H`;
  return `${Math.floor(hours / 24)}D`;
}

function HighlightMentions({ text }: { text: string }) {
  // Use the mention-parser highlightMentions function
  const highlighted = highlightMentions(text);
  return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
}

interface ActivityFeedProps {
  isMobile?: boolean;
}

export function ActivityFeed({ isMobile }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);
  const [connected, setConnected] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const eventSource = new EventSource("/api/sse");

    eventSource.onopen = () => setConnected(true);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "activity") {
          setActivities((prev) => [data.activity, ...prev].slice(0, 50));
        }
      } catch (e) {
        console.error("Failed to parse SSE message:", e);
      }
    };
    eventSource.onerror = () => setConnected(false);

    return () => eventSource.close();
  }, []);

  return (
    <div className={`bg-cyber-dark flex flex-col h-full`}>
      {/* Header */}
      <div className="p-4 border-b border-cyber-red/30 bg-cyber-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-cyber-red" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider">SYSTEM LOGS</h2>
              <p className="text-[10px] text-cyber-cyan/60 font-mono">{activities.length} EVENTS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${connected ? "bg-cyber-cyan animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]" : "bg-cyber-red"}`} />
            <span className="text-[10px] text-cyber-cyan/60 font-mono">{connected ? "LIVE" : "OFFLINE"}</span>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <CardContent className={`flex-1 overflow-auto ${isMobile ? 'p-4' : 'p-3'}`}>
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = TYPE_ICONS[activity.type];
            return (
              <div
                key={activity.id}
                className="relative p-3 bg-cyber-panel border border-cyber-red/20 hover:border-cyber-red/40 transition-colors cursor-pointer group"
              >
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-cyber-red/30" />
                <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-cyber-red/30" />
                
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 bg-cyber-dark border border-cyber-red/30 shrink-0">
                    <AvatarFallback className="text-xs bg-cyber-dark text-cyber-cyan">
                      {activity.agentAvatar || <Icon className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-4 px-1.5 font-mono uppercase ${TYPE_COLORS[activity.type]}`}
                      >
                        {activity.type}
                      </Badge>
                      <span className="text-xs text-cyber-cyan/60 font-mono">{activity.agent.toUpperCase()}</span>
                      <span className="text-[10px] text-cyber-red/40 font-mono ml-auto" suppressHydrationWarning>
                        {mounted ? formatTimeAgo(activity.timestamp) : '...'}
                      </span>
                    </div>

                    <p className="text-sm text-white/80 mt-1.5 leading-relaxed group-hover:text-cyber-cyan transition-colors">
                      <HighlightMentions text={activity.message} />
                    </p>

                    {activity.metadata?.taskTitle && (
                      <p className="text-xs text-cyber-yellow/60 mt-1 font-mono truncate">
                        MISSION: {activity.metadata.taskTitle.toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </div>
  );
}
