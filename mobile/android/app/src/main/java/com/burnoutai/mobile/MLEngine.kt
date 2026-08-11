package com.burnoutai.mobile

import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Native Kotlin ML Engine for Burnout Detection and Wellness Predictions.
 * Runs lightweight linear regression & classification predictions on-device.
 */
object MLEngine {

    data class SleepMLPrediction(
        val predictedQualityScore: Int,
        val fatigueIndex: Int,
        val circadianDisruptionLevel: String
    )

    data class DigitalAddictionMLPrediction(
        val burnoutContributionScore: Int,
        val usagePatternClass: String,
        val recommendedScreenCapHours: Double
    )

    data class CognitiveFocusMLPrediction(
        val predictedFocusScore: Int,
        val mentalExhaustionProbability: Double,
        val recommendedBreakIntervalMinutes: Int
    )

    data class EmotionStressMLPrediction(
        val stabilityIndex: Int,
        val stressCategory: String,
        val interventionUrgency: String
    )

    data class MasterBurnoutMLPrediction(
        val masterBurnoutScore: Int,
        val future7DayScore: Int,
        val riskLevel: String,
        val primaryDriver: String
    )

    private fun evaluateLinearModel(coefficients: DoubleArray, intercept: Double, features: DoubleArray): Double {
        var result = intercept
        val count = min(coefficients.size, features.size)
        for (i in 0 until count) {
            result += coefficients[i] * features[i]
        }
        return result
    }

    /**
     * 1. Sleep Quality & Recovery Predictor (Kotlin Native)
     */
    fun predictSleepQuality(
        bedtimeHour: Double,
        wakeTimeHour: Double,
        durationHours: Double,
        interruptions: Int,
        prevScreenTime: Double,
        prevLateNight: Boolean,
        prevExercise: Double,
        prevStress: Double
    ): SleepMLPrediction {
        val coefsQuality = doubleArrayOf(-1.25, 0.85, 4.20, -5.50, -1.80, -10.0, 0.12, -2.80)
        val interceptQuality = 82.5

        val coefsFatigue = doubleArrayOf(0.95, -0.65, -3.10, 4.20, 1.45, 8.50, -0.09, 2.30)
        val interceptFatigue = 45.0

        val inputs = doubleArrayOf(
            bedtimeHour,
            wakeTimeHour,
            durationHours,
            interruptions.toDouble(),
            prevScreenTime,
            if (prevLateNight) 1.0 else 0.0,
            prevExercise,
            prevStress
        )

        val rawQuality = evaluateLinearModel(coefsQuality, interceptQuality, inputs)
        val rawFatigue = evaluateLinearModel(coefsFatigue, interceptFatigue, inputs)

        val quality = max(10, min(100, rawQuality.roundToInt()))
        val fatigue = max(0, min(100, rawFatigue.roundToInt()))

        var disruption = "Low"
        if ((bedtimeHour in 1.0..5.0) || prevLateNight) {
            disruption = if (interruptions > 2) "High" else "Moderate"
        }

        return SleepMLPrediction(quality, fatigue, disruption)
    }

    /**
     * 2. Digital Overuse & Addiction Classifier (Kotlin Native)
     */
    fun predictDigitalAddiction(
        totalScreen: Double,
        socialMedia: Double,
        entertainment: Double,
        productive: Double,
        pickups: Int,
        lateNight: Boolean,
        avgSessionMin: Double
    ): DigitalAddictionMLPrediction {
        val coefsScore = doubleArrayOf(4.2, 2.8, 1.9, -1.8, 0.14, 14.0, 0.25)
        val interceptScore = 8.5

        val coefsCap = doubleArrayOf(-0.35, -0.15, -0.10, 0.12, -0.01, -0.80, -0.02)
        val interceptCap = 6.2

        val inputs = doubleArrayOf(
            totalScreen,
            socialMedia,
            entertainment,
            productive,
            pickups.toDouble(),
            if (lateNight) 1.0 else 0.0,
            avgSessionMin
        )

        val rawScore = evaluateLinearModel(coefsScore, interceptScore, inputs)
        val rawCap = evaluateLinearModel(coefsCap, interceptCap, inputs)

        val finalScore = max(0, min(100, rawScore.roundToInt()))
        val patternClass = when {
            finalScore >= 65 -> "Compulsive_Addiction"
            finalScore >= 35 -> "Distracted"
            else -> "Healthy"
        }

        val roundedCap = (max(1.5, min(8.0, rawCap)) * 10).roundToInt() / 10.0

        return DigitalAddictionMLPrediction(finalScore, patternClass, roundedCap)
    }

