// Helper: Calculate grade trend from a subject's grades
function calculateTrend(grades) {
    if (!grades || grades.length < 3) {
        return { trend: 'insufficient_data', change: 0 };
    }

    // Sort by date to get chronological order
    const sortedGrades = [...grades].sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date();
        const dateB = b.date ? new Date(b.date) : new Date();
        return dateA - dateB;
    });

    const recentCount = Math.min(3, Math.floor(sortedGrades.length / 3));
    const recentGrades = sortedGrades.slice(-recentCount);
    const olderGrades = sortedGrades.slice(0, recentCount);

    const recentAvg = recentGrades.reduce((sum, g) => sum + g.value, 0) / recentGrades.length;
    const olderAvg = olderGrades.reduce((sum, g) => sum + g.value, 0) / olderGrades.length;
    const change = recentAvg - olderAvg;

    if (change >= 0.8) return { trend: 'improving', change };
    if (change <= -0.8) return { trend: 'declining', change };
    return { trend: 'stable', change };
}

// Helper: Calculate grade consistency (low std dev = consistent)
function calculateConsistency(grades) {
    if (!grades || grades.length < 2) return { consistency: 'insufficient_data', stdDev: 0 };

    const values = grades.map(g => g.value);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 0.5) return { consistency: 'very_consistent', stdDev };
    if (stdDev < 1.0) return { consistency: 'consistent', stdDev };
    if (stdDev < 1.5) return { consistency: 'somewhat_variable', stdDev };
    return { consistency: 'volatile', stdDev };
}

