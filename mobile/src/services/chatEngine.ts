/**
 * Client-side rule-based wellness chat engine.
 * TypeScript port of backend/services/smart_chat.py.
 * Generates dynamic, personalised responses using cached dashboard data.
 * Works fully offline — no API required.
 */
import { DashboardData } from '../types';

// ── Intent Detection ─────────────────────────────────────────────────────────

const INTENT_PATTERNS: Record<string, RegExp[]> = {
  sleep: [
    /sleep/i, /insomnia/i, /tired/i, /rest/i, /bedtime/i, /wake/i, /exhausted/i,
    /fatigue/i, /nap/i, /drowsy/i, /night/i, /hours? of sleep/i,
  ],
  stress: [
    /stress/i, /anxious/i, /anxiety/i, /overwhelm/i, /pressure/i, /nervous/i,
    /panic/i, /worry/i, /tense/i, /frustrated/i, /burnt? ?out/i, /burnout/i,
  ],
  work: [
    /work/i, /job/i, /office/i, /deadline/i, /meeting/i, /boss/i, /colleague/i,
    /productivity/i, /focus/i, /concentrate/i, /overwork/i,
  ],
  phone: [
    /phone/i, /screen/i, /social media/i, /instagram/i, /tiktok/i, /scroll/i,
    /digital/i, /notification/i, /device/i, /doom.?scroll/i,
  ],
  exercise: [
    /exercise/i, /workout/i, /gym/i, /walk/i, /\brun\b/i, /sport/i, /active/i,
    /sedentary/i, /move/i, /physical/i, /yoga/i, /stretch/i,
  ],
  emotion: [
    /feel/i, /emotion/i, /mood/i, /\bsad\b/i, /happy/i, /angry/i, /depress/i,
    /lonely/i, /unmotivated/i, /hopeless/i, /cry/i, /tears/i, /numb/i,
  ],
  breathing: [
    /breath/i, /breathing/i, /calm/i, /relax/i, /meditation/i, /mindful/i,
    /panic attack/i, /inhale/i, /exhale/i,
  ],
  diet: [
    /eat/i, /food/i, /diet/i, /nutrition/i, /meal/i, /water/i, /coffee/i,
    /caffeine/i, /energy drink/i, /sugar/i,
  ],
  score: [
    /score/i, /risk/i, /level/i, /how am i/i, /my data/i, /result/i,
    /analysis/i, /assessment/i, /status/i, /percentage/i,
  ],
  help: [
    /help/i, /what (can|should) i do/i, /advice/i, /suggest/i, /tip/i,
    /recommend/i, /how to/i, /how do i/i,
  ],
  greeting: [
    /^hi\b/i, /^hello\b/i, /^hey\b/i, /^good (morning|afternoon|evening)/i,
    /^what's up/i, /^howdy/i,
  ],
};

