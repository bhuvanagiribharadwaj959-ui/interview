import React from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  BrainCircuit,
  ChevronLeft,
  Code2,
  Languages,
  MessageSquare,
  RefreshCw,
  Sparkles,
  TrendingUp,
  User,
  X,
} from 'lucide-react';

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

const normalizeTenPointScore = (value, fallback = 50) => {
  if (value === null || value === undefined) {
    return fallback;
  }

  return clampScore(value * 10);
};

const average = (values) => {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const buildSeries = (anchor, offsets) => offsets.map((offset) => clampScore(anchor + offset));

const getBand = (score) => {
  if (score >= 85) return 'Elite';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Promising';
  if (score >= 45) return 'Developing';
  return 'Needs Work';
};

const formatDuration = (startTime, endTime) => {
  const seconds = Math.max(0, Math.round((endTime - startTime) / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const Sparkline = ({ values }) => {
  const width = 220;
  const height = 86;
  const padding = 8;
  const stepX = values.length > 1 ? (width - padding * 2) / (values.length - 1) : width - padding * 2;

  const points = values.map((value, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((value / 100) * (height - padding * 2));
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? width - padding} ${height - padding} L ${points[0]?.x ?? padding} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="perf-sparkline" preserveAspectRatio="none">
      <defs>
        <linearGradient id="perfSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(95, 150, 255, 0.35)" />
          <stop offset="100%" stopColor="rgba(95, 150, 255, 0.02)" />
        </linearGradient>
      </defs>
      {[20, 40, 60, 80].map((level) => {
        const y = height - padding - ((level / 100) * (height - padding * 2));
        return <line key={level} x1={padding} y1={y} x2={width - padding} y2={y} className="perf-sparkline-grid" />;
      })}
      <path d={areaPath} fill="url(#perfSparkFill)" />
      <path d={linePath} className="perf-sparkline-line" />
      {points.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="3.5" className="perf-sparkline-point" />
      ))}
    </svg>
  );
};

const OverallChart = ({ values, labels }) => {
  const width = 680;
  const height = 260;
  const left = 36;
  const right = 16;
  const top = 16;
  const bottom = 34;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const stepX = values.length > 1 ? innerWidth / (values.length - 1) : innerWidth;

  const points = values.map((value, index) => {
    const x = left + index * stepX;
    const y = top + innerHeight - ((value / 100) * innerHeight);
    return { x, y };
  });

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? width - right} ${top + innerHeight} L ${points[0]?.x ?? left} ${top + innerHeight} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="perf-overall-chart" preserveAspectRatio="none">
      <defs>
        <linearGradient id="perfOverallFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(96, 165, 250, 0.35)" />
          <stop offset="100%" stopColor="rgba(96, 165, 250, 0.02)" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((level) => {
        const y = top + innerHeight - ((level / 100) * innerHeight);
        return (
          <g key={level}>
            <line x1={left} y1={y} x2={width - right} y2={y} className="perf-overall-grid" />
            <text x="6" y={y + 4} className="perf-overall-axis">{level}</text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#perfOverallFill)" />
      <path d={linePath} className="perf-overall-line" />
      {points.map((point, index) => (
        <g key={labels[index]}>
          <circle cx={point.x} cy={point.y} r="5" className="perf-overall-point" />
          <text x={point.x} y={height - 8} textAnchor="middle" className="perf-overall-label">{labels[index]}</text>
        </g>
      ))}
    </svg>
  );
};

const FactorCard = ({ title, hint, score, values, icon }) => (
  <div className="perf-factor-card">
    <div className="perf-factor-head">
      <div>
        <p className="perf-factor-title">{title}</p>
        <p className="perf-factor-hint">{hint}</p>
      </div>
      <div className="perf-factor-icon">{icon}</div>
    </div>
    <div className="perf-factor-score-row">
      <span className="perf-factor-score">{score}</span>
      <span className="perf-factor-scale">/100</span>
      <span className="perf-factor-band">{getBand(score)}</span>
    </div>
    <Sparkline values={values} />
  </div>
);

export const PerformanceAnalysis = ({
  data,
  onClose = undefined,
  onEndInterview = undefined,
  onRestart = undefined,
  questions = [],
  scores = null,
  mode = 'modal',
}) => {
  const vocabulary = scores?.vocabulary ?? normalizeTenPointScore(data.vocabularyScore, 52);
  const coding = scores?.coding ?? normalizeTenPointScore(data.codingScore, 50);
  const logic = scores?.logic ?? clampScore((((data.codingScore ?? 5) + (data.interviewScore ?? 5)) / 2) * 10);
  const confidence = normalizeTenPointScore(data.confidenceScore, 58);
  const responsiveness = clampScore((data.questionsAnswered / Math.max(data.questionsAsked, 1)) * 100);
  const communication = clampScore(average([vocabulary, confidence]));
  const consistency = clampScore(average([responsiveness, communication, logic]));
  const overall = clampScore(average([vocabulary, coding, logic, communication, consistency]));

  const overallSeries = [
    clampScore(average([communication, responsiveness]) - 8),
    communication,
    clampScore(average([logic, communication])),
    coding,
    overall,
  ];
  const overallLabels = ['Intro', 'Clarity', 'Reasoning', 'Coding', 'Final'];

  const factorCards = [
    {
      title: 'Vocabulary',
      hint: 'Communication strength from spoken answers and clarity.',
      score: vocabulary,
      values: buildSeries(vocabulary, [-16, -10, -4, 0, 3]),
      icon: <Languages size={18} />,
    },
    {
      title: 'Logic Building',
      hint: 'Problem-solving structure across coding and written reasoning.',
      score: logic,
      values: buildSeries(logic, [-18, -9, -3, 2, 4]),
      icon: <BrainCircuit size={18} />,
    },
    {
      title: 'Coding & Writing',
      hint: 'Technical execution shaped by coding attempts and articulation.',
      score: clampScore(average([coding, logic])),
      values: buildSeries(clampScore(average([coding, logic])), [-14, -7, -3, 1, 5]),
      icon: <Code2 size={18} />,
    },
    {
      title: 'Other Factors',
      hint: 'Confidence, responsiveness, and consistency affecting outcomes.',
      score: clampScore(average([confidence, responsiveness, consistency])),
      values: buildSeries(clampScore(average([confidence, responsiveness, consistency])), [-12, -6, -2, 2, 4]),
      icon: <Sparkles size={18} />,
    },
  ];

  const highlightMetrics = [
    { label: 'Overall rating', value: `${overall}/100` },
    { label: 'Answered', value: `${data.questionsAnswered}/${data.questionsAsked}` },
    { label: 'Words used', value: data.wordsSpoken.toString() },
    { label: 'Coding attempts', value: data.codingAttempted.toString() },
  ];

  const marketRange = Math.max(data.lpa.max - data.lpa.min, 1);
  const marketPosition = Math.max(0, Math.min(100, ((data.lpa.expected - data.lpa.min) / marketRange) * 100));

  const content = (
    <motion.section
      className={`perf-shell perf-shell-${mode}`}
      initial={{ opacity: 0, y: mode === 'modal' ? 32 : 16, scale: mode === 'modal' ? 0.98 : 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div className="perf-topbar">
        <div className="perf-topbar-left">
          {onClose && (
            <button className="perf-ghost-btn" onClick={onClose}>
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <span className="perf-badge">Performance</span>
          <span className="perf-badge perf-badge-muted">Interview Analytics</span>
        </div>
        <div className="perf-topbar-right">
          {mode === 'page' && onRestart && (
            <button className="perf-ghost-btn" onClick={onRestart}>
              <RefreshCw size={16} /> New Interview
            </button>
          )}
          {mode === 'modal' && onClose && (
            <button className="perf-icon-btn" onClick={onClose} aria-label="Close performance analysis">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="perf-hero-grid">
        <div className="perf-panel perf-hero-card">
          <div className="perf-section-heading">
            <div>
              <p className="perf-section-kicker">Performance</p>
              <h2 className="perf-section-title">Overall performance rating</h2>
            </div>
            <div className="perf-score-pill">
              <span className="perf-score-pill-value">{overall}</span>
              <span className="perf-score-pill-label">/100</span>
            </div>
          </div>
          <p className="perf-section-copy">
            A combined view of communication, logic building, coding strength, and interview consistency.
          </p>
          <OverallChart values={overallSeries} labels={overallLabels} />
        </div>

        <div className="perf-panel perf-side-summary">
          <div className="perf-side-summary-header">
            <div>
              <p className="perf-section-kicker">Snapshot</p>
              <h3 className="perf-side-title">Session impact</h3>
            </div>
            <TrendingUp size={18} className="perf-side-icon" />
          </div>
          <div className="perf-metric-grid">
            {highlightMetrics.map((metric) => (
              <div key={metric.label} className="perf-metric-tile">
                <span className="perf-metric-value">{metric.value}</span>
                <span className="perf-metric-label">{metric.label}</span>
              </div>
            ))}
          </div>

          <div className="perf-market-card">
            <div className="perf-market-top">
              <div>
                <p className="perf-market-label">Estimated market value</p>
                <p className="perf-market-value">₹{data.lpa.expected} LPA</p>
              </div>
              <span className="perf-market-band">{getBand(overall)}</span>
            </div>
            <div className="perf-market-track">
              <div className="perf-market-fill" style={{ width: `${marketPosition}%` }} />
              <div className="perf-market-marker" style={{ left: `${marketPosition}%` }} />
            </div>
            <div className="perf-market-range">
              <span>₹{data.lpa.min}L</span>
              <span>₹{data.lpa.max}L</span>
            </div>
          </div>

          {scores?.summary && (
            <div className="perf-brief-card">
              <p className="perf-brief-title">AI summary</p>
              <p className="perf-brief-copy">{scores.summary}</p>
            </div>
          )}
        </div>
      </div>

      <div className="perf-factor-grid">
        {factorCards.map((card) => (
          <FactorCard
            key={card.title}
            title={card.title}
            hint={card.hint}
            score={card.score}
            values={card.values}
            icon={card.icon}
          />
        ))}
      </div>

      <div className="perf-lower-grid">
        <div className="perf-panel perf-insights-card">
          <div className="perf-insights-head">
            <div>
              <p className="perf-section-kicker">Interview signals</p>
              <h3 className="perf-side-title">What affected the outcome</h3>
            </div>
            <MessageSquare size={18} className="perf-side-icon" />
          </div>
          <div className="perf-insight-list">
            <div className="perf-insight-item">
              <span className="perf-insight-name">Communication readiness</span>
              <span className="perf-insight-score">{communication}/100</span>
            </div>
            <div className="perf-insight-item">
              <span className="perf-insight-name">Response consistency</span>
              <span className="perf-insight-score">{consistency}/100</span>
            </div>
            <div className="perf-insight-item">
              <span className="perf-insight-name">Confidence under pressure</span>
              <span className="perf-insight-score">{confidence}/100</span>
            </div>
            <div className="perf-insight-item">
              <span className="perf-insight-name">Answer completion rate</span>
              <span className="perf-insight-score">{responsiveness}/100</span>
            </div>
          </div>
        </div>

        <div className="perf-panel perf-insights-card">
          <div className="perf-insights-head">
            <div>
              <p className="perf-section-kicker">Coaching</p>
              <h3 className="perf-side-title">Focus areas</h3>
            </div>
            <BrainCircuit size={18} className="perf-side-icon" />
          </div>
          <div className="perf-pill-list">
            {(scores?.strengths?.length ? scores.strengths : ['Stayed engaged through the interview', 'Maintained answer continuity', 'Handled a mix of oral and coding prompts']).map((item) => (
              <span key={`strength-${item}`} className="perf-pill perf-pill-positive">{item}</span>
            ))}
          </div>
          <div className="perf-pill-list">
            {(scores?.weaknesses?.length ? scores.weaknesses : ['Sharpen examples with more precise technical wording', 'Make coding explanations more structured', 'Close answers with clearer conclusions']).map((item) => (
              <span key={`weakness-${item}`} className="perf-pill perf-pill-warning">{item}</span>
            ))}
          </div>
          {scores?.recommendations?.length ? (
            <div className="perf-recommendations">
              {scores.recommendations.map((item) => (
                <div key={item} className="perf-recommendation-row">{item}</div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="perf-panel perf-history-card">
        <div className="perf-history-head">
          <div>
            <p className="perf-section-kicker">History</p>
            <h3 className="perf-section-title">AI and user conversation</h3>
          </div>
          <span className="perf-history-count">{questions.length} exchanges</span>
        </div>

        {questions.length ? (
          <div className="perf-history-list">
            {questions.map((entry, index) => (
              <div key={`${entry.startTime}-${index}`} className="perf-history-row">
                <div className="perf-chat-bubble perf-chat-bubble-ai">
                  <div className="perf-chat-meta">
                    <span className="perf-chat-person"><Bot size={14} /> AI Question</span>
                    <span className="perf-chat-tag">{entry.type === 'coding' ? 'Coding' : 'Communication'}</span>
                  </div>
                  <p className="perf-chat-text">{entry.question}</p>
                </div>
                <div className="perf-chat-bubble perf-chat-bubble-user">
                  <div className="perf-chat-meta perf-chat-meta-user">
                    <span className="perf-chat-person"><User size={14} /> User Answer</span>
                    <span className="perf-chat-time">{formatDuration(entry.startTime, entry.endTime)} · {entry.wordCount} words</span>
                  </div>
                  <p className="perf-chat-text">{entry.answer}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="perf-history-empty">The conversation history will appear here once the interview has enough exchanges.</div>
        )}
      </div>

      {(onEndInterview || onRestart) && (
        <div className="perf-action-row">
          {onEndInterview && (
            <button className="perf-primary-btn" onClick={onEndInterview}>
              End Interview and Save Report
            </button>
          )}
          {mode === 'page' && onRestart && (
            <button className="perf-secondary-btn" onClick={onRestart}>
              Start Another Interview
            </button>
          )}
        </div>
      )}
    </motion.section>
  );

  if (mode === 'page') {
    return <div className="perf-page">{content}</div>;
  }

  return <motion.div className="perf-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{content}</motion.div>;
};

export default PerformanceAnalysis;