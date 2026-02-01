"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Bot, Loader2 } from "lucide-react";
import { CreateAgentWizard } from "./wizard/create-agent-wizard";
import { supabase, Agent } from "@/lib/supabase";

export function AgentsPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('agents-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        (payload) => {
          console.log('Agent change:', payload);
          fetchAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchAgents() {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching agents:', error);
        return;
      }

      setAgents(data || []);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'idle': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'blocked': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-neutral-500/20 text-neutral-400';
    }
  };

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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-sm">
              No agents yet
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
                        {agent.avatar_emoji || <Bot className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-neutral-200 truncate">
                          {agent.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] h-4 px-1.5 ${getStatusColor(agent.status)}`}
                        >
                          {agent.status}
                        </Badge>
                      </div>

                      <div className="text-xs text-neutral-500 mt-1">{agent.model}</div>

                      <div className="text-xs text-neutral-600 mt-1">
                        {(agent.tokens_used / 1000).toFixed(0)}k tokens
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
            <DialogTitle className="text-lg text-neutral-200">Create New Agent</DialogTitle>
          </DialogHeader>
          <CreateAgentWizard onComplete={() => { setShowWizard(false); fetchAgents(); }} />
        </DialogContent>
      </Dialog>
    </>
  );
}
