"use client";

import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const activities = [
  { id: 1, type: "task", message: "Task moved to Review", agent: "Claws", time: "2m ago" },
  { id: 2, type: "agent", message: "Johnny completed build", agent: "Johnny", time: "5m ago" },
  { id: 3, type: "system", message: "New agent created", agent: "System", time: "12m ago" },
  { id: 4, type: "task", message: "Task assigned to Blue", agent: "Lucas", time: "15m ago" },
  { id: 5, type: "agent", message: "Token limit warning", agent: "Blue", time: "23m ago" },
];

export function ActivityFeed() {
  return (
    <div className="border-l border-neutral-800 bg-neutral-900/50 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-neutral-300">Activity</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto pt-0">
        <div className="space-y-3">
          {activities.map((activity) => (
            <div 
              key={activity.id} 
              className="flex items-start gap-2 text-sm"
            >
              <Badge 
                variant="outline" 
                className="text-[10px] h-5 px-1.5 shrink-0 border-neutral-700 text-neutral-500"
              >
                {activity.type}
              </Badge>
              
              <div className="flex-1 min-w-0">
                <p className="text-neutral-300 text-xs leading-relaxed">
                  {activity.message}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-neutral-500">{activity.agent}</span>
                  <span className="text-[10px] text-neutral-600">•</span>
                  <span className="text-[10px] text-neutral-600">{activity.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </div>
  );
}