// Enhanced overall feedback with trend analysis
function generateOverallFeedback(overallAvg, totalGrades, trend, unmotivatedAbsences) {
    if (totalGrades === 0) {
        return {
            overall: "Nicio notă înregistrată încă. Continuă să înveți și verifică în curând!",
            tone: 'neutral',
            recommendations: []
        };
    }

    const recommendations = [];
    let overall = '';
    let tone = 'neutral';

    // Multi-factor decision tree: Grade + Trend + Attendance
    if (overallAvg >= 9.5) {
        if (unmotivatedAbsences === 0) {
            overall = "Performanță excepțională și prezență perfectă! Ești un model pentru colegi.";
            tone = 'positive';
            recommendations.push("Continuă să menții standardele înalte și gândește-te să ajuți colegii care au dificultăți.");
        } else if (unmotivatedAbsences > 3) {
            overall = "Performanță excepțională, dar prezența poate fi îmbunătățită.";
            tone = 'positive';
            recommendations.push("Notele tale sunt excelente, dar prezența regulată îți va consolida și mai mult cunoștințele.");
        } else {
            overall = "Performanță excepțională! Te descurci excelent la toate materiile.";
            tone = 'positive';
            recommendations.push("Continuă la fel și menține prezența la nivel înalt.");
        }

        if (trend === 'improving') {
            recommendations.push("📈 Tendință ascendentă remarcabilă! Continuă să îți depășești limitele.");
        }
    } else if (overallAvg >= 8.5) {
        tone = 'positive';
        
        if (trend === 'improving') {
            overall = "Muncă excelentă cu progres constant! Te îndrepți spre excelență.";
            recommendations.push("📈 Notele tale se îmbunătățesc constant. Dacă menții această tendință, vei atinge performanță excepțională!");
        } else if (trend === 'declining') {
            overall = "Rezultate foarte bune, dar se observă o ușoară scădere recentă.";
            tone = 'neutral';
            recommendations.push("⚠️ Deși media generală este bună, notele recente sunt mai scăzute. Identifică ce s-a schimbat și corectează-ți abordarea.");
        } else {
            overall = "Muncă excelentă! Te descurci foarte bine și ești constant.";
            recommendations.push("Ești pe drumul cel bun. Continuă să menții această consistență!");
        }

        if (unmotivatedAbsences > 5) {
            recommendations.push("Prezența ta poate afecta performanța pe termen lung. Încearcă să participi regulat.");
        }
    } else if (overallAvg >= 7.5) {
        tone = 'positive';
        
        if (trend === 'improving') {
            overall = "Progres excelent! Notele tale se îmbunătățesc vizibil.";
            recommendations.push("📈 Continui să crești! Menține această energie și vei atinge rezultate și mai bune.");
        } else if (trend === 'declining') {
            overall = "Performanță bună în general, dar tendința recentă este îngrijorătoare.";
            tone = 'neutral';
            recommendations.push("📉 Notele recente sunt mai slabe decât anterior. Este important să identifici cauzele: timpul de studiu, metoda, sau poate anumite materii?");
        } else {
            overall = "Performanță bună în general. Îndeplinești așteptările și arăți o înțelegere solidă.";
            recommendations.push("Există potențial pentru note și mai mari. Încearcă să identifici unde poți face o diferență.");
        }
    } else if (overallAvg >= 6.5) {
        tone = 'neutral';
        
        if (trend === 'improving') {
            overall = "Progres pozitiv! Continuă să lucrezi, rezultatele încep să se vadă.";
            recommendations.push("📈 Muncești bine și se vede în note. Continuă pe acest drum și vei ajunge la rezultate foarte bune!");
        } else if (trend === 'declining') {
            overall = "Situație care necesită atenție. Performanța scade și trebuie acționat acum.";
            tone = 'concerned';
            recommendations.push("🚨 Tendință negativă detectată. Este crucial să acționezi acum: vorbește cu profesorii și ajustează-ți strategia de studiu.");
        } else {
            overall = "Performanță satisfăcătoare. Treci, dar există mult potențial de îmbunătățire.";
            recommendations.push("Concentrează-te pe materiile unde ai dificultăți. Cere ajutor profesorilor înainte ca situația să devină problematică.");
        }

        if (unmotivatedAbsences > 3) {
            recommendations.push("Absențele contribuie la dificultățile tale. Prezența regulată este esențială pentru înțelegerea materiei.");
        }
    } else if (overallAvg >= 5.5) {
        tone = 'concerned';
        
        if (trend === 'improving') {
            overall = "Situație care necesită atenție, dar există semne de îmbunătățire.";
            recommendations.push("📈 Se observă progres recent, dar e nevoie de mai mult efort. Continuă să muncești și cere sprijin constant.");
        } else if (trend === 'declining') {
            overall = "Situație critică! Performanța scade rapid și necesită intervenție imediată.";
            recommendations.push("🚨 URGENT: Notele tale scad constant. Programează întâlniri cu profesorii ACUM pentru a crea un plan de recuperare.");
        } else {
            overall = "Notele tale au nevoie de atenție. Concentrează-te pe înțelegerea conceptelor cheie.";
            recommendations.push("Programează întâlniri cu profesorii pentru strategii de studiu personalizate.");
        }

        recommendations.push("Revizuiește-ți notele zilnic și finalizează toate temele la timp.");
    } else {
        tone = 'concerned';
        
        if (trend === 'improving') {
            overall = "Situație dificilă, dar se observă semne de recuperare. Continuă eforturile!";
            recommendations.push("📈 Începi să îmbunătățești rezultatele. Este un pas important, dar e nevoie de mult mai mult efort susținut.");
        } else {
            overall = "Atenție imediată necesară. Trebuie să acționăm împreună pentru îmbunătățirea urgentă a performanței.";
        }

        recommendations.push("🚨 PRIORITATE: Programează întâlniri urgente cu profesorii pentru plan de recuperare.");
        recommendations.push("Consideră meditații sau grupuri de studiu pentru toate materiile cu dificultăți.");
        recommendations.push("Concentrează-te pe înțelegerea fundamentalelor înainte de subiecte avansate.");
        
        if (unmotivatedAbsences > 0) {
            recommendations.push("Prezența este obligatorie. Fiecare absență înrăutățește situația.");
        }
    }

    return { overall, tone, recommendations };
}