    /**
     * 3. Cognitive Exhaustion & Focus Model (Kotlin Native)
     */
    fun predictCognitiveExhaustion(
        workHours: Double,
        studyHours: Double,
        exerciseMin: Double,
        breakCount: Int,
        sleepLastNight: Double
    ): CognitiveFocusMLPrediction {
        val totalProd = workHours + studyHours
        val breakRatio = if (totalProd > 0) (breakCount * 10.0) / (totalProd * 60.0) else 0.2

        val coefsFocus = doubleArrayOf(-4.2, -3.5, 0.15, 2.8, 12.0, 4.8)
        val interceptFocus = 65.0

        val coefsExhaust = doubleArrayOf(0.08, 0.06, -0.003, -0.04, -0.15, -0.07)
        val interceptExhaust = 0.35

        val inputs = doubleArrayOf(workHours, studyHours, exerciseMin, breakCount.toDouble(), breakRatio, sleepLastNight)

        val rawFocus = evaluateLinearModel(coefsFocus, interceptFocus, inputs)
        val rawExhaust = evaluateLinearModel(coefsExhaust, interceptExhaust, inputs)

        val finalFocus = max(10, min(100, rawFocus.roundToInt()))
        val finalExhaust = (max(0.0, min(1.0, rawExhaust)) * 100).roundToInt() / 100.0
        val recInterval = max(25, min(60, (52 - totalProd * 2 + breakCount * 2).toInt()))

        return CognitiveFocusMLPrediction(finalFocus, finalExhaust, recInterval)
    }

    /**
     * 4. Emotional Stability & Stress Intervention Model (Kotlin Native)
     */
    fun predictEmotionStress(
        dominantEmotion: String,
        selfReportedStress: Int,
        valence: Double,
        arousal: Double,
        timeOfDay: Double
    ): EmotionStressMLPrediction {
        val emotionCode = when (dominantEmotion.lowercase()) {
            "happy" -> 0.0
            "sad" -> 1.0
            "angry" -> 2.0
            "neutral" -> 3.0
            "surprised" -> 4.0
            "anxious" -> 5.0
            else -> 3.0
        }

        val coefsStab = doubleArrayOf(-1.2, -3.8, 18.0, -14.0, -0.15)
        val interceptStab = 78.0

        val inputs = doubleArrayOf(emotionCode, selfReportedStress.toDouble(), valence, arousal, timeOfDay)
        val rawStab = evaluateLinearModel(coefsStab, interceptStab, inputs)

        val finalStab = max(10, min(100, rawStab.roundToInt()))
        val category = when {
            selfReportedStress >= 8 -> "Burnout_Distress"
            selfReportedStress >= 6 -> "High_Anxiety"
            selfReportedStress >= 4 -> "Mild_Stress"
            else -> "Calm"
        }

        val urgency = when {
            selfReportedStress >= 8 -> "Immediate_Breathing_Required"
            selfReportedStress >= 6 -> "Low"
            else -> "None"
        }

        return EmotionStressMLPrediction(finalStab, category, urgency)
    }

    /**
     * 5. Master Burnout Forecaster (Kotlin Native)
     */
    fun predictMasterBurnout(
        avgSleepQual7d: Double,
        avgSleepDur7d: Double,
        avgScreenTime7d: Double,
        avgPickups7d: Double,
        avgWorkHours7d: Double,
        avgExercise7d: Double,
        negEmotionRatio7d: Double,
        emotionStability7d: Double
    ): MasterBurnoutMLPrediction {
        val coefsScore = doubleArrayOf(-0.25, -2.1, 3.8, 0.08, 3.2, -0.18, 22.0, -0.14)
        val interceptScore = 42.0

        val coefsFuture = doubleArrayOf(-0.27, -2.3, 4.0, 0.09, 3.4, -0.19, 23.5, -0.15)
        val interceptFuture = 44.0

        val inputs = doubleArrayOf(
            avgSleepQual7d,
            avgSleepDur7d,
            avgScreenTime7d,
            avgPickups7d,
            avgWorkHours7d,
            avgExercise7d,
            negEmotionRatio7d,
            emotionStability7d
        )

        val rawScore = evaluateLinearModel(coefsScore, interceptScore, inputs)
        val rawFuture = evaluateLinearModel(coefsFuture, interceptFuture, inputs)

        val finalScore = max(0, min(100, rawScore.roundToInt()))
        val finalFuture = max(0, min(100, rawFuture.roundToInt()))

        val riskLevel = when {
            finalScore >= 75 -> "critical"
            finalScore >= 50 -> "high"
            finalScore >= 25 -> "moderate"
            else -> "low"
        }

        val sleepContrib = (100 - avgSleepQual7d) * 0.25
        val phoneContrib = avgScreenTime7d * 3.8
        val workContrib = avgWorkHours7d * 3.2
        val emotionContrib = negEmotionRatio7d * 22.0

        val maxContrib = maxOf(sleepContrib, phoneContrib, workContrib, emotionContrib)
        val primaryDriver = when (maxContrib) {
            phoneContrib -> "Phone_Overuse"
            workContrib -> "Work_Overload"
            emotionContrib -> "Emotional_Distress"
            else -> "Sleep"
        }

        return MasterBurnoutMLPrediction(finalScore, finalFuture, riskLevel, primaryDriver)
    }
}