export function detectIntent(message: string): string {
  const scores: Record<string, number> = {};
  for (const intent of Object.keys(INTENT_PATTERNS)) {
    scores[intent] = 0;
    for (const pattern of INTENT_PATTERNS[intent]) {
      if (pattern.test(message)) {
        scores[intent]++;
      }
    }
  }
  let best = 'general';
  let bestScore = 0;
  for (const [intent, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }
  return bestScore > 0 ? best : 'general';
}

// ── Context from Dashboard Data ──────────────────────────────────────────────

interface ChatContext {
  name: string;
  burnoutScore: number;
  riskLevel: string;
  sleepHours: number;
  sleepQuality: number;
  sleepBedtime: string;
  phoneHours: number;
  phonePickups: number;
  phoneLateNight: boolean;
  workHours: number;
  exerciseMinutes: number;
  breakCount: number;
  focusScore: number;
  dominantEmotion: string;
  wellnessScore: number;
  hasSleep: boolean;
  hasPhone: boolean;
  hasActivity: boolean;
  hasEmotion: boolean;
}

export function buildContextFromDashboard(data: DashboardData | null, userName: string): ChatContext {
  const burnout = data?.burnout_analysis;
  const sleep = data?.recent_sleep;
  const phone = data?.recent_phone_usage;
  const activity = data?.recent_activity;
  const emotion = data?.recent_emotion;

  const burnoutScore = burnout?.burnout_score ?? 50;
  const riskLevel =
    burnoutScore >= 75 ? 'critical' :
    burnoutScore >= 50 ? 'high' :
    burnoutScore >= 25 ? 'moderate' : 'low';

  return {
    name: userName.split(' ')[0] || 'there',
    burnoutScore,
    riskLevel,
    sleepHours: sleep?.duration_hours ?? 0,
    sleepQuality: sleep?.quality_score ?? 50,
    sleepBedtime: sleep?.bedtime ?? 'unknown',
    phoneHours: phone?.total_hours ?? 0,
    phonePickups: phone?.pickups_count ?? 0,
    phoneLateNight: phone?.late_night_usage ?? false,
    workHours: activity?.work_hours ?? 0,
    exerciseMinutes: activity?.exercise_minutes ?? 0,
    breakCount: activity?.break_count ?? 0,
    focusScore: activity?.focus_score ?? 50,
    dominantEmotion: emotion?.dominant_emotion ?? 'neutral',
    wellnessScore: burnout?.wellness_score ?? 60,
    hasSleep: !!sleep,
    hasPhone: !!phone,
    hasActivity: !!activity,
    hasEmotion: !!emotion,
  };
}

// ── Response Builders ────────────────────────────────────────────────────────

export function buildResponse(intent: string, ctx: ChatContext): string {
  const builders: Record<string, (c: ChatContext) => string> = {
    greeting: greetingResponse,
    sleep: sleepResponse,
    stress: stressResponse,
    work: workResponse,
    phone: phoneResponse,
    exercise: exerciseResponse,
    emotion: emotionResponse,
    breathing: breathingResponse,
    diet: dietResponse,
    score: scoreResponse,
    help: helpResponse,
    general: generalResponse,
  };
  const fn = builders[intent] || generalResponse;
  return fn(ctx);
}

function greetingResponse(ctx: ChatContext): string {
  const riskMsg: Record<string, string> = {
    low: "You're in a healthy zone — keep it up! 🟢",
    moderate: "You're in a moderate burnout zone. Small steps matter. 🟡",
    high: "Your burnout risk is elevated. Let's work on this together. 🟠",
    critical: "Your burnout is at a critical level. Please prioritise rest today. 🔴",
  };

  let sleepLine = '';
  if (ctx.hasSleep) {
    sleepLine = ctx.sleepHours >= 7
      ? ` Last night you got ${ctx.sleepHours.toFixed(1)}h of sleep — well done!`
      : ` Last night you got ${ctx.sleepHours.toFixed(1)}h of sleep, which is below the 7h target.`;
  }

  return (
    `Hey ${ctx.name}! Welcome back to BurnoutAI. 👋\n\n` +
    `Your current burnout score is ${ctx.burnoutScore.toFixed(0)}/100 — ${riskMsg[ctx.riskLevel] || ''}\n` +
    `${sleepLine}\n\n` +
    `I'm fully aware of your wellness data and here to help. What's on your mind today?`
  );
}

function sleepResponse(ctx: ChatContext): string {
  if (!ctx.hasSleep) {
    return (
      `${ctx.name}, I don't have your recent sleep data yet. ` +
      `Log tonight's sleep in the Sleep Tracker so I can give you personalised advice. ` +
      `In general, aim for 7–9 hours and keep a consistent bedtime within ±30 minutes every day.`
    );
  }

  const lines: string[] = [`${ctx.name}, here's what your sleep data tells me:\n`];
  lines.push(`• Duration: ${ctx.sleepHours.toFixed(1)}h (optimal is 7–9h)`);
  lines.push(`• Quality: ${ctx.sleepQuality.toFixed(0)}/100`);
  lines.push(`• Bedtime: ${ctx.sleepBedtime}`);

  if (ctx.sleepHours < 6) {
    const deficit = (7 - ctx.sleepHours).toFixed(1);
    lines.push(
      `\n⚠️ You're sleeping ${deficit}h less than the minimum. ` +
      `This alone can raise stress hormones by 37%. ` +
      `Tonight: set a hard stop on all screens by 10 PM and be in bed early.`
    );
  } else if (ctx.sleepHours < 7) {
    const deficit = (7 - ctx.sleepHours).toFixed(1);
    lines.push(`\nYou're ${deficit}h short of the 7h target. Try moving your bedtime 30 minutes earlier this week.`);
  } else {
    lines.push(`\nYour sleep duration is solid! Focus on improving the quality score.`);
  }

  if (ctx.phoneLateNight) {
    lines.push(
      `\n📱 Late-night phone use detected — blue light suppresses melatonin for up to 2 hours. ` +
      `Try enabling Night Mode after 9 PM and leaving your phone outside the bedroom.`
    );
  }

  if (ctx.sleepQuality < 60) {
    lines.push(
      `\nFor better quality: keep the bedroom cool (18–20°C), dark, and quiet. ` +
      `Try the 4-7-8 breathing technique before bed: inhale 4s, hold 7s, exhale 8s.`
    );
  }

  return lines.join('\n');
}

function stressResponse(ctx: ChatContext): string {
  const lines = [`${ctx.name}, stress is your body's alarm system — it's telling you something needs to change.\n`];
  lines.push(`Your burnout score is ${ctx.burnoutScore.toFixed(0)}/100 (risk: ${ctx.riskLevel}).`);

  lines.push(
    `\nRight now — try this:\n` +
    `Box breathing (scientifically proven to calm the nervous system in 90 seconds):\n` +
    `1. Inhale slowly for 4 counts\n` +
    `2. Hold for 4 counts\n` +
    `3. Exhale for 4 counts\n` +
    `4. Hold for 4 counts\n` +
    `Repeat 4 times. Do it now — I'll wait. 🌿`
  );

  return lines.join('\n');
}

function workResponse(ctx: ChatContext): string {
  const lines: string[] = [];

  if (ctx.workHours > 10) {
    lines.push(
      `${ctx.name}, you logged ${ctx.workHours.toFixed(1)} hours of work today. ` +
      `That's ${(ctx.workHours - 8).toFixed(1)}h above the healthy limit and is directly contributing ` +
      `to your ${ctx.burnoutScore.toFixed(0)}/100 burnout score. 🚨`
    );
  } else if (ctx.workHours > 8) {
    lines.push(
      `${ctx.name}, you're working ${ctx.workHours.toFixed(1)}h — slightly over the 8h mark. ` +
      `Your burnout score is ${ctx.burnoutScore.toFixed(0)}/100.`
    );
  } else {
    lines.push(
      `${ctx.name}, your work hours (${ctx.workHours.toFixed(1)}h) look balanced. Let's keep it that way.`
    );
  }

  if (ctx.breakCount < 2) {
    lines.push(
      `\nYou only took ${ctx.breakCount} break(s) today. ` +
      `Research shows 5-minute breaks every 52 minutes improve focus by 16%. ` +
      `Set a phone timer right now for 52 minutes.`
    );
  }

  if (ctx.focusScore < 50) {
    lines.push(
      `\nYour focus score is ${ctx.focusScore.toFixed(0)}/100. ` +
      `Try the Pomodoro technique: 25 min deep work → 5 min break, repeat 4 times → 30 min rest.`
    );
  }

  lines.push(`\n🎯 One rule for tomorrow: Stop work at a fixed time. Put it in your calendar: 'Work ends at 6 PM'.`);

  return lines.join('\n');
}

function phoneResponse(ctx: ChatContext): string {
  if (!ctx.hasPhone) {
    return (
      `${ctx.name}, log your phone usage in the app to get personalised digital wellness advice. ` +
      `The average person spends 7+ hours on screens daily — knowing your number is the first step.`
    );
  }

  const lines = [`${ctx.name}, here's your phone usage picture:\n`];
  lines.push(`• Screen time: ${ctx.phoneHours.toFixed(1)}h (recommended max: 4h)`);
  lines.push(`• Phone pickups: ${ctx.phonePickups} times`);
  lines.push(`• Late-night usage: ${ctx.phoneLateNight ? 'Yes ⚠️' : 'No ✅'}`);

  if (ctx.phoneHours > 6) {
    lines.push(
      `\n🔴 ${ctx.phoneHours.toFixed(1)}h is significantly high. ` +
      `Every extra hour above 4h correlates with a 13% increase in cortisol. ` +
      `Start with this: delete one social media app for 7 days.`
    );
  } else if (ctx.phoneHours > 4) {
    lines.push(
      `\n🟡 You're ${(ctx.phoneHours - 4).toFixed(1)}h over the healthy limit. ` +
      `Set app time limits: 30 min/day for social media.`
    );
  }

  if (ctx.phonePickups > 60) {
    lines.push(`\n${ctx.phonePickups} pickups — turn off all non-essential notifications right now.`);
  }

  return lines.join('\n');
}

function exerciseResponse(ctx: ChatContext): string {
  if (ctx.exerciseMinutes === 0) {
    return (
      `${ctx.name}, you had 0 minutes of exercise today.\n\n` +
      `Here's a 7-minute no-equipment routine:\n` +
      `1. Jumping jacks — 1 min\n` +
      `2. Push-ups — 1 min\n` +
      `3. High knees — 1 min\n` +
      `4. Squats — 1 min\n` +
      `5. Plank — 1 min\n` +
      `6. Lunges — 1 min\n` +
      `7. Stretching — 1 min\n\n` +
      `Even this small dose reduces cortisol by ~15% within 30 minutes.`
    );
  } else if (ctx.exerciseMinutes < 30) {
    return (
      `${ctx.name}, you exercised for ${ctx.exerciseMinutes} minutes — good start! ` +
      `The WHO recommends 30 min/day. You're ${30 - ctx.exerciseMinutes} minutes short. ` +
      `Add a short walk after dinner to hit the target.`
    );
  }
  return (
    `${ctx.name}, excellent — ${ctx.exerciseMinutes} minutes of exercise today! 🎉 ` +
    `This is actively reducing your burnout score.`
  );
}

function emotionResponse(ctx: ChatContext): string {
  const tips: Record<string, [string, string]> = {
    sad: ['💙 Feeling sad is valid and human.', 'Connect with one person you trust today — even a 5-minute call.'],
    angry: ['🔥 Anger often signals a boundary being crossed.', 'Write down what frustrates you — 10 min of journaling reduces anger by 40%.'],
    anxious: ['💛 Anxiety is your brain trying to protect you.', 'Ground yourself: name 5 things you see, 4 you can touch, 3 you can hear.'],
    stressed: ['🟠 You\'re under significant pressure.', 'Prioritise your top 3 tasks and drop everything else today.'],
    neutral: ['😐 You\'re in a neutral emotional state.', 'This is a good time to tackle your most important task.'],
    happy: ['😊 You\'re feeling positive — great!', 'Channel this energy into something meaningful today.'],
  };

  const [intro, tip] = tips[ctx.dominantEmotion.toLowerCase()] || ['Your emotions are data.', 'Reflect on what\'s driving them.'];

  return (
    `${ctx.name}, your dominant detected emotion is ${ctx.dominantEmotion}.\n\n` +
    `${intro}\n\n` +
    `💡 Personalised tip: ${tip}`
  );
}

function breathingResponse(ctx: ChatContext): string {
  return (
    `${ctx.name}, let's do this together. Find a comfortable position:\n\n` +
    `Box Breathing (used by Navy SEALs):\n\n` +
    `1. 🌬️ Inhale through your nose — count to 4\n` +
    `2. ⏸️ Hold your breath — count to 4\n` +
    `3. 😮‍💨 Exhale slowly — count to 4\n` +
    `4. ⏸️ Hold empty — count to 4\n\n` +
    `Repeat 4 times. Total: 64 seconds.\n\n` +
    `This activates your parasympathetic nervous system and reduces anxiety by 40% within 2 minutes. ` +
    `Your burnout is ${ctx.burnoutScore.toFixed(0)}/100 — this helps lower it right now. 🌿`
  );
}

function dietResponse(ctx: ChatContext): string {
  return (
    `${ctx.name}, nutrition directly impacts burnout recovery:\n\n` +
    `Quick wins based on your ${ctx.burnoutScore.toFixed(0)}/100 burnout score:\n\n` +
    `• 💧 Water first: Dehydration of just 2% impairs cognitive function.\n` +
    `• ☕ Caffeine timing: If you're having coffee after 2 PM, it's disrupting your sleep.\n` +
    `• 🍬 Sugar spikes: Swap one daily snack for nuts, fruit, or yogurt.\n` +
    `• 🥗 Omega-3s: Add salmon, walnuts, or flaxseeds this week.\n\n` +
    `Pick one of these and do it today.`
  );
}

function scoreResponse(ctx: ChatContext): string {
  const riskEmoji: Record<string, string> = { low: '🟢', moderate: '🟡', high: '🟠', critical: '🔴' };

  return (
    `${ctx.name}, here's your complete wellness breakdown:\n\n` +
    `Overall Burnout Score: ${ctx.burnoutScore.toFixed(0)}/100 ${riskEmoji[ctx.riskLevel] || '⚪'} (${ctx.riskLevel.toUpperCase()} RISK)\n\n` +
    `Wellness Score: ${ctx.wellnessScore}/100\n` +
    `Sleep: ${ctx.sleepHours.toFixed(1)}h (quality ${ctx.sleepQuality}/100)\n` +
    `Screen Time: ${ctx.phoneHours.toFixed(1)}h (${ctx.phonePickups} pickups)\n` +
    `Exercise: ${ctx.exerciseMinutes} min\n` +
    `Work: ${ctx.workHours.toFixed(1)}h (focus: ${ctx.focusScore}/100)\n` +
    `Emotion: ${ctx.dominantEmotion}\n\n` +
    `Ask me about any specific area for a personalised action plan.`
  );
}

function helpResponse(ctx: ChatContext): string {
  return (
    `${ctx.name}, I've analysed your data. Here's what I can help with:\n\n` +
    `• 😴 Sleep — 'How can I sleep better?'\n` +
    `• 😰 Stress — 'I'm feeling overwhelmed'\n` +
    `• 💼 Work — 'I'm working too many hours'\n` +
    `• 📱 Phone — 'I use my phone too much'\n` +
    `• 🏃 Exercise — 'How do I get more active?'\n` +
    `• 😊 Emotions — 'I'm feeling sad/anxious/angry'\n` +
    `• 🌬️ Breathing — 'Help me calm down right now'\n` +
    `• 🍽️ Diet — 'Nutrition tips for burnout'\n` +
    `• 📊 My score — 'Explain my burnout score'\n\n` +
    `Your current burnout is ${ctx.burnoutScore.toFixed(0)}/100 (${ctx.riskLevel}). What do you want to tackle first?`
  );
}

function generalResponse(ctx: ChatContext): string {
  return (
    `${ctx.name}, I heard you. Your current burnout score is ${ctx.burnoutScore.toFixed(0)}/100 (${ctx.riskLevel} risk).\n\n` +
    `I'm here as your personal wellness coach — fully aware of your data. ` +
    `You can ask me anything about sleep, stress, work-life balance, exercise, ` +
    `or just type 'help' to see what I can do for you.`
  );
}
