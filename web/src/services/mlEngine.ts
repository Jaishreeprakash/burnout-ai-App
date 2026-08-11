import sleepModel from '../assets/models/sleep_model.json';
import phoneModel from '../assets/models/phone_model.json';
import activityModel from '../assets/models/activity_model.json';
import emotionModel from '../assets/models/emotion_model.json';
import masterModel from '../assets/models/master_burnout_model.json';

// Helper for dot product calculation: intercept + sum(coef_i * x_i)
function evaluateLinearModel(coefficients: number[], intercept: number, features: number[]): number {
  let val = intercept;
  for (let i = 0; i < coefficients.length; i++) {
    val += (coefficients[i] || 0) * (features[i] || 0);
  }
  return val;
}

// ---------------------------------------------------------------------
// 1. Sleep Quality & Recovery Predictor
// ---------------------------------------------------------------------
export interface SleepMLPrediction {
  predictedQualityScore: number;
  fatigueIndex: number;
  circadianDisruptionLevel: 'Low' | 'Moderate' | 'High';
}

export function predictSleepQuality(
  bedtimeHour: number,
  wakeTimeHour: number,
  durationHours: number,
  interruptions: number,
  prevScreenTime: number,
  prevLateNight: boolean,
  prevExercise: number,
  prevStress: number
): SleepMLPrediction {
  const inputs = [
    bedtimeHour,
    wakeTimeHour,
    durationHours,
    interruptions,
    prevScreenTime,
    prevLateNight ? 1 : 0,
    prevExercise,
    prevStress,
  ];

  const quality = evaluateLinearModel(
    sleepModel.quality_model.coefficients,
    sleepModel.quality_model.intercept,
    inputs
  );

  const fatigue = evaluateLinearModel(
    sleepModel.fatigue_model.coefficients,
    sleepModel.fatigue_model.intercept,
    inputs
  );

  let disruption: 'Low' | 'Moderate' | 'High' = 'Low';
  if ((bedtimeHour >= 1 && bedtimeHour <= 5) || prevLateNight) {
    disruption = interruptions > 2 ? 'High' : 'Moderate';
  }

  return {
    predictedQualityScore: Math.round(Math.max(10, Math.min(100, quality))),
    fatigueIndex: Math.round(Math.max(0, Math.min(100, fatigue))),
    circadianDisruptionLevel: disruption,
  };
}

// ---------------------------------------------------------------------
// 2. Digital Overuse & Addiction Classifier
// ---------------------------------------------------------------------
export interface DigitalAddictionMLPrediction {
  burnoutContributionScore: number;
  usagePatternClass: 'Healthy' | 'Distracted' | 'Compulsive_Addiction';
  recommendedScreenCapHours: number;
}

export function predictDigitalAddiction(
  totalScreen: number,
  socialMedia: number,
  entertainment: number,
  productive: number,
  pickups: number,
  lateNight: boolean,
  avgSessionMin: number
): DigitalAddictionMLPrediction {
  const inputs = [
    totalScreen,
    socialMedia,
    entertainment,
    productive,
    pickups,
    lateNight ? 1 : 0,
    avgSessionMin,
  ];

  const score = evaluateLinearModel(
    phoneModel.score_model.coefficients,
    phoneModel.score_model.intercept,
    inputs
  );

  const cap = evaluateLinearModel(
    phoneModel.cap_model.coefficients,
    phoneModel.cap_model.intercept,
    inputs
  );

  const finalScore = Math.round(Math.max(0, Math.min(100, score)));

  let patternClass: 'Healthy' | 'Distracted' | 'Compulsive_Addiction' = 'Healthy';
  if (finalScore >= 65) {
    patternClass = 'Compulsive_Addiction';
  } else if (finalScore >= 35) {
    patternClass = 'Distracted';
  }

  return {
    burnoutContributionScore: finalScore,
    usagePatternClass: patternClass,
    recommendedScreenCapHours: Math.round(Math.max(1.5, Math.min(8.0, cap)) * 10) / 10,
  };
}

// ---------------------------------------------------------------------
// 3. Cognitive Exhaustion & Focus Model
// ---------------------------------------------------------------------
export interface CognitiveFocusMLPrediction {
  predictedFocusScore: number;
  mentalExhaustionProbability: number;
  recommendedBreakIntervalMinutes: number;
}

export function predictCognitiveExhaustion(
  workHours: number,
  studyHours: number,
  exerciseMin: number,
  breakCount: number,
  sleepLastNight: number
): CognitiveFocusMLPrediction {
  const totalProd = workHours + studyHours;
  const breakRatio = totalProd > 0 ? (breakCount * 10) / (totalProd * 60) : 0.2;

  const inputs = [
    workHours,
    studyHours,
    exerciseMin,
    breakCount,
    breakRatio,
    sleepLastNight,
  ];

  const focus = evaluateLinearModel(
    activityModel.focus_model.coefficients,
    activityModel.focus_model.intercept,
    inputs
  );

  const exhaustion = evaluateLinearModel(
    activityModel.exhaustion_model.coefficients,
    activityModel.exhaustion_model.intercept,
    inputs
  );

  const finalFocus = Math.round(Math.max(10, Math.min(100, focus)));
  const finalExhaustion = Math.round(Math.max(0, Math.min(1.0, exhaustion)) * 100) / 100;
  const recommendedInterval = Math.round(Math.max(25, Math.min(60, 52 - totalProd * 2 + breakCount * 2)));

  return {
    predictedFocusScore: finalFocus,
    mentalExhaustionProbability: finalExhaustion,
    recommendedBreakIntervalMinutes: recommendedInterval,
  };
}

