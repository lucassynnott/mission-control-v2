"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Bot, Loader2, Cpu, Shield } from "lucide-react";
import { CreateAgentWizard } from "./wizard/create-agent-wizard";
import { supabase, Agent } from "@/lib/supabase";

interface AgentsPanelProps {
  isMobile?: boolean;
}

// Cyberpunk status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/50';
    case 'idle': return 'bg-cyber-yellow/20 text-cyber-yellow border-cyber-yellow/50';
    case 'blocked': return 'bg-cyber-red/20 text-cyber-red border-cyber-red/50';
    default: return 'bg-cyber-panel border-cyber-red/30 text-cyber-cyan/60';
  }
};

// Cyberpunk card component with corner brackets
function CyberCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative bg-cyber-panel border border-cyber-red/30 ${className}`}>
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-l border-t border-cyber-red" />
      <div className="absolute top-0 right-0 w-3 h-3 border-r border-t border-cyber-red" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-l border-b border-cyber-red" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-r border-b border-cyber-red" />
      {children}
    </div>
  );
}

export function AgentsPanel({ isMobile }: AgentsPanelProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    fetchAgents();

    const channel = supabase
      .channel('agents-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        () => fetchAgents()
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

  return (
    <>
      <div className={`${isMobile ? '' : ''} bg-cyber-dark flex flex-col h-full`}>
        {/* Header */}
        <div className="p-4 border-b border-cyber-red/30 bg-cyber-panel">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-cyber-red" />
              <div>
                <h2 className="text-sm font-bold text-white tracking-wider">AGENT UNITS</h2>
                <p className="text-[10px] text-cyber-cyan/60 font-mono">{agents.length} UNITS ONLINE</p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0 text-cyber-red hover:text-cyber-red hover:bg-cyber-red/10"
              onClick={() => setShowWizard(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Agent List */}
        <div className={`flex-1 overflow-auto space-y-2 p-3 ${isMobile ? '' : ''}`}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-cyber-red" />
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-8 w-8 text-cyber-red/30 mx-auto mb-2" />
              <p className="text-xs text-cyber-cyan/40 font-mono uppercase">No units deployed</p>
            </div>
          ) : (
            agents.map((agent) => (
              <CyberCard key={agent.id} className="p-3 hover:border-cyber-red/60 transition-colors cursor-pointer group">
                <div className="flex items-start gap-3">
                  {/* Avatar with glow effect */}
                  <div className="relative">
                    <Avatar className="h-10 w-10 bg-cyber-panel border border-cyber-red/50">
                      <AvatarFallback className="text-sm bg-cyber-dark text-cyber-cyan font-bold">
                        {agent.avatar_emoji || <Bot className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    {/* Status indicator */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-cyber-dark ${
                      agent.status === 'active' ? 'bg-cyber-cyan shadow-[0_0_8px_rgba(0,240,255,0.8)]' :
                      agent.status === 'idle' ? 'bg-cyber-yellow shadow-[0_0_8px_rgba(255,204,0,0.8)]' :
                      'bg-cyber-red shadow-[0_0_8px_rgba(255,0,60,0.8)]'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-white tracking-wide truncate group-hover:text-cyber-cyan transition-colors">
                        {agent.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 px-1.5 font-mono uppercase tracking-wider ${getStatusColor(agent.status)}`}
                      >
                        {agent.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-cyber-cyan/60 mt-1 font-mono">
                      MDL://{agent.model.toUpperCase().replace(/\s+/g, '_')}
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 text-[10px] text-cyber-cyan/40 font-mono">
                        <span>TOK:</span>
                        <span className="text-cyber-yellow">{(agent.tokens_used / 1000).toFixed(0)}K</span>
                      </div>
                      {agent.current_task_id && (
                        <div className="flex items-center gap-1 text-[10px] text-cyber-red/60 font-mono">
                          <span className="animate-pulse">●</span>
                          <span>ACTIVE_TASK</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CyberCard>
            ))
          )}

          {/* Deploy New Button */}
          <Button
            variant="outline"
            className="w-full mt-4 border-dashed border-cyber-red/40 text-cyber-red/60 hover:text-cyber-red hover:border-cyber-red hover:bg-cyber-red/5 font-mono text-xs tracking-wider uppercase"
            onClick={() => setShowWizard(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Deploy Unit
          </Button>
        </div>
      </div>

      {/* Wizard Dialog */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-2xl bg-cyber-dark border-2 border-cyber-red/50 p-0">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyber-red to-transparent" />
          <DialogHeader className="p-6 pb-0 bg-cyber-panel border-b border-cyber-red/30">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-cyber-red" />
              <DialogTitle className="text-lg font-bold text-white tracking-wider uppercase">
                Deploy New Agent
              </DialogTitle>
            </div>
          </DialogHeader>
          <CreateAgentWizard onComplete={() => { setShowWizard(false); fetchAgents(); }} />
        </DialogContent>
      </Dialog>
    </>
  );
}
