"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, ChevronRight, ChevronLeft, Bot, Wand2, Brain, Code, Loader2 } from "lucide-react";
import { AVAILABLE_SKILLS, SKILL_COLORS } from "@/lib/skills";

const ABILITIES = [
  { id: "code_gen", label: "Code Generation", icon: Code },
  { id: "code_review", label: "Code Review", icon: Bot },
  { id: "research", label: "Research", icon: Brain },
  { id: "writing", label: "Content Writing", icon: Wand2 },
  { id: "design", label: "Design", icon: Wand2 },
  { id: "analysis", label: "Data Analysis", icon: Brain },
];

const MODELS = [
  { id: "kimi-code", label: "Kimi Code", provider: "kimi-code", description: "Fast, free, 262K context" },
  { id: "claude-opus", label: "Claude Opus", provider: "anthropic", description: "Powerful reasoning, expensive" },
  { id: "claude-sonnet", label: "Claude Sonnet", provider: "anthropic", description: "Balanced speed and quality" },
  { id: "gpt-4o", label: "GPT-4o", provider: "openai", description: "Latest OpenAI model" },
];

interface AgentConfig {
  name: string;
  avatar: string;
  personality: string;
  abilities: string[];
  skills: string[];
  modelProvider: string;
  model: string;
  level: 'intern' | 'specialist' | 'lead';
}

