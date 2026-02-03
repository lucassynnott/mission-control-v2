// Common skills for agents and tasks
export const AVAILABLE_SKILLS = [
  'coding',
  'debugging',
  'testing',
  'documentation',
  'ui-design',
  'backend',
  'frontend',
  'database',
  'api-design',
  'security',
  'devops',
  'research',
  'writing',
  'analysis',
  'planning',
  'review',
] as const;

export type Skill = typeof AVAILABLE_SKILLS[number];

export const SKILL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  coding: { bg: 'bg-cyber-red/10', border: 'border-cyber-red', text: 'text-cyber-red' },
  debugging: { bg: 'bg-cyber-yellow/10', border: 'border-cyber-yellow', text: 'text-cyber-yellow' },
  testing: { bg: 'bg-cyber-cyan/10', border: 'border-cyber-cyan', text: 'text-cyber-cyan' },
  documentation: { bg: 'bg-purple-500/10', border: 'border-purple-500', text: 'text-purple-400' },
  'ui-design': { bg: 'bg-pink-500/10', border: 'border-pink-500', text: 'text-pink-400' },
  backend: { bg: 'bg-green-500/10', border: 'border-green-500', text: 'text-green-400' },
  frontend: { bg: 'bg-blue-500/10', border: 'border-blue-500', text: 'text-blue-400' },
  database: { bg: 'bg-orange-500/10', border: 'border-orange-500', text: 'text-orange-400' },
  'api-design': { bg: 'bg-teal-500/10', border: 'border-teal-500', text: 'text-teal-400' },
  security: { bg: 'bg-red-500/10', border: 'border-red-500', text: 'text-red-400' },
  devops: { bg: 'bg-indigo-500/10', border: 'border-indigo-500', text: 'text-indigo-400' },
  research: { bg: 'bg-cyber-cyan/10', border: 'border-cyber-cyan', text: 'text-cyber-cyan' },
  writing: { bg: 'bg-purple-500/10', border: 'border-purple-500', text: 'text-purple-400' },
  analysis: { bg: 'bg-yellow-500/10', border: 'border-yellow-500', text: 'text-yellow-400' },
  planning: { bg: 'bg-blue-500/10', border: 'border-blue-500', text: 'text-blue-400' },
  review: { bg: 'bg-green-500/10', border: 'border-green-500', text: 'text-green-400' },
};

// Calculate skill match score
export function calculateSkillMatch(agentSkills: string[], requiredSkills: string[]): {
  score: number;
  status: 'full' | 'partial' | 'none';
  missing: string[];
} {
  if (!requiredSkills || requiredSkills.length === 0) {
    return { score: 100, status: 'full', missing: [] };
  }

  if (!agentSkills || agentSkills.length === 0) {
    return { score: 0, status: 'none', missing: requiredSkills };
  }

  const matches = requiredSkills.filter(skill => agentSkills.includes(skill));
  const missing = requiredSkills.filter(skill => !agentSkills.includes(skill));
  const score = (matches.length / requiredSkills.length) * 100;

  let status: 'full' | 'partial' | 'none';
  if (score === 100) status = 'full';
  else if (score > 0) status = 'partial';
  else status = 'none';

  return { score, status, missing };
}

export function getSkillMatchColor(status: 'full' | 'partial' | 'none'): string {
  switch (status) {
    case 'full': return 'text-green-400';
    case 'partial': return 'text-cyber-yellow';
    case 'none': return 'text-cyber-red';
  }
}
