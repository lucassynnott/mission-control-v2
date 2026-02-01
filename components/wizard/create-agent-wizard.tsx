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
  modelProvider: string;
  model: string;
}

export function CreateAgentWizard({ onComplete }: { onComplete?: (config: AgentConfig) => void }) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<AgentConfig>({
    name: "",
    avatar: "",
    personality: "",
    abilities: [],
    modelProvider: "kimi-code",
    model: "kimi-for-coding",
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

  const canProceed = () => {
    switch (step) {
      case 1:
        return config.name.trim().length > 0;
      case 2:
        return config.abilities.length > 0;
      case 3:
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
    <Card className="w-full max-w-2xl bg-neutral-900 border-neutral-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-neutral-200">Create New Agent</CardTitle>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full ${
                  i <= step ? "bg-blue-600" : "bg-neutral-700"
                }`}
              />
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Identity */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-neutral-400">Agent Name</Label>
              <Input
                value={config.name}
                onChange={(e) => updateConfig("name", e.target.value)}
                placeholder="e.g., Code Reviewer"
                className="bg-neutral-800 border-neutral-700 text-neutral-200 mt-1"
              />
            </div>

            <div>
              <Label className="text-neutral-400">Avatar (emoji or URL)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={config.avatar}
                  onChange={(e) => updateConfig("avatar", e.target.value)}
                  placeholder="🤖"
                  className="bg-neutral-800 border-neutral-700 text-neutral-200"
                />
                <Avatar className="h-10 w-10 bg-neutral-800 border border-neutral-700">
                  <AvatarFallback className="bg-neutral-800 text-neutral-300">
                    {config.avatar || <Bot className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div>
              <Label className="text-neutral-400">Personality</Label>
              <Textarea
                value={config.personality}
                onChange={(e) => updateConfig("personality", e.target.value)}
                placeholder="e.g., Strict but fair. Focuses on security and edge cases."
                className="bg-neutral-800 border-neutral-700 text-neutral-200 mt-1 min-h-[100px]"
              />
            </div>
          </div>
        )}

        {/* Step 2: Abilities */}
        {step === 2 && (
          <div className="space-y-4">
            <Label className="text-neutral-400">Select Abilities</Label>
            <div className="grid grid-cols-2 gap-3">
              {ABILITIES.map((ability) => {
                const Icon = ability.icon;
                const selected = config.abilities.includes(ability.id);
                return (
                  <button
                    key={ability.id}
                    onClick={() => toggleAbility(ability.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      selected
                        ? "bg-blue-600/20 border-blue-600 text-blue-400"
                        : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm">{ability.label}</span>
                    {selected && <Check className="h-4 w-4 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Model */}
        {step === 3 && (
          <div className="space-y-4">
            <Label className="text-neutral-400">Select Model Provider</Label>
            <div className="space-y-2">
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    updateConfig("modelProvider", model.provider);
                    updateConfig("model", model.id);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                    config.model === model.id
                      ? "bg-blue-600/20 border-blue-600 text-blue-400"
                      : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                  }`}
                >
                  <div>
                    <div className="font-medium">{model.label}</div>
                    <div className="text-xs text-neutral-500">{model.description}</div>
                  </div>
                  {config.model === model.id && <Check className="h-5 w-5" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-neutral-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 bg-neutral-700">
                  <AvatarFallback>{config.avatar || "🤖"}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-neutral-200">{config.name}</div>
                  <div className="text-xs text-neutral-500">{MODELS.find(m => m.id === config.model)?.label}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-neutral-500 uppercase tracking-wider">Personality</div>
                <div className="text-sm text-neutral-300 mt-1">{config.personality || "Not specified"}</div>
              </div>

              <div>
                <div className="text-xs text-neutral-500 uppercase tracking-wider">Abilities</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {config.abilities.map((ability) => (
                    <Badge key={ability} variant="outline" className="border-neutral-600 text-neutral-400">
                      {ABILITIES.find(a => a.id === ability)?.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-neutral-800">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="text-neutral-400"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Agent
                  <Check className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