// ---------------------------------------------------------------------
// 4. Emotional Stability & Stress Intervention Model
// ---------------------------------------------------------------------
export interface EmotionStressMLPrediction {
  stabilityIndex: number;
  stressCategory: 'Calm' | 'Mild_Stress' | 'High_Anxiety' | 'Burnout_Distress';
  interventionUrgency: 'None' | 'Low' | 'Immediate_Breathing_Required';
}

const EMOTION_MAP: Record<string, number> = {
  Happy: 0,
  Sad: 1,
  Angry: 2,
  Neutral: 3,
  Surprised: 4,
  Anxious: 5,
};

export function predictEmotionStress(
  dominantEmotion: string,
  selfReportedStress: number, // 1 to 10
  valence: number, // -1.0 to 1.0
  arousal: number, // 0.0 to 1.0
  timeOfDay: number // 0 to 23.9
): EmotionStressMLPrediction {
  const code = EMOTION_MAP[dominantEmotion] ?? 3;
  const inputs = [code, selfReportedStress, valence, arousal, timeOfDay];

  const stability = evaluateLinearModel(
    emotionModel.stability_model.coefficients,
    emotionModel.stability_model.intercept,
    inputs
  );

  let category: 'Calm' | 'Mild_Stress' | 'High_Anxiety' | 'Burnout_Distress' = 'Calm';
  if (selfReportedStress >= 8) category = 'Burnout_Distress';
  else if (selfReportedStress >= 6) category = 'High_Anxiety';
  else if (selfReportedStress >= 4) category = 'Mild_Stress';

  let urgency: 'None' | 'Low' | 'Immediate_Breathing_Required' = 'None';
  if (selfReportedStress >= 8) urgency = 'Immediate_Breathing_Required';
  else if (selfReportedStress >= 6) urgency = 'Low';

  return {
    stabilityIndex: Math.round(Math.max(10, Math.min(100, stability))),
    stressCategory: category,
    interventionUrgency: urgency,
  };
}

// ---------------------------------------------------------------------
// 5. Master Burnout Forecaster
// ---------------------------------------------------------------------
export interface MasterBurnoutMLPrediction {
  masterBurnoutScore: number;
  future7DayScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  primaryDriver: 'Sleep' | 'Phone_Overuse' | 'Work_Overload' | 'Emotional_Distress';
}

export function predictMasterBurnout(
  avgSleepQual7d: number,
  avgSleepDur7d: number,
  avgScreenTime7d: number,
  avgPickups7d: number,
  avgWorkHours7d: number,
  avgExercise7d: number,
  negEmotionRatio7d: number,
  emotionStability7d: number
): MasterBurnoutMLPrediction {
  const inputs = [
    avgSleepQual7d,
    avgSleepDur7d,
    avgScreenTime7d,
    avgPickups7d,
    avgWorkHours7d,
    avgExercise7d,
    negEmotionRatio7d,
    emotionStability7d,
  ];

  const masterScore = evaluateLinearModel(
    masterModel.master_score_model.coefficients,
    masterModel.master_score_model.intercept,
    inputs
  );

  const futureScore = evaluateLinearModel(
    masterModel.future_7d_model.coefficients,
    masterModel.future_7d_model.intercept,
    inputs
  );

  const finalScore = Math.round(Math.max(0, Math.min(100, masterScore)));
  const finalFuture = Math.round(Math.max(0, Math.min(100, futureScore)));

  let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
  if (finalScore >= 75) riskLevel = 'critical';
  else if (finalScore >= 50) riskLevel = 'high';
  else if (finalScore >= 25) riskLevel = 'moderate';

  // Drivers breakdown
  const sleepContrib = (100 - avgSleepQual7d) * 0.25;
  const phoneContrib = avgScreenTime7d * 3.8;
  const workContrib = avgWorkHours7d * 3.2;
  const emotionContrib = negEmotionRatio7d * 22;

  const maxContrib = Math.max(sleepContrib, phoneContrib, workContrib, emotionContrib);
  let primaryDriver: 'Sleep' | 'Phone_Overuse' | 'Work_Overload' | 'Emotional_Distress' = 'Sleep';
  if (maxContrib === phoneContrib) primaryDriver = 'Phone_Overuse';
  else if (maxContrib === workContrib) primaryDriver = 'Work_Overload';
  else if (maxContrib === emotionContrib) primaryDriver = 'Emotional_Distress';

  return {
    masterBurnoutScore: finalScore,
    future7DayScore: finalFuture,
    riskLevel,
    primaryDriver,
  };
}