function generateAttendanceFeedback(totalAbsences, unmotivatedAbsences, motivatedAbsences, currentTone) {
    const recommendations = [];

    if (totalAbsences === 0) {
        recommendations.push("✓ Prezență excelentă! Acesta este un factor cheie pentru succesul tău academic.");
        return { recommendations, tone: currentTone };
    }

    if (unmotivatedAbsences > 5) {
        recommendations.push("⚠️ Număr mare de absențe nemotivate. Prezența regulată este esențială pentru succesul academic.");
        return { recommendations, tone: currentTone === 'positive' ? 'neutral' : 'concerned' };
    }

    if (unmotivatedAbsences > 2) {
        recommendations.push("Asigură-te că ești prezent regulat. Absențele pot afecta învățarea.");
    }

    if (motivatedAbsences > 0 && unmotivatedAbsences === 0) {
        recommendations.push("✓ Felicitări că ai motivat absențele. Continuă să comunici cu profesorii.");
    }

    return { recommendations, tone: currentTone };
}

// Enhanced subject feedback with trend and consistency analysis
function generateSubjectFeedback(subject, absencesBySubject) {
    const subjectFeedback = {
        name: subject.name,
        message: '',
        status: 'neutral',
        priority: 0 // For ranking which subjects need attention
    };

    // Calculate trend and consistency for this subject
    const trend = calculateTrend(subject.grades || []);
    const consistency = calculateConsistency(subject.grades || []);
    
    const subjectAbsences = absencesBySubject[subject.name];
    const unmotivated = subjectAbsences?.unmotivated?.length || 0;
    const gradeCount = subject.grades?.length || 0;

    // Multi-factor decision tree: Average + Trend + Consistency + Attendance
    if (subject.average >= 9.5) {
        subjectFeedback.status = 'excellent';
        subjectFeedback.priority = 1;
        
        if (trend.trend === 'improving') {
            subjectFeedback.message = "Excelent și în creștere constantă! 🌟";
        } else if (consistency.consistency === 'very_consistent') {
            subjectFeedback.message = "Excelent cu performanță constantă! Model de stabilitate.";
        } else {
            subjectFeedback.message = "Excelent la această materie!";
        }
    } else if (subject.average >= 8.5) {
        subjectFeedback.status = 'good';
        subjectFeedback.priority = 2;
        
        if (trend.trend === 'improving') {
            subjectFeedback.message = "Foarte bună evoluție! 📈 Ești pe cale să atingi excelența.";
        } else if (trend.trend === 'declining') {
            subjectFeedback.message = "Bună, dar atenție la scăderea recentă. Identifică cauza.";
            subjectFeedback.status = 'average';
            subjectFeedback.priority = 5;
        } else {
            subjectFeedback.message = "Performanță foarte bună. Continuă așa!";
        }
    } else if (subject.average >= 7.5) {
        subjectFeedback.status = 'good';
        subjectFeedback.priority = 3;
        
        if (trend.trend === 'improving') {
            subjectFeedback.message = "Progres bun! 📈 Continuă să crești.";
        } else if (trend.trend === 'declining') {
            subjectFeedback.message = "Înțelegere bună, dar performanța scade. Acționează acum!";
            subjectFeedback.status = 'average';
            subjectFeedback.priority = 6;
        } else if (consistency.consistency === 'volatile') {
            subjectFeedback.message = "Înțelegere bună, dar rezultate neregulate. Lucrează la consistență.";
        } else {
            subjectFeedback.message = "Înțelegere bună. Continuă exersarea.";
        }
    } else if (subject.average >= 6.5) {
        subjectFeedback.status = 'average';
        subjectFeedback.priority = 7;
        
        if (trend.trend === 'improving') {
            subjectFeedback.message = "În îmbunătățire! 📈 Muncești bine, continuă efortul.";
        } else if (trend.trend === 'declining') {
            subjectFeedback.message = "⚠️ Situație îngrijorătoare - scădere constantă. Cere ajutor urgent!";
            subjectFeedback.status = 'needs-improvement';
            subjectFeedback.priority = 9;
        } else {
            subjectFeedback.message = "Satisfăcător, dar există loc de îmbunătățire.";
        }
    } else if (subject.average >= 5.5) {
        subjectFeedback.status = 'needs-improvement';
        subjectFeedback.priority = 8;
        
        if (trend.trend === 'improving') {
            subjectFeedback.message = "Dificil, dar se observă îmbunătățire. Continuă să muncești cu profesorul!";
        } else if (trend.trend === 'declining') {
            subjectFeedback.message = "🚨 Critic! Scădere alarmantă. Acțiune imediată necesară!";
            subjectFeedback.status = 'critical';
            subjectFeedback.priority = 10;
        } else {
            subjectFeedback.message = "Necesită mai multă concentrare. Revizuiește conceptele cheie.";
        }
    } else {
        subjectFeedback.status = 'critical';
        subjectFeedback.priority = 10;
        
        if (trend.trend === 'improving') {
            subjectFeedback.message = "🚨 Situație critică, dar cu semne de recuperare. Intensifică eforturile!";
        } else {
            subjectFeedback.message = "🚨 Necesită atenție imediată. Cere ajutor urgent de la profesor!";
        }
    }

    // Attendance correlation analysis
    if (unmotivated > 2) {
        if (subject.average < 7.5) {
            subjectFeedback.message += " Absențele frecvente afectează clar performanța.";
            subjectFeedback.priority += 1;
        } else if (subject.average >= 8.5) {
            subjectFeedback.message += " Deși notele sunt bune, absențele pot deveni o problemă.";
        }
    }

    // Low grade count warning
    if (gradeCount < 3 && subject.average < 7.5) {
        subjectFeedback.message += ` (Doar ${gradeCount} ${gradeCount === 1 ? 'notă' : 'note'} - situația poate evolua)`;
    }

    return subjectFeedback;
}

