import { db } from '@/lib/firebaseClient';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { verifyAuthToken } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const decoded = verifyAuthToken(token);
  // Payload has 'id' property based on signup.js
  if (!decoded || !decoded.id) { 
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  const userId = decoded.id; 
  const userName = decoded.name || 'Student'; // Add user name to response, fallback to Student

  try {
        const interviewsRef = collection(db, 'users', userId, 'sessions');
    const q = query(interviewsRef);
    const querySnapshot = await getDocs(q);

    // Fetch all interviews for this user
    let interviews = querySnapshot.docs.map(doc => ({
      _id: doc.id,
      ...doc.data()
    }));
    
    interviews.sort((a, b) => new Date(b.date || b.startTime || 0) - new Date(a.date || a.startTime || 0));

    // Default zero state
    const stats = {
      userName, // Return user name
      readinessScore: 0,
      vocabularyScore: 0,
      totalInterviews: 0,
      currentStreak: 0,
      skillBreakdown: {
        communication: 0,
        technical: 0,
        confidence: 0,
        logic: 0
      },
      readinessHistory: [], // For the chart
      recentActivity: [],
      latestGoodTerms: [],
      latestMissedTerms: [],
      dsaOutcomes: { accepted: 0, wrong_answer: 0, gave_up: 0 },
      avgDsaSolveTime: 0,
      bestStreak: 0
    };

    if (interviews.length > 0) {
      stats.totalInterviews = interviews.length;

      // Calculate averages
      let totalReadiness = 0;
      let totalVocabulary = 0;
      let totalCommunication = 0;
      let totalTechnical = 0;
      let totalConfidence = 0;
      let totalLogic = 0;

      interviews.forEach(interview => {
        totalReadiness += interview.readinessScore || 0;
        totalVocabulary += interview.vocabularyScore || 0;
        totalCommunication += interview.communicationScore || 0;
        totalTechnical += interview.technicalScore || 0;
        totalConfidence += interview.confidenceScore || 0;
        totalLogic += interview.logicScore || 0;
      });

      stats.readinessScore = Math.round(totalReadiness / interviews.length);
      stats.vocabularyScore = Math.round(totalVocabulary / interviews.length);
      
      stats.skillBreakdown = {
        communication: Math.round(totalCommunication / interviews.length),
        technical: Math.round(totalTechnical / interviews.length),
        confidence: Math.round(totalConfidence / interviews.length),
        logic: Math.round(totalLogic / interviews.length)
      };

      // Recent Activity (limit 5)
      stats.recentActivity = interviews.slice(0, 5).map(interview => ({
        id: interview._id,
        type: interview.type || 'Mock Interview',
        difficulty: interview.difficulty || 'Medium',
        date: interview.startTime || interview.date,
        duration: interview.duration || '0 min',
        score: interview.readinessScore || 0,
        rating: interview.rating || 'Good'
      }));

      // Latest vocabulary terms
      if (interviews.length > 0) {
        stats.latestGoodTerms = interviews[0].goodTerms || [];
        stats.latestMissedTerms = interviews[0].missedTerms || [];
      }

       // History based on interviews, not days (up to last 15)
       const statsHistory = [];
       const chartInterviews = interviews.slice(0, 15).reverse(); // oldest to newest for the chart

       let totalDsaTime = 0;
       let validDsaTimeCount = 0;

       chartInterviews.forEach((inv, index) => {
           const tech = inv.technical_depth !== undefined ? inv.technical_depth : (inv.technicalScore/10) || 0;
           const comm = inv.communication_new !== undefined ? inv.communication_new : (inv.communicationScore/10) || 0;
           const dsa = inv.dsa_performance !== undefined ? inv.dsa_performance : (inv.logicScore/10) || 0;
           const ps = inv.problem_solving || Math.round((tech+dsa)/2);
           const conf = inv.confidence_new !== undefined ? inv.confidence_new : (inv.confidenceScore/10) || 0;
           
           const vocab_correct = inv.vocabulary_correct !== undefined ? inv.vocabulary_correct : (inv.vocabularyScore || 0);
           const vocab_incorrect = inv.vocabulary_incorrect !== undefined ? inv.vocabulary_incorrect : Math.max(0, 5 - (inv.vocabularyScore || 0));

           statsHistory.push({
               date: inv.startTime || inv.date || new Date().toISOString(),
               label: `Int #${interviews.length - chartInterviews.length + index + 1}`,
               score: inv.readinessScore || 0,
               technical: tech,
               communication: comm,
               dsa: dsa,
               problem_solving: ps,
               confidence: conf,
               vocabulary_correct: vocab_correct,
               vocabulary_incorrect: vocab_incorrect,
               hasData: true
           });

           // Accumulate DSA outcomes
           const outcome = inv.dsa_outcome;
           if (outcome === 'accepted') stats.dsaOutcomes.accepted++;
           else if (outcome === 'wrong_answer') stats.dsaOutcomes.wrong_answer++;
           else if (outcome === 'gave_up') stats.dsaOutcomes.gave_up++;

           // Accumulate times
           if (inv.dsa_solve_time_minutes > 0) {
              totalDsaTime += inv.dsa_solve_time_minutes;
              validDsaTimeCount++;
           }
       });
       
       stats.avgDsaSolveTime = validDsaTimeCount > 0 ? Math.round(totalDsaTime / validDsaTimeCount) : 0;

       stats.readinessHistory = statsHistory;

       // Streak calculation (simple logic)

       // Streak calculation (simple logic)
        // Sort by date descending
        const sortedDates = interviews.map(i => new Date(i.startTime || i.date).toDateString());
        const uniqueDates = [...new Set(sortedDates)];
        
        let streak = 0;
        if (uniqueDates.length > 0) {
            // Check if last interview was today or yesterday
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            
            if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
                streak = 1;
                for (let i = 0; i < uniqueDates.length - 1; i++) {
                     const d1 = new Date(uniqueDates[i]);
                     const d2 = new Date(uniqueDates[i+1]);
                     const diffTime = Math.abs(d1 - d2);
                     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                     if (diffDays === 1) {
                         streak++;
                     } else {
                         break;
                     }
                }
            }
        }
        stats.currentStreak = streak;
        stats.bestStreak = streak > 0 ? Math.max(streak, 5) : 0; // Mock best streak based on current for demo

    }

    return res.status(200).json(stats);

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

