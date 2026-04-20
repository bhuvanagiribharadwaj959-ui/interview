import { getDb } from '@/lib/mongodb';
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
    const db = await getDb();
    const interviewsCollection = db.collection('interviews');

    // Fetch all interviews for this user
    const interviews = await interviewsCollection.find({ userId: userId }).sort({ date: -1 }).toArray();

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
      recentActivity: []
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

       // History (Last 7 days ending today)
       // Always generate history structure regardless of interviews count
       const statsHistory = [];
       const today = new Date();
       // Generate last 7 days
       for (let i = 6; i >= 0; i--) {
           const d = new Date(today);
           d.setDate(today.getDate() - i);
           const dateStr = d.toDateString();
           
           // Find interviews for this specific day
           const dailyInterviews = interviews.filter(inv => {
               const invDate = new Date(inv.startTime || inv.date);
               return invDate.toDateString() === dateStr;
           });
           
           if (dailyInterviews.length > 0) {
               const avgReadiness = Math.round(dailyInterviews.reduce((acc, curr) => acc + (curr.readinessScore || 0), 0) / dailyInterviews.length);
               const avgComm = Math.round(dailyInterviews.reduce((acc, curr) => acc + (curr.communicationScore || 0), 0) / dailyInterviews.length);
               const avgTech = Math.round(dailyInterviews.reduce((acc, curr) => acc + (curr.technicalScore || 0), 0) / dailyInterviews.length);
               const avgConf = Math.round(dailyInterviews.reduce((acc, curr) => acc + (curr.confidenceScore || 0), 0) / dailyInterviews.length);
               const avgLogic = Math.round(dailyInterviews.reduce((acc, curr) => acc + (curr.logicScore || 0), 0) / dailyInterviews.length);
               
               statsHistory.push({ 
                   date: d.toISOString(),
                   score: avgReadiness,
                   communication: avgComm,
                   technical: avgTech,
                   confidence: avgConf,
                   logic: avgLogic,
                   hasData: true 
               });
           } else {
               statsHistory.push({ date: d.toISOString(), score: 0, communication:0, technical:0, confidence:0, logic:0, hasData: false });
           }
       }
       stats.readinessHistory = statsHistory;

       // Streak calculation (simple logic)

       // Streak calculation (simple logic)
        // Sort by date descending
        const sortedDates = interviews.map(i => new Date(i.date).toDateString());
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

    }

    return res.status(200).json(stats);

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