export function CreateAgentWizard({ onComplete }: { onComplete?: (config: AgentConfig) => void }) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<AgentConfig>({
    name: "",
    avatar: "",
    personality: "",
    abilities: [],
    skills: [],
    modelProvider: "kimi-code",
    model: "kimi-for-coding",
    level: "specialist",
  });

  const updateConfig = (key: keyof AgentConfig, value: AgentConfig[keyof AgentConfig]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAbility = (abilityId: string) => {
    setConfig((prev) => ({
      ...prev,
      abilities: prev.abilities.includes(abilityId)
        ? prev.abilities.filter((a) => a !== abilityId)
        : [...prev.abilities, abilityId],
    }));
  };

  const toggleSkill = (skill: string) => {
    setConfig((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return config.name.trim().length > 0;
      case 2:
        return config.abilities.length > 0;
      case 3:
        return config.skills.length > 0;
      case 4:
        return config.modelProvider && config.model;
      default:
        return true;
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const modelLabel = MODELS.find(m => m.id === config.model)?.label || config.model;
      const res = await fetch("/api/agents/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: config.name,
          role: config.abilities.join(', ') || 'general',
          model: modelLabel,
          avatar_emoji: config.avatar,
          skills: config.skills,
          level: config.level,
        }),
      });
      if (res.ok) {
        onComplete?.(config);
      } else {
        const err = await res.json();
        console.error('Failed to create agent:', err);
        alert('Failed to create agent: ' + (err.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Failed to create agent');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl bg-[#0a0a0a] border-cyber corner-brackets relative overflow-hidden">
      {/* Scanline effect overlay */}
      <div className="absolute inset-0 scanlines pointer-events-none opacity-20" />
      
      {/* Glitch accent lines */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-red to-transparent opacity-50" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-cyan to-transparent opacity-30" />
      
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-cyber-red glow-red" />
            <CardTitle className="text-xl font-bold text-cyber-red text-glow-red tracking-wider uppercase">
              Deploy New Agent
            </CardTitle>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-2 w-8 transition-all duration-300 ${
                  i <= step 
                    ? "bg-cyber-red glow-red" 
                    : "bg-neutral-800 border border-neutral-700"
                }`}
                style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)' }}
              />
            ))}
          </div>
        </div>
        <div className="mt-2 text-xs text-cyber-cyan uppercase tracking-widest">
          Step {step} of 5
        </div>
      </CardHeader>

      <CardContent className="space-y-6 relative z-10">
        {/* Step 1: Identity */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-cyber-cyan uppercase tracking-wider text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-cyber-cyan rounded-full animate-pulse" />
                Agent Name
              </Label>
              <Input
                value={config.name}
                onChange={(e) => updateConfig("name", e.target.value)}
                placeholder="e.g., Code Reviewer"
                className="bg-[#111111] border-l-2 border-cyber-red/50 border-y-0 border-r-0 text-neutral-200 mt-2 focus:border-cyber-red focus:ring-0 font-mono transition-all duration-200"
              />
            </div>

            <div>
              <Label className="text-cyber-cyan uppercase tracking-wider text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-cyber-cyan rounded-full animate-pulse" />
                Avatar (emoji or URL)
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={config.avatar}
                  onChange={(e) => updateConfig("avatar", e.target.value)}
                  placeholder="🤖"
                  className="bg-[#111111] border-l-2 border-cyber-red/50 border-y-0 border-r-0 text-neutral-200 focus:border-cyber-red focus:ring-0 font-mono"
                />
                <div className="relative">
                  <Avatar className="h-10 w-10 bg-[#111111] border-2 border-cyber-cyan/50 glow-cyan">
                    <AvatarFallback className="bg-[#111111] text-neutral-300">
                      {config.avatar || <Bot className="h-5 w-5 text-cyber-cyan" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyber-red rounded-full animate-pulse" />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-cyber-cyan uppercase tracking-wider text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-cyber-cyan rounded-full animate-pulse" />
                Personality
              </Label>
              <Textarea
                value={config.personality}
                onChange={(e) => updateConfig("personality", e.target.value)}
                placeholder="e.g., Strict but fair. Focuses on security and edge cases."
                className="bg-[#111111] border-l-2 border-cyber-red/50 border-y-0 border-r-0 text-neutral-200 mt-2 min-h-[100px] focus:border-cyber-red focus:ring-0 font-mono resize-none"
              />
            </div>

            <div>
              <Label className="text-cyber-cyan uppercase tracking-wider text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-cyber-cyan rounded-full animate-pulse" />
                Agent Level
              </Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { id: 'intern', label: 'Intern', desc: 'Learning' },
                  { id: 'specialist', label: 'Specialist', desc: 'Experienced' },
                  { id: 'lead', label: 'Lead', desc: 'Expert' }
                ].map((level) => {
                  const selected = config.level === level.id;
                  return (
                    <button
                      key={level.id}
                      onClick={() => updateConfig("level", level.id as 'intern' | 'specialist' | 'lead')}
                      className={`flex flex-col items-center gap-1 p-3 border transition-all duration-200 ${
                        selected
                          ? "bg-cyber-red/10 border-cyber-red text-cyber-red glow-red"
                          : "bg-[#111111] border-neutral-800 text-neutral-400 hover:border-cyber-cyan/50"
                      }`}
                    >
                      <span className="text-sm font-mono font-bold tracking-wide">{level.label}</span>
                      <span className="text-xs opacity-60">{level.desc}</span>
                      {selected && <Check className="h-3 w-3 mt-1 animate-pulse" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Abilities */}
        {step === 2 && (
          <div className="space-y-4">
            <Label className="text-cyber-cyan uppercase tracking-wider text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-cyber-cyan rounded-full animate-pulse" />
              Select Abilities
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {ABILITIES.map((ability) => {
                const Icon = ability.icon;
                const selected = config.abilities.includes(ability.id);
                return (
                  <button
                    key={ability.id}
                    onClick={() => toggleAbility(ability.id)}
                    className={`relative flex items-center gap-3 p-3 border transition-all duration-200 text-left group ${
                      selected
                        ? "bg-cyber-red/10 border-cyber-red text-cyber-red glow-red"
                        : "bg-[#111111] border-neutral-800 text-neutral-400 hover:border-cyber-cyan/50"
                    }`}
                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)' }}
                  >
                    <Icon className={`h-5 w-5 transition-colors ${selected ? 'text-cyber-red' : 'text-cyber-cyan group-hover:text-cyber-cyan'}`} />
                    <span className="text-sm font-mono tracking-wide">{ability.label}</span>
                    {selected && <Check className="h-4 w-4 ml-auto animate-pulse" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Skills */}
        {step === 3 && (
          <div className="space-y-4">
            <Label className="text-cyber-cyan uppercase tracking-wider text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-cyber-cyan rounded-full animate-pulse" />
              Select Skills
            </Label>
            <div className="text-xs text-cyber-cyan/60 font-mono mb-3">
              Choose technical skills this agent possesses
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
              {AVAILABLE_SKILLS.map((skill) => {
                const selected = config.skills.includes(skill);
                const colors = SKILL_COLORS[skill] || SKILL_COLORS.coding;
                return (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`relative flex items-center justify-between p-2 border transition-all duration-200 text-left group ${
                      selected
                        ? `${colors.bg} ${colors.border} ${colors.text}`
                        : "bg-[#111111] border-neutral-800 text-neutral-400 hover:border-cyber-cyan/50"
                    }`}
                  >
                    <span className="text-xs font-mono tracking-wide uppercase">{skill}</span>
                    {selected && <Check className="h-3 w-3 animate-pulse" />}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-cyber-yellow/70 font-mono mt-2">
              Selected: {config.skills.length} skill{config.skills.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Step 4: Model */}
        {step === 4 && (
          <div className="space-y-4">
            <Label className="text-cyber-cyan uppercase tracking-wider text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-cyber-cyan rounded-full animate-pulse" />
              Select Model Provider
            </Label>
            <div className="space-y-2">
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    updateConfig("modelProvider", model.provider);
                    updateConfig("model", model.id);
                  }}
                  className={`relative w-full flex items-center justify-between p-4 border transition-all duration-200 text-left group ${
                    config.model === model.id
                      ? "bg-cyber-red/10 border-cyber-red text-cyber-red glow-red"
                      : "bg-[#111111] border-neutral-800 text-neutral-400 hover:border-cyber-cyan/50"
                  }`}
                  style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                >
                  <div>
                    <div className="font-bold font-mono tracking-wider">{model.label}</div>
                    <div className={`text-xs mt-1 ${config.model === model.id ? 'text-cyber-red/70' : 'text-neutral-600'}`}>
                      {model.description}
                    </div>
                  </div>
                  {config.model === model.id && (
                    <Check className="h-5 w-5 animate-pulse" />
                  )}
                  {config.model !== model.id && (
                    <div className="w-2 h-2 border border-cyber-cyan opacity-30 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-4">
            <Label className="text-cyber-cyan uppercase tracking-wider text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-cyber-cyan rounded-full animate-pulse" />
              Final Review
            </Label>
            <div className="relative bg-[#111111] border-l-2 border-cyber-red/50 p-4 space-y-4">
              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyber-cyan" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyber-cyan" />
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12 bg-[#0a0a0a] border-2 border-cyber-red glow-red">
                    <AvatarFallback className="bg-[#0a0a0a] text-2xl">{config.avatar || "🤖"}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyber-cyan rounded-full animate-pulse" />
                </div>
                <div>
                  <div className="font-bold text-cyber-red text-lg font-mono tracking-wider">{config.name}</div>
                  <div className="text-xs text-cyber-cyan font-mono">{MODELS.find(m => m.id === config.model)?.label}</div>
                </div>
              </div>

              <div className="border-t border-neutral-800 pt-3">
                <div className="text-xs text-cyber-cyan uppercase tracking-widest font-bold mb-2">Personality Matrix</div>
                <div className="text-sm text-neutral-400 font-mono leading-relaxed pl-3 border-l-2 border-cyber-cyan/30">
                  {config.personality || "Not specified"}
                </div>
              </div>

              <div className="border-t border-neutral-800 pt-3">
                <div className="text-xs text-cyber-cyan uppercase tracking-widest font-bold mb-2">Abilities Online</div>
                <div className="flex flex-wrap gap-2">
                  {config.abilities.map((ability) => (
                    <Badge 
                      key={ability} 
                      variant="outline" 
                      className="border-cyber-red/50 text-cyber-red bg-cyber-red/5 font-mono tracking-wide hover:bg-cyber-red/10 transition-colors"
                    >
                      {ABILITIES.find(a => a.id === ability)?.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border-t border-neutral-800 pt-3">
                <div className="text-xs text-cyber-cyan uppercase tracking-widest font-bold mb-2">Skills Matrix</div>
                <div className="flex flex-wrap gap-2">
                  {config.skills.map((skill) => {
                    const colors = SKILL_COLORS[skill] || SKILL_COLORS.coding;
                    return (
                      <Badge 
                        key={skill} 
                        variant="outline" 
                        className={`${colors.border} ${colors.text} ${colors.bg} font-mono tracking-wide text-xs uppercase`}
                      >
                        {skill}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-cyber-red/20">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="text-neutral-500 hover:text-cyber-cyan hover:bg-cyber-cyan/10 border border-transparent hover:border-cyber-cyan/50 transition-all duration-200 font-mono uppercase tracking-wider disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {step < 5 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="bg-cyber-red hover:bg-cyber-red/80 text-white border-2 border-cyber-red glow-red transition-all duration-200 font-mono uppercase tracking-wider disabled:opacity-30 disabled:glow-none"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={submitting} 
              className="bg-cyber-cyan hover:bg-cyber-cyan/80 text-black border-2 border-cyber-cyan glow-cyan transition-all duration-200 font-mono uppercase tracking-wider font-bold disabled:opacity-30 disabled:glow-none"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Deploy Agent
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
