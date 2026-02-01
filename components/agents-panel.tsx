"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Bot } from "lucide-react";
import { CreateAgentWizard } from "./wizard/create-agent-wizard";

interface Agent {
  id: string;
  name: string;
  model: string;
  status: "active" | "idle" | "offline";
  tokens: number;
  avatar?: string;
}

const AGENTS: Agent[] = [
  { id: "1", name: "Johnny", model: "Kimi Code", status: "active", tokens: 204802, avatar: "🤘" },
  { id: "2", name: "Claws", model: "Opus", status: "active", tokens: 89123, avatar: "🐾" },
  { id: "3", name: "Blue", model: "Sonnet", status: "idle", tokens: 4521 },
];

export function AgentsPanel() {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <>
      <div className="border-r border-neutral-800 bg-neutral-900/50 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-neutral-300">Agents</CardTitle>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0"
              onClick={() => setShowWizard(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto space-y-2 pt-0">
          {AGENTS.map((agent) => (
            <Card
              key={agent.id}
              className="bg-neutral-800/50 border-neutral-700 hover:border-neutral-600 cursor-pointer transition-colors"
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 bg-neutral-700">
                    <AvatarFallback className="text-xs bg-neutral-700 text-neutral-300">
                      {agent.avatar || <Bot className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-200 truncate">
                        {agent.name}
                      </span>
                      <Badge
                        variant={agent.status === "active" ? "default" : "secondary"}
                        className="text-[10px] h-4 px-1.5"
                      >
                        {agent.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-neutral-500 mt-1">{agent.model}</div>

                    <div className="text-xs text-neutral-600 mt-1">
                      {(agent.tokens / 1000).toFixed(0)}k tokens
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outline"
            className="w-full mt-4 border-dashed border-neutral-700 text-neutral-500 hover:text-neutral-300 hover:border-neutral-500"
            onClick={() => setShowWizard(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Agent
          </Button>
        </CardContent>
      </div>

      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-2xl bg-neutral-900 border-neutral-800 p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-lg text-neutral-200">Create New Agent</DialogTitle>
          </DialogHeader>
          <CreateAgentWizard onComplete={() => setShowWizard(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
