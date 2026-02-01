"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Bot } from "lucide-react";
import { CreateAgentWizard } from "./wizard/create-agent-wizard";
import { supabase } from "@/lib/supabase";

interface Agent {
  id: string;
  name: string;
  role: string;
  status: "active" | "idle" | "offline" | "blocked";
  avatar?: string;
  model: string;
  created_at: string;
}

export function AgentsPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  // Fetch agents from Supabase
  useEffect(() => {
    async function fetchAgents() {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching agents:", error);
      } else {
        setAgents(data || []);
      }
      setLoading(false);
    }

    fetchAgents();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel("agents")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agents" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setAgents((prev) => [payload.new as Agent, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setAgents((prev) =>
              prev.map((a) =>
                a.id === payload.new.id ? (payload.new as Agent) : a
              )
            );
          } else if (payload.eventType === "DELETE") {
            setAgents((prev) => prev.filter((a) => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="border-r border-neutral-800 bg-neutral-900/50 flex flex-col items-center justify-center">
        <span className="text-sm text-neutral-500">Loading agents...</span>
      </div>
    );
  }

  return (
    <>
      <div className="border-r border-neutral-800 bg-neutral-900/50 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-neutral-300">
              Agents ({agents.length})
            </CardTitle>
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
          {agents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-neutral-500">No agents yet</p>
              <p className="text-xs text-neutral-600 mt-1">
                Create your first agent
              </p>
            </div>
          ) : (
            agents.map((agent) => (
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
                          variant={
                            agent.status === "active"
                              ? "default"
                              : agent.status === "blocked"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px] h-4 px-1.5"
                        >
                          {agent.status}
                        </Badge>
                      </div>

                      <div className="text-xs text-neutral-500 mt-1">
                        {agent.role}
                      </div>

                      <div className="text-xs text-neutral-600 mt-1">
                        {agent.model}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

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
            <DialogTitle className="text-lg text-neutral-200">
              Create New Agent
            </DialogTitle>
          </DialogHeader>
          <CreateAgentWizard onComplete={() => setShowWizard(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