// Enhanced subject variance and priority analysis
function analyzeSubjectVariance(subjects, overallAvg) {
    const subjectsWithGrades = subjects.filter(s => s.hasGrades);
    
    if (subjectsWithGrades.length <= 1) {
        return { recommendations: [], priorities: [] };
    }

    const averages = subjectsWithGrades.map(s => s.average);
    const maxAvg = Math.max(...averages);
    const minAvg = Math.min(...averages);
    const variance = maxAvg - minAvg;
    const recommendations = [];
    
    // Identify strongest and weakest subjects
    const sortedSubjects = [...subjectsWithGrades].sort((a, b) => b.average - a.average);
    const strongestSubjects = sortedSubjects.slice(0, 2);
    const weakestSubjects = sortedSubjects.slice(-2).reverse();
    
    const priorities = [];

    // High variance analysis
    if (variance > 3) {
        const strongest = strongestSubjects[0];
        const weakest = weakestSubjects[weakestSubjects.length - 1];
        
        if (overallAvg < 8) {
            recommendations.push(`📊 Performanță neuniformă: Excelent la ${strongest.name} (${strongest.average.toFixed(2)}), dar dificultăți la ${weakest.name} (${weakest.average.toFixed(2)}).`);
            
            // Provide specific priorities
            weakestSubjects.forEach(subject => {
                if (subject.average < 7) {
                    priorities.push({
                        subject: subject.name,
                        average: subject.average,
                        action: 'Prioritate ÎNALTĂ: Concentrează-te pe această materie.'
                    });
                }
            });
        } else {
            recommendations.push(`Performanță variabilă între materii. Punctele tale forte: ${strongestSubjects.map(s => s.name).join(', ')}.`);
        }
        
        // Check if weak subjects are declining
        const decliningWeak = weakestSubjects.filter(s => {
            const trend = calculateTrend(s.grades || []);
            return trend.trend === 'declining';
        });
        
        if (decliningWeak.length > 0) {
            recommendations.push(`🚨 Atenție: ${decliningWeak.map(s => s.name).join(', ')} - performanță slabă ȘI în scădere!`);
        }
    } else if (variance < 1 && overallAvg >= 8) {
        recommendations.push("✅ Consistență remarcabilă la toate materiile! Arată o pregătire echilibrată și maturitate academică.");
    } else if (variance < 1.5 && overallAvg >= 7) {
        recommendations.push("Performanță echilibrată la majoritatea materiilor. Bună abordare generală!");
    }

    // Identify subjects that need immediate attention (low + declining)
    const criticalSubjects = subjectsWithGrades.filter(s => {
        const trend = calculateTrend(s.grades || []);
        return s.average < 6 || (s.average < 7 && trend.trend === 'declining');
    }).sort((a, b) => a.average - b.average);

    if (criticalSubjects.length > 0) {
        recommendations.push(`🎯 Acțiune recomandată: Concentrează-te PRIORITAR pe ${criticalSubjects.slice(0, 2).map(s => `${s.name} (${s.average.toFixed(1)})`).join(' și ')}.`);
    }

    // Identify improving subjects to encourage
    const improvingSubjects = subjectsWithGrades.filter(s => {
        const trend = calculateTrend(s.grades || []);
        return trend.trend === 'improving' && s.average < 9;
    });

    if (improvingSubjects.length > 0 && overallAvg < 8.5) {
        recommendations.push(`💪 Progres vizibil la: ${improvingSubjects.map(s => s.name).join(', ')}. Excelent! Aplică aceeași strategie și la alte materii.`);
    }

    return { recommendations, priorities };
}

