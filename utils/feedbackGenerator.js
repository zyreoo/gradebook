
/**
 * Decision tree for generating student feedback based on grades and attendance
 */
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

    if (totalGrades === 0) {
        feedback.overall = "No grades recorded yet. Keep up with your studies and check back soon!";
        feedback.tone = 'neutral';
    } else if (overallAvg >= 9.5) {
        feedback.overall = "Outstanding performance! You're excelling across all subjects. Keep up the excellent work!";
        feedback.tone = 'positive';
        feedback.recommendations.push("Continue maintaining your high standards and consider helping classmates.");
    } else if (overallAvg >= 8.5) {
        feedback.overall = "Great work! You're performing very well. Keep maintaining this level of achievement.";
        feedback.tone = 'positive';
        feedback.recommendations.push("You're on track for excellent results. Keep up the momentum!");
    } else if (overallAvg >= 7.5) {
        feedback.overall = "Good performance overall. You're meeting expectations and showing solid understanding.";
        feedback.tone = 'positive';
        feedback.recommendations.push("Continue working hard. There's room to push toward even higher grades.");
    } else if (overallAvg >= 6.5) {
        feedback.overall = "Satisfactory performance. You're passing, but there's potential for improvement.";
        feedback.tone = 'neutral';
        feedback.recommendations.push("Focus on areas where you can improve. Consider asking teachers for extra help.");
    } else if (overallAvg >= 5.5) {
        feedback.overall = "Your grades need attention. Focus on improving your understanding of key concepts.";
        feedback.tone = 'concerned';
        feedback.recommendations.push("Consider meeting with teachers to discuss study strategies.");
        feedback.recommendations.push("Review your notes regularly and complete all assignments on time.");
    } else {
        feedback.overall = "Immediate attention needed. Let's work together to improve your academic performance.";
        feedback.tone = 'concerned';
        feedback.recommendations.push("Schedule meetings with teachers to create an improvement plan.");
        feedback.recommendations.push("Consider additional tutoring or study groups.");
        feedback.recommendations.push("Focus on understanding fundamentals before moving to advanced topics.");
    }

    if (totalAbsences > 0) {
        const absenceRate = totalAbsences / (totalAbsences + 30); // Rough estimate
        if (unmotivatedAbsences > 5) {
            feedback.recommendations.push("⚠️ High number of unmotivated absences detected. Regular attendance is crucial for academic success.");
            feedback.tone = feedback.tone === 'positive' ? 'neutral' : 'concerned';
        } else if (unmotivatedAbsences > 2) {
            feedback.recommendations.push("Please ensure regular attendance. Missing classes can impact your learning.");
        }
        
        if (motivatedAbsences > 0 && unmotivatedAbsences === 0) {
            feedback.recommendations.push("✓ Good job on providing reasons for absences. Keep up the communication with teachers.");
        }
    } else {
        feedback.recommendations.push("✓ Excellent attendance! This is a key factor in your academic success.");
    }

    subjects.forEach(subject => {
        if (subject.hasGrades) {
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

            feedback.subjects.push(subjectFeedback);
        }
    });

    if (totalGrades < 3 && stats.totalSubjects > 0) {
        feedback.recommendations.push("More grades will be recorded soon. This will give a better picture of your progress.");
    }

    if (subjects.filter(s => s.hasGrades).length > 1) {
        const averages = subjects.filter(s => s.hasGrades).map(s => s.average);
        const maxAvg = Math.max(...averages);
        const minAvg = Math.min(...averages);
        const variance = maxAvg - minAvg;

        if (variance > 3 && overallAvg < 8) {
            feedback.recommendations.push("Your performance varies significantly across subjects. Focus on bringing up weaker areas.");
        } else if (variance < 1 && overallAvg >= 8) {
            feedback.recommendations.push("Great consistency across all subjects! This shows well-rounded learning.");
        }
    }

    return feedback; 

}


module.exports = { generateStudentFeedback };