import { useState, useEffect, useCallback } from 'react';
import { learningPathAPI } from '../services/api';

const DEFAULT_TOPICS = [
  {
    id: 'topic-1',
    name: 'Foundational Python & Math',
    quizScore: 94,
    lesson: { title: 'Linear Algebra & Vectorized Python', minutes: 45, problems: 8 },
    reason: 'Strong baseline verified in your diagnostic assessment.',
  },
  {
    id: 'topic-2',
    name: 'Data Structures & Trees',
    quizScore: 88,
    lesson: { title: 'Balanced Trees, Graphs & Traversal', minutes: 50, problems: 10 },
    reason: 'Demonstrated solid algorithmic foundation; trees and graph modeling mastered.',
  },
  {
    id: 'topic-3',
    name: 'Statistical Learning',
    quizScore: 91,
    lesson: { title: 'Probability Distributions & Hypothesis Testing', minutes: 40, problems: 6 },
    reason: 'Essential prerequisite for regression and probabilistic ML models.',
  },
  {
    id: 'topic-4',
    name: 'Classical Machine Learning',
    quizScore: 92,
    lesson: { title: 'Ensemble Methods & Gradient Boosting', minutes: 55, problems: 9 },
    reason: 'Quiz score of 92% unlocked deep learning architectures.',
  },
  {
    id: 'topic-5',
    name: 'Deep Learning & PyTorch',
    quizScore: null,
    lesson: { title: 'Multi-Head Attention & Transformer Internals', minutes: 60, problems: 12 },
    reason: 'AI selected this topic to close the gap on modern transformer architectures.',
  },
  {
    id: 'topic-6',
    name: 'NLP & Large Language Models',
    quizScore: null,
    lesson: { title: 'Prompt Engineering, RAG & Vector Stores', minutes: 50, problems: 7 },
    reason: 'Crucial requirement for industry AI workflows and intelligent agents.',
  },
  {
    id: 'topic-7',
    name: 'Autonomous Agents & Tools',
    quizScore: null,
    lesson: { title: 'Agent Loops, Memory & Tool Invocation', minutes: 65, problems: 10 },
    reason: 'Recommended to bridge theoretical ML with autonomous execution systems.',
  },
  {
    id: 'topic-8',
    name: 'Production AI & System Design',
    quizScore: null,
    lesson: { title: 'Scalable Model Serving, Latency & CI/CD', minutes: 75, problems: 8 },
    reason: 'Capstone milestone preparing you for senior technical interviews.',
  },
];

// Helper to read CSS variables
export function getThemeColorsFromDOM() {
  if (typeof window === 'undefined') {
    return {
      paper: '#F4F7FC',
      ink: '#12203A',
      muted: '#56657F',
      line: '#DCE3F0',
      blue: '#2F5BFF',
      amber: '#F2A31B',
      futureGrey: '#C6D0E2',
    };
  }

  const styles = getComputedStyle(document.documentElement);
  return {
    paper: styles.getPropertyValue('--paper').trim() || '#F4F7FC',
    ink: styles.getPropertyValue('--ink').trim() || '#12203A',
    muted: styles.getPropertyValue('--muted').trim() || '#56657F',
    line: styles.getPropertyValue('--line').trim() || '#DCE3F0',
    blue: styles.getPropertyValue('--blue').trim() || '#2F5BFF',
    amber: styles.getPropertyValue('--amber').trim() || '#F2A31B',
    futureGrey: styles.getPropertyValue('--future-grey').trim() || '#C6D0E2',
  };
}

export function useProgress() {
  const [topics, setTopics] = useState(DEFAULT_TOPICS);
  const [progress, setProgress] = useState(4.62);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'light';
  });
  const [themeColors, setThemeColors] = useState(getThemeColorsFromDOM);

  // Sync theme attribute on <html>
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('app-theme', theme);
    setThemeColors(getThemeColorsFromDOM());
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Fetch progress model from backend API
  const fetchProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await learningPathAPI.getProgressModel();
      if (res.data) {
        if (Array.isArray(res.data.topics) && res.data.topics.length > 0) {
          setTopics(res.data.topics);
        }
        if (typeof res.data.progress === 'number') {
          setProgress(res.data.progress);
        }
      }
    } catch (err) {
      console.warn('Using default progress data (API returned error):', err);
      // Keep default calibrated data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    topics,
    progress,
    loading,
    error,
    hoveredIndex,
    setHoveredIndex,
    theme,
    toggleTheme,
    themeColors,
    refreshProgress: fetchProgress,
  };
}

export default useProgress;