// Main feedback generation with comprehensive multi-factor analysis
function generateStudentFeedback(stats, subjects, absencesBySubject) {
    const feedback = {
        overall: '', 
        subjects: [], 
        recommendations: [], 
        tone: 'neutral',
        priorities: [] // New: ordered list of priority actions
    }; 

    const overallAvg = stats.overallAverage || 0; 
    const totalGrades = stats.totalGrades || 0;
    const unmotivatedAbsences = stats.unmotivatedAbsences || 0;
    const motivatedAbsences = stats.motivatedAbsences || 0; 
    const totalAbsences = stats.totalAbsences || 0;

    // Calculate overall trend across all subjects
    const allGrades = [];
    subjects.forEach(subject => {
        if (subject.grades && subject.grades.length > 0) {
            allGrades.push(...subject.grades);
        }
    });
    const overallTrend = calculateTrend(allGrades).trend;
    const overallConsistency = calculateConsistency(allGrades);

    // Generate enhanced overall feedback with trend
    const overallFeedback = generateOverallFeedback(overallAvg, totalGrades, overallTrend, unmotivatedAbsences);
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

    // Generate subject-specific feedback with enhanced analysis
    subjects.forEach(subject => {
        if (subject.hasGrades) {
            feedback.subjects.push(generateSubjectFeedback(subject, absencesBySubject));
        }
    });

    // Sort subjects by priority (highest priority = needs most attention)
    feedback.subjects.sort((a, b) => b.priority - a.priority);

    // Early warning for insufficient data
    if (totalGrades < 3 && stats.totalSubjects > 0) {
        feedback.recommendations.push(`ℹ️ Doar ${totalGrades} ${totalGrades === 1 ? 'notă înregistrată' : 'note înregistrate'}. Mai multe evaluări vor oferi o imagine mai clară.`);
    }

    // Enhanced variance analysis with priorities
    const varianceAnalysis = analyzeSubjectVariance(subjects, overallAvg);
    feedback.recommendations.push(...varianceAnalysis.recommendations);
    feedback.priorities = varianceAnalysis.priorities;

    // Overall consistency feedback
    if (totalGrades >= 5) {
        if (overallConsistency.consistency === 'volatile' && overallAvg < 8) {
            feedback.recommendations.push("📊 Notele tale variază mult. Lucrează la o rutină de studiu mai constantă pentru rezultate mai predictibile.");
        } else if (overallConsistency.consistency === 'very_consistent' && overallAvg >= 7.5) {
            feedback.recommendations.push("✅ Rezultate foarte consistente! Arată disciplină și metodă de lucru stabilă.");
        }
    }

    // Attendance-Performance correlation insight
    if (unmotivatedAbsences > 5 && overallAvg < 7) {
        feedback.recommendations.push("🔗 Corelație detectată: Absențele tale frecvente impactează direct performanța academică. Prezența este esențială!");
    } else if (unmotivatedAbsences === 0 && overallAvg >= 8) {
        feedback.recommendations.push("⭐ Combinație câștigătoare: prezență perfectă + rezultate foarte bune!");
    }

    return feedback; 
}


module.exports = { generateStudentFeedback };