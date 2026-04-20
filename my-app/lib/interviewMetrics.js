export function computePerformanceData({ questions = [], resumeAnalysis = null }) {
  const codingQuestions = questions.filter((question) => question.type === 'coding');
  const answeredQuestions = questions.filter(
    (question) => question.answer !== '(Skipped)' && question.answer !== '(No answer)'
  );
  const totalWords = questions.reduce((sum, question) => sum + (question.wordCount || 0), 0);

  const interviewScore = questions.length > 0
    ? Math.min(10, 5 + (answeredQuestions.length / Math.max(questions.length, 1)) * 5)
    : null;
  const codingScore = codingQuestions.length > 0
    ? Math.min(10, 5 + (codingQuestions.filter((question) => question.answer !== '(Skipped)').length / Math.max(codingQuestions.length, 1)) * 5)
    : null;
  const vocabularyScore = totalWords > 0
    ? Math.min(10, 5 + Math.min(totalWords / 100, 5))
    : null;
  const confidenceScore = answeredQuestions.length > 0
    ? Math.min(10, 6 + (answeredQuestions.length / Math.max(questions.length, 1)) * 4)
    : null;

  const validScores = [interviewScore, codingScore, vocabularyScore, confidenceScore].filter((score) => score !== null);
  const avgScore = validScores.length > 0
    ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
    : 5;

  const level = resumeAnalysis?.level || 'mid';
  const baseLPA = level === 'senior' ? 25 : level === 'junior' ? 5 : 12;
  const expectedLPA = Math.round(baseLPA * (avgScore / 7) * 10) / 10;

  return {
    interviewScore: interviewScore !== null ? Math.round(interviewScore * 10) / 10 : null,
    codingScore: codingScore !== null ? Math.round(codingScore * 10) / 10 : null,
    vocabularyScore: vocabularyScore !== null ? Math.round(vocabularyScore * 10) / 10 : null,
    confidenceScore: confidenceScore !== null ? Math.round(confidenceScore * 10) / 10 : null,
    questionsAsked: questions.length,
    questionsAnswered: answeredQuestions.length,
    codingAttempted: codingQuestions.filter((question) => question.answer !== '(Skipped)').length,
    wordsSpoken: totalWords,
    lpa: {
      min: Math.max(3, Math.round(expectedLPA * 0.7 * 10) / 10),
      max: Math.round(expectedLPA * 1.4 * 10) / 10,
      expected: expectedLPA,
    },
  };
}