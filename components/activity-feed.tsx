"use client";

import { useState, useEffect } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, MessageSquare, GitPullRequest, AlertCircle } from "lucide-react";

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
    message: "Agent \"Code Reviewer\" created",
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

const TYPE_COLORS = {
  task: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  agent: "bg-green-500/20 text-green-400 border-green-500/30",
  system: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  mention: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function HighlightMentions({ text }: { text: string }) {
  const parts = text.split(/(@\w+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className="text-blue-400 font-medium">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);
  const [connected, setConnected] = useState(false);

  // SSE Connection for real-time updates
  useEffect(() => {
    const eventSource = new EventSource("/api/sse");

    eventSource.onopen = () => {
      setConnected(true);
    };

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

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Parse @mentions from messages and create notifications
  async function handleMentions(activity: Activity) {
    if (activity.type === "mention" && activity.metadata?.mentionedUsers) {
      for (const username of activity.metadata.mentionedUsers) {
        try {
          await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: username.toLowerCase(),
              type: "mention",
              title: `Mentioned by ${activity.agent}`,
              message: activity.message,
              metadata: {
                mentioned_by: activity.agent,
                task_id: activity.metadata?.taskId,
                task_title: activity.metadata?.taskTitle,
              },
            }),
          });
        } catch (err) {
          console.error("Failed to create mention notification:", err);
        }
      }
    }
  }

  // Create notifications for new activities with mentions
  useEffect(() => {
    const latestActivity = activities[0];
    if (latestActivity && latestActivity.type === "mention") {
      handleMentions(latestActivity);
    }
  }, [activities]);

  return (
    <div className="border-l border-neutral-800 bg-neutral-900/50 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-neutral-300">Activity</CardTitle>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-xs text-neutral-500">{connected ? "Live" : "Offline"}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto pt-0">
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = TYPE_ICONS[activity.type];
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-neutral-800/50 transition-colors cursor-pointer"
              >
                <Avatar className="h-8 w-8 bg-neutral-800 border border-neutral-700 shrink-0">
                  <AvatarFallback className="text-xs bg-neutral-800 text-neutral-400">
                    {activity.agentAvatar || <Icon className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-4 px-1.5 ${TYPE_COLORS[activity.type]}`}
                    >
                      {activity.type}
                    </Badge>
                    <span className="text-xs text-neutral-500">{activity.agent}</span>
                  </div>

                  <p className="text-sm text-neutral-300 mt-1 leading-relaxed">
                    <HighlightMentions text={activity.message} />
                  </p>

                  {activity.metadata?.taskTitle && (
                    <p className="text-xs text-neutral-500 mt-1 truncate">
                      Task: {activity.metadata.taskTitle}
                    </p>
                  )}

                  <span className="text-[10px] text-neutral-600 mt-1 block">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </div>
  );
}
