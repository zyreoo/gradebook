function generateOverallFeedback(overallAvg, totalGrades) {
    if (totalGrades === 0) {
        return {
            overall: "No grades recorded yet. Keep up with your studies and check back soon!",
            tone: 'neutral',
            recommendations: []
        };
    }

    if (overallAvg >= 9.5) {
        return {
            overall: "Outstanding performance! You're excelling across all subjects. Keep up the excellent work!",
            tone: 'positive',
            recommendations: ["Continue maintaining your high standards and consider helping classmates."]
        };
    }

    if (overallAvg >= 8.5) {
        return {
            overall: "Great work! You're performing very well. Keep maintaining this level of achievement.",
            tone: 'positive',
            recommendations: ["You're on track for excellent results. Keep up the momentum!"]
        };
    }

    if (overallAvg >= 7.5) {
        return {
            overall: "Good performance overall. You're meeting expectations and showing solid understanding.",
            tone: 'positive',
            recommendations: ["Continue working hard. There's room to push toward even higher grades."]
        };
    }

    if (overallAvg >= 6.5) {
        return {
            overall: "Satisfactory performance. You're passing, but there's potential for improvement.",
            tone: 'neutral',
            recommendations: ["Focus on areas where you can improve. Consider asking teachers for extra help."]
        };
    }

    if (overallAvg >= 5.5) {
        return {
            overall: "Your grades need attention. Focus on improving your understanding of key concepts.",
            tone: 'concerned',
            recommendations: [
                "Consider meeting with teachers to discuss study strategies.",
                "Review your notes regularly and complete all assignments on time."
            ]
        };
    }

    return {
        overall: "Immediate attention needed. Let's work together to improve your academic performance.",
        tone: 'concerned',
        recommendations: [
            "Schedule meetings with teachers to create an improvement plan.",
            "Consider additional tutoring or study groups.",
            "Focus on understanding fundamentals before moving to advanced topics."
        ]
    };
}

function generateAttendanceFeedback(totalAbsences, unmotivatedAbsences, motivatedAbsences, currentTone) {
    const recommendations = [];

    if (totalAbsences === 0) {
        recommendations.push("✓ Excellent attendance! This is a key factor in your academic success.");
        return { recommendations, tone: currentTone };
    }

    if (unmotivatedAbsences > 5) {
        recommendations.push("⚠️ High number of unmotivated absences detected. Regular attendance is crucial for academic success.");
        return { recommendations, tone: currentTone === 'positive' ? 'neutral' : 'concerned' };
    }

    if (unmotivatedAbsences > 2) {
        recommendations.push("Please ensure regular attendance. Missing classes can impact your learning.");
    }

    if (motivatedAbsences > 0 && unmotivatedAbsences === 0) {
        recommendations.push("✓ Good job on providing reasons for absences. Keep up the communication with teachers.");
    }

    return { recommendations, tone: currentTone };
}

function generateSubjectFeedback(subject, absencesBySubject) {
    const subjectFeedback = {
        name: subject.name,
        message: '',
        status: 'neutral'
    };

    if (subject.average >= 9.5) {
        subjectFeedback.message = "Excellent work in this subject!";
        subjectFeedback.status = 'excellent';
    } else if (subject.average >= 8.5) {
        subjectFeedback.message = "Very good performance. Keep it up!";
        subjectFeedback.status = 'good';
    } else if (subject.average >= 7.5) {
        subjectFeedback.message = "Good understanding. Continue practicing.";
        subjectFeedback.status = 'good';
    } else if (subject.average >= 6.5) {
        subjectFeedback.message = "Satisfactory, but room for improvement.";
        subjectFeedback.status = 'average';
    } else if (subject.average >= 5.5) {
        subjectFeedback.message = "Needs more focus. Review key concepts.";
        subjectFeedback.status = 'needs-improvement';
    } else {
        subjectFeedback.message = "Requires immediate attention. Seek help from your teacher.";
        subjectFeedback.status = 'critical';
    }

    const subjectAbsences = absencesBySubject[subject.name];
    if (subjectAbsences) {
        const unmotivated = subjectAbsences.unmotivated?.length || 0;
        if (unmotivated > 2 && subject.average < 7.5) {
            subjectFeedback.message += " High absences may be affecting your performance.";
        }
    }

    return subjectFeedback;
}

function analyzeSubjectVariance(subjects, overallAvg) {
    const subjectsWithGrades = subjects.filter(s => s.hasGrades);
    
    if (subjectsWithGrades.length <= 1) {
        return [];
    }

    const averages = subjectsWithGrades.map(s => s.average);
    const maxAvg = Math.max(...averages);
    const minAvg = Math.min(...averages);
    const variance = maxAvg - minAvg;
    const recommendations = [];

    if (variance > 3 && overallAvg < 8) {
        recommendations.push("Your performance varies significantly across subjects. Focus on bringing up weaker areas.");
    } else if (variance < 1 && overallAvg >= 8) {
        recommendations.push("Great consistency across all subjects! This shows well-rounded learning.");
    }

    return recommendations;
}

function generateStudentFeedback(stats, subjects, absencesBySubject) {
    const feedback = {
        overall: '', 
        subjects: [], 
        recommendations: [], 
        tone: 'neutral'
    }; 

    const overallAvg = stats.overallAverage || 0; 
    const totalGrades = stats.totalGrades || 0;
    const unmotivatedAbsences = stats.unmotivatedAbsences || 0;
    const motivatedAbsences = stats.motivatedAbsences || 0; 
    const totalAbsences = stats.totalAbsences || 0;

    const overallFeedback = generateOverallFeedback(overallAvg, totalGrades);
    feedback.overall = overallFeedback.overall;
    feedback.tone = overallFeedback.tone;
    feedback.recommendations.push(...overallFeedback.recommendations);

    // Generate attendance feedback
    const attendanceFeedback = generateAttendanceFeedback(
        totalAbsences, 
        unmotivatedAbsences, 
        motivatedAbsences, 
        feedback.tone
    );
    feedback.recommendations.push(...attendanceFeedback.recommendations);
    feedback.tone = attendanceFeedback.tone;

    subjects.forEach(subject => {
        if (subject.hasGrades) {
            feedback.subjects.push(generateSubjectFeedback(subject, absencesBySubject));
        }
    });

    if (totalGrades < 3 && stats.totalSubjects > 0) {
        feedback.recommendations.push("More grades will be recorded soon. This will give a better picture of your progress.");
    }

    const varianceRecommendations = analyzeSubjectVariance(subjects, overallAvg);
    feedback.recommendations.push(...varianceRecommendations);

    return feedback; 
}


module.exports = { generateStudentFeedback };