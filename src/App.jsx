import { useState, useEffect } from 'react';
import { BookOpen, BarChart3, Search, ChevronRight, RotateCcw, Lock, Star, FileText, Trash2 } from 'lucide-react';
import { marked } from 'marked';
import QUIZ_DATA from './data/quizData.json';
import THEORY_0_MD from './data/theory-0.md?raw';
import THEORY_1_MD from './data/theory-1.md?raw';
import THEORY_2_MD from './data/theory-2.md?raw';
import THEORY_3_MD from './data/theory-3.md?raw';
import THEORY_4_MD from './data/theory-4.md?raw';
import THEORY_5_MD from './data/theory-5.md?raw';

const THEORY_HTML = {
  0: marked.parse(THEORY_0_MD),
  1: marked.parse(THEORY_1_MD),
  2: marked.parse(THEORY_2_MD),
  3: marked.parse(THEORY_3_MD),
  4: marked.parse(THEORY_4_MD),
  5: marked.parse(THEORY_5_MD),
};

const GLOSSARY_QUIZ_LENGTH = 15;

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function optionStateClasses(selected, submitted, correct) {
  if (submitted && correct) return 'border-emerald-500 bg-emerald-500/15';
  if (submitted && selected && !correct) return 'border-red-500 bg-red-500/15';
  if (selected) return 'border-indigo-500 bg-indigo-500/10';
  return 'border-slate-700 hover:border-indigo-500/50';
}

function TickBar({ percent, width = 24, filledClass = 'text-indigo-400', emptyClass = 'text-slate-600' }) {
  const p = Math.min(100, Math.max(0, percent || 0));
  const filled = Math.round((p / 100) * width);
  return (
    <span className="font-mono text-[11px] sm:text-xs tracking-tight select-none whitespace-nowrap">
      <span className="text-slate-600">[</span>
      <span className={filledClass}>{'█'.repeat(filled)}</span>
      <span className={emptyClass}>{'·'.repeat(width - filled)}</span>
      <span className="text-slate-600">]</span>
    </span>
  );
}

function ResultBadge({ correct }) {
  return (
    <span
      className={`font-mono text-xs font-bold tracking-wider px-2 py-0.5 rounded border ${
        correct
          ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
          : 'text-red-400 border-red-500/40 bg-red-500/10'
      }`}
    >
      {correct ? 'PASS' : 'FAIL'}
    </span>
  );
}

function loadSavedProgress() {
  try {
    const saved = localStorage.getItem('istqb_progress');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function isAnswerCorrect(question, userAnswer) {
  if (question.multiSelect) {
    if (!Array.isArray(userAnswer)) return false;
    const sortedUser = [...userAnswer].sort();
    const sortedCorrect = [...question.correct].sort();
    return sortedUser.length === sortedCorrect.length &&
      sortedUser.every((v, i) => v === sortedCorrect[i]);
  }
  return userAnswer === question.correct;
}

function shuffleQuestionOptions(question) {
  const order = shuffle(question.options.map((_, i) => i));
  return {
    options: order.map(i => question.options[i]),
    correct: question.multiSelect
      ? question.correct.map(c => order.indexOf(c))
      : order.indexOf(question.correct),
  };
}

function applyShuffle(question, shuffledOptions) {
  const override = shuffledOptions[question.id];
  return override ? { ...question, ...override } : question;
}

function computeStats(answers, submittedIds, shuffledOptions) {
  let total = 0, correct = 0, points = 0, maxPoints = 0;
  for (const q of QUIZ_DATA.questions) {
    if (!submittedIds[q.id]) continue;
    total++;
    maxPoints += q.points;
    if (isAnswerCorrect(applyShuffle(q, shuffledOptions), answers[q.id])) {
      correct++;
      points += q.points;
    }
  }
  return { total, correct, points, maxPoints };
}

function buildGlossaryQuiz() {
  const terms = shuffle(QUIZ_DATA.glossary).slice(0, Math.min(GLOSSARY_QUIZ_LENGTH, QUIZ_DATA.glossary.length));
  return terms.map((item) => {
    const distractors = shuffle(
      QUIZ_DATA.glossary.filter((g) => g.term !== item.term)
    ).slice(0, 3).map((g) => g.definition);
    const options = shuffle([item.definition, ...distractors]);
    return {
      term: item.term,
      options,
      correct: options.indexOf(item.definition),
    };
  });
}

const PAGE_BG = 'bg-gradient-to-br from-deep via-deep to-indigo-950';
const CARD = 'bg-surface border border-line backdrop-blur-sm';
const CARD_HOVER = 'hover:border-indigo-500/50';
const BACK_BTN = 'px-4 py-2 bg-surface border border-line rounded-lg shadow hover:border-indigo-500/40 text-muted font-mono text-sm transition';

const FONT_SCALES = [100, 112, 125, 140, 155];
const FONT_SCALE_KEY = 'istqb_font_scale';

function FontSizeControl({ scaleIdx, onChange }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 bg-surface border border-line rounded-lg shadow-xl p-1 font-mono">
      <button
        onClick={() => onChange(Math.max(0, scaleIdx - 1))}
        disabled={scaleIdx === 0}
        aria-label="Schrift verkleinern"
        className="w-9 h-9 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-line disabled:opacity-30 disabled:hover:bg-transparent transition text-sm"
      >
        A−
      </button>
      <span className="px-1 text-xs text-muted tabular-nums w-9 text-center">{FONT_SCALES[scaleIdx]}%</span>
      <button
        onClick={() => onChange(Math.min(FONT_SCALES.length - 1, scaleIdx + 1))}
        disabled={scaleIdx === FONT_SCALES.length - 1}
        aria-label="Schrift vergrößern"
        className="w-9 h-9 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-line disabled:opacity-30 disabled:hover:bg-transparent transition text-base"
      >
        A+
      </button>
    </div>
  );
}

export default function ISTQBQuizApp() {
  const [view, setView] = useState('home');
  const [currentChapter, setCurrentChapter] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [retryQuestionIds, setRetryQuestionIds] = useState(null);
  const [answers, setAnswers] = useState(() => loadSavedProgress()?.answers || {});
  const [submittedIds, setSubmittedIds] = useState(() => loadSavedProgress()?.submittedIds || {});
  const [shuffledOptions, setShuffledOptions] = useState(() => loadSavedProgress()?.shuffledOptions || {});
  const [searchGlossary, setSearchGlossary] = useState('');
  const stats = computeStats(answers, submittedIds, shuffledOptions);
  const [glossaryQuiz, setGlossaryQuiz] = useState([]);
  const [glossaryQuizIdx, setGlossaryQuizIdx] = useState(0);
  const [glossaryAnswer, setGlossaryAnswer] = useState(null);
  const [glossarySubmitted, setGlossarySubmitted] = useState(false);
  const [glossaryScore, setGlossaryScore] = useState({ correct: 0, total: 0 });
  const [fontScaleIdx, setFontScaleIdx] = useState(() => {
    const saved = parseInt(localStorage.getItem(FONT_SCALE_KEY), 10);
    const idx = FONT_SCALES.indexOf(saved);
    return idx !== -1 ? idx : 0;
  });

  // Schriftgröße anwenden und speichern
  useEffect(() => {
    document.documentElement.style.fontSize = `${FONT_SCALES[fontScaleIdx]}%`;
    localStorage.setItem(FONT_SCALE_KEY, String(FONT_SCALES[fontScaleIdx]));
  }, [fontScaleIdx]);

  // Fortschritt speichern
  useEffect(() => {
    localStorage.setItem('istqb_progress', JSON.stringify({
      answers,
      submittedIds,
      shuffledOptions,
      timestamp: new Date().toISOString()
    }));
  }, [answers, submittedIds, shuffledOptions]);

  const handleAnswer = (question, optionIndex) => {
    if (submittedIds[question.id]) return;
    if (question.multiSelect) {
      setAnswers(prev => {
        const current = prev[question.id] || [];
        const next = current.includes(optionIndex)
          ? current.filter(i => i !== optionIndex)
          : [...current, optionIndex];
        return { ...prev, [question.id]: next };
      });
    } else {
      setAnswers(prev => ({ ...prev, [question.id]: optionIndex }));
    }
  };

  const handleSubmitQuestion = () => {
    const q = chapQuestions[currentQuestionIdx];
    setSubmittedIds(prev => ({ ...prev, [q.id]: true }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < chapQuestions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      setView('home');
      setCurrentChapter(null);
      setCurrentQuestionIdx(0);
      setRetryQuestionIds(null);
    }
  };

  const handleRetryQuestion = (questionId) => {
    const question = QUIZ_DATA.questions.find(q => q.id === questionId);
    setAnswers(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setSubmittedIds(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setShuffledOptions(prev => ({ ...prev, [questionId]: shuffleQuestionOptions(question) }));
  };

  const resetProgress = () => {
    if (confirm('Fortschritt wirklich zurücksetzen?')) {
      setAnswers({});
      setSubmittedIds({});
      setShuffledOptions({});
      localStorage.removeItem('istqb_progress');
    }
  };

  const handleDeleteChapterResults = (chapId) => {
    if (!confirm('Auswertung für dieses Kapitel wirklich löschen?')) return;
    const ids = QUIZ_DATA.questions.filter(q => q.chapter === chapId).map(q => q.id);
    setAnswers(prev => {
      const next = { ...prev };
      ids.forEach(id => delete next[id]);
      return next;
    });
    setSubmittedIds(prev => {
      const next = { ...prev };
      ids.forEach(id => delete next[id]);
      return next;
    });
    setShuffledOptions(prev => {
      const next = { ...prev };
      ids.forEach(id => delete next[id]);
      return next;
    });
  };

  const handleStartChapter = (chapId) => {
    setCurrentChapter(chapId);
    setCurrentQuestionIdx(0);
    setRetryQuestionIds(null);
    setView('quiz');
  };

  const handleRetryWrongAnswers = (chapId) => {
    const wrongQuestions = QUIZ_DATA.questions
      .filter(q => q.chapter === chapId && submittedIds[q.id] && !isAnswerCorrect(applyShuffle(q, shuffledOptions), answers[q.id]));
    if (wrongQuestions.length === 0) return;
    const wrongIds = wrongQuestions.map(q => q.id);
    setAnswers(prev => {
      const next = { ...prev };
      wrongIds.forEach(id => delete next[id]);
      return next;
    });
    setSubmittedIds(prev => {
      const next = { ...prev };
      wrongIds.forEach(id => delete next[id]);
      return next;
    });
    setShuffledOptions(prev => {
      const next = { ...prev };
      wrongQuestions.forEach(q => { next[q.id] = shuffleQuestionOptions(q); });
      return next;
    });
    setRetryQuestionIds(wrongIds);
    setCurrentChapter(chapId);
    setCurrentQuestionIdx(0);
    setView('quiz');
  };

  const handleOpenTheory = (chapId) => {
    setCurrentChapter(chapId);
    setView('theory');
  };

  const startGlossaryQuiz = () => {
    setGlossaryQuiz(buildGlossaryQuiz());
    setGlossaryQuizIdx(0);
    setGlossaryAnswer(null);
    setGlossarySubmitted(false);
    setGlossaryScore({ correct: 0, total: 0 });
    setView('glossaryQuiz');
  };

  const handleGlossaryAnswer = (idx) => {
    if (!glossarySubmitted) setGlossaryAnswer(idx);
  };

  const handleGlossarySubmit = () => {
    const q = glossaryQuiz[glossaryQuizIdx];
    const isCorrect = glossaryAnswer === q.correct;
    setGlossaryScore(prev => ({
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      total: prev.total + 1
    }));
    setGlossarySubmitted(true);
  };

  const handleGlossaryNext = () => {
    setGlossaryQuizIdx(prev => prev + 1);
    setGlossaryAnswer(null);
    setGlossarySubmitted(false);
  };

  // Filter Glossar
  const filteredGlossary = QUIZ_DATA.glossary.filter(item =>
    item.term.toLowerCase().includes(searchGlossary.toLowerCase()) ||
    item.definition.toLowerCase().includes(searchGlossary.toLowerCase())
  );

  const chapQuestions = retryQuestionIds
    ? QUIZ_DATA.questions.filter(q => retryQuestionIds.includes(q.id))
    : QUIZ_DATA.questions.filter(q => q.chapter === currentChapter);
  const rawCurrentQuestion = chapQuestions[currentQuestionIdx];
  const currentQuestion = rawCurrentQuestion ? applyShuffle(rawCurrentQuestion, shuffledOptions) : rawCurrentQuestion;
  const isPremium = !QUIZ_DATA.chapters[currentChapter]?.free;

  function renderView() {
  // HOME VIEW
  if (view === 'home') {
    return (
      <div className={`min-h-screen ${PAGE_BG}`}>
        <header className="bg-deep/80 backdrop-blur border-b border-line">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-indigo-400" />
                <h1 className="font-display text-3xl font-bold text-ink tracking-tight">ISTQB CT-GenAI</h1>
              </div>
              <button
                onClick={() => setView('stats')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/20 transition"
              >
                <BarChart3 className="w-5 h-5" />
                Statistik
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <div className={`${CARD} rounded-lg p-6`}>
              <div className="font-mono text-xs uppercase tracking-wide text-muted">Beantwortet</div>
              <div className="font-display text-4xl font-bold text-indigo-400">{stats.total}</div>
            </div>
            <div className={`${CARD} rounded-lg p-6`}>
              <div className="font-mono text-xs uppercase tracking-wide text-muted">Richtig</div>
              <div className="font-display text-4xl font-bold text-emerald-400 mb-1">{stats.correct}</div>
              <TickBar percent={stats.total > 0 ? (stats.correct / stats.total) * 100 : 0} width={16} filledClass="text-emerald-400" />
            </div>
            <div className={`${CARD} rounded-lg p-6`}>
              <div className="font-mono text-xs uppercase tracking-wide text-muted">Punkte</div>
              <div className="font-display text-4xl font-bold text-indigo-400">{stats.points}/{stats.maxPoints}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <button
              onClick={() => setView('glossary')}
              className={`${CARD} ${CARD_HOVER} rounded-lg p-8 transition text-left`}
            >
              <BookOpen className="w-8 h-8 text-indigo-400 mb-3" />
              <h3 className="font-display text-xl font-bold mb-2 text-ink">Glossar</h3>
              <p className="text-muted">{QUIZ_DATA.glossary.length} Begriffe durchsuchen</p>
            </button>
            <button
              onClick={resetProgress}
              className={`${CARD} ${CARD_HOVER} rounded-lg p-8 transition text-left`}
            >
              <RotateCcw className="w-8 h-8 text-red-400 mb-3" />
              <h3 className="font-display text-xl font-bold mb-2 text-ink">Fortschritt zurücksetzen</h3>
              <p className="text-muted">Alle Antworten löschen</p>
            </button>
          </div>

          <section>
            <h2 className="font-display text-2xl font-bold mb-6 text-ink">Kapitel</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {QUIZ_DATA.chapters.map((chap) => {
                const chapQuiz = QUIZ_DATA.questions.filter(q => q.chapter === chap.id);
                const chapAnswered = chapQuiz.filter(q => answers[q.id] !== undefined).length;
                const progress = chapQuiz.length > 0 ? Math.round((chapAnswered / chapQuiz.length) * 100) : 0;
                const chapSubmittedCount = chapQuiz.filter(q => submittedIds[q.id]).length;
                const chapComplete = chapQuiz.length > 0 && chapSubmittedCount === chapQuiz.length;
                const chapWrongCount = chapQuiz.filter(q => submittedIds[q.id] && !isAnswerCorrect(applyShuffle(q, shuffledOptions), answers[q.id])).length;

                return (
                  <div key={chap.id} className={`${CARD} rounded-lg p-6 hover:border-slate-600 transition`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="font-mono text-xs text-muted mb-1">§{String(chap.id).padStart(2, '0')}</div>
                        <h3 className="font-display text-lg font-bold text-ink">{chap.title}</h3>
                        <p className="text-sm text-muted">
                          {chapQuiz.length > 0 ? `${chapQuiz.length} Fragen · ${chap.duration}` : `Lesezeit ${chap.duration}`}
                        </p>
                      </div>
                      {chap.free ? <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> : <Lock className="w-5 h-5 text-slate-500" />}
                    </div>

                    {chapQuiz.length > 0 && (
                      <div className="mb-4">
                        <div className="flex justify-between items-center text-xs font-mono text-muted mb-2">
                          <span>{chapAnswered}/{chapQuiz.length}</span>
                          <TickBar percent={progress} />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {THEORY_HTML[chap.id] && (
                        <button
                          onClick={() => handleOpenTheory(chap.id)}
                          className="flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20"
                        >
                          <FileText className="w-4 h-4" /> Theorie
                        </button>
                      )}
                      {chapQuiz.length > 0 && (
                        <button
                          onClick={() => handleStartChapter(chap.id)}
                          disabled={isPremium && !chap.free}
                          className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                            isPremium && !chap.free
                              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                              : 'bg-indigo-500 text-white hover:bg-indigo-400'
                          }`}
                        >
                          Quiz starten <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                      {chapAnswered > 0 && (
                        <button
                          onClick={() => handleDeleteChapterResults(chap.id)}
                          aria-label="Auswertung löschen"
                          title="Auswertung löschen"
                          className="px-3 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {chapComplete && chapWrongCount > 0 && (
                      <button
                        onClick={() => handleRetryWrongAnswers(chap.id)}
                        className="w-full mt-2 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
                      >
                        {chapWrongCount} falsche Frage{chapWrongCount === 1 ? '' : 'n'} wiederholen
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    );
  }

  // QUIZ VIEW
  if (view === 'quiz' && currentQuestion) {
    const submitted = !!submittedIds[currentQuestion.id];
    const userAnswer = answers[currentQuestion.id];
    const isSelected = (idx) => currentQuestion.multiSelect
      ? Array.isArray(userAnswer) && userAnswer.includes(idx)
      : userAnswer === idx;
    const isAnswered = currentQuestion.multiSelect
      ? Array.isArray(userAnswer) && userAnswer.length === currentQuestion.correct.length
      : userAnswer !== undefined;
    const isCorrectOption = (idx) => currentQuestion.multiSelect
      ? currentQuestion.correct.includes(idx)
      : idx === currentQuestion.correct;
    const wasCorrect = submitted && isAnswerCorrect(currentQuestion, userAnswer);

    return (
      <div className={`min-h-screen ${PAGE_BG} p-4`}>
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <button onClick={() => { setView('home'); setRetryQuestionIds(null); }} className={BACK_BTN}>
              ← zurück
            </button>
            <div className="font-mono text-sm text-muted">
              {currentQuestionIdx + 1}/{chapQuestions.length}
            </div>
          </div>

          <div className={`${CARD} rounded-lg shadow-xl p-8`}>
            <div className="mb-6">
              {retryQuestionIds && (
                <p className="font-mono text-xs text-amber-400 mb-2">Wiederholung falsch beantworteter Fragen</p>
              )}
              <div className="mb-4">
                <TickBar percent={((currentQuestionIdx + 1) / chapQuestions.length) * 100} width={32} />
              </div>
              <h2 className="text-lg sm:text-xl font-bold mb-4 text-ink whitespace-pre-line text-left">
                {currentQuestion.question}
                {currentQuestion.aiGenerated && (
                  <span className="ml-2 align-middle font-mono text-xs font-semibold text-indigo-300 bg-indigo-900/50 border border-indigo-700 rounded px-1.5 py-0.5">
                    KI
                  </span>
                )}
              </h2>
              <p className="font-mono text-xs text-muted">
                {currentQuestion.points} Punkt(e)
                {currentQuestion.multiSelect && ` · Wählen Sie ${currentQuestion.correct.length} Optionen!`}
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(currentQuestion, idx)}
                  disabled={submitted}
                  className={`w-full p-4 text-left rounded-lg border-2 transition ${
                    optionStateClasses(isSelected(idx), submitted, isCorrectOption(idx))
                  }`}
                >
                  <div className="font-semibold text-white">
                    {currentQuestion.multiSelect ? (isSelected(idx) ? '☑' : '☐') : ''} {String.fromCharCode(97 + idx)})
                  </div>
                  <div className="text-slate-300 mt-1">{option}</div>
                </button>
              ))}
            </div>

            {submitted && (
              <div className={`p-4 rounded-lg mb-6 border ${wasCorrect ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-red-500/15 border-red-500/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <ResultBadge correct={wasCorrect} />
                  <p className={`font-semibold ${wasCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
                    {wasCorrect ? 'Richtig!' : 'Leider falsch.'}
                  </p>
                </div>
                <p className="text-slate-300">{currentQuestion.explanation}</p>
              </div>
            )}

            <div className="flex gap-4">
              {!submitted ? (
                <button
                  onClick={handleSubmitQuestion}
                  disabled={!isAnswered}
                  className="flex-1 py-3 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition"
                >
                  Antwort überprüfen
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleRetryQuestion(currentQuestion.id)}
                    className="flex-1 py-3 bg-slate-800 border-2 border-slate-700 text-slate-300 rounded-lg font-semibold hover:border-indigo-500/50 transition"
                  >
                    Frage neu lösen
                  </button>
                  <button
                    onClick={handleNextQuestion}
                    className="flex-1 py-3 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-400 transition"
                  >
                    {currentQuestionIdx === chapQuestions.length - 1 ? 'Kapitel beenden' : 'Nächste Frage'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // THEORY VIEW
  if (view === 'theory' && THEORY_HTML[currentChapter]) {
    const chapQuiz = QUIZ_DATA.questions.filter(q => q.chapter === currentChapter);
    return (
      <div className={`min-h-screen ${PAGE_BG} p-4`}>
        <div className="max-w-3xl mx-auto">
          <button onClick={() => setView('home')} className={`mb-6 ${BACK_BTN}`}>
            ← zurück
          </button>

          <div className={`${CARD} rounded-lg shadow-xl p-8 mb-6`}>
            <div
              className="summary-content"
              dangerouslySetInnerHTML={{ __html: THEORY_HTML[currentChapter] }}
            />
          </div>

          {chapQuiz.length > 0 && (
            <button
              onClick={() => handleStartChapter(currentChapter)}
              className="w-full py-3 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-400 transition flex items-center justify-center gap-2"
            >
              Jetzt Fragen üben <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // GLOSSARY VIEW
  if (view === 'glossary') {
    return (
      <div className={`min-h-screen ${PAGE_BG} p-4`}>
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setView('home')} className={`mb-6 ${BACK_BTN}`}>
            ← zurück
          </button>

          <div className={`${CARD} rounded-lg shadow-xl p-8`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-ink">Glossar</h2>
              <button
                onClick={startGlossaryQuiz}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-400 transition text-sm"
              >
                Begriffe quizzen
              </button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Begriff suchen..."
                value={searchGlossary}
                onChange={(e) => setSearchGlossary(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border-2 border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-4">
              {filteredGlossary.length > 0 ? (
                filteredGlossary.map((item, idx) => (
                  <div key={idx} className="border-l-4 border-indigo-500 pl-4 py-2">
                    <h3 className="font-display font-bold text-ink">{item.term}</h3>
                    <p className="text-slate-300 text-sm mt-1">{item.definition}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-8">Keine Begriffe gefunden.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // GLOSSARY QUIZ VIEW
  if (view === 'glossaryQuiz') {
    if (glossaryQuizIdx >= glossaryQuiz.length) {
      return (
        <div className={`min-h-screen ${PAGE_BG} flex items-center justify-center p-4`}>
          <div className={`${CARD} rounded-lg shadow-xl p-8 text-center max-w-md w-full`}>
            <h2 className="font-display text-2xl font-bold mb-4 text-ink">Runde beendet!</h2>
            <p className="font-display text-4xl font-bold text-indigo-400 mb-2">
              {glossaryScore.correct}/{glossaryScore.total}
            </p>
            <p className="text-slate-400 mb-8">richtig beantwortet</p>
            <div className="flex gap-3">
              <button
                onClick={() => setView('glossary')}
                className="flex-1 py-3 bg-slate-800 border-2 border-slate-700 text-slate-300 rounded-lg font-semibold hover:border-indigo-500/50 transition"
              >
                Zurück
              </button>
              <button
                onClick={startGlossaryQuiz}
                className="flex-1 py-3 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-400 transition"
              >
                Neue Runde
              </button>
            </div>
          </div>
        </div>
      );
    }

    const gq = glossaryQuiz[glossaryQuizIdx];

    return (
      <div className={`min-h-screen ${PAGE_BG} p-4`}>
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <button onClick={() => setView('glossary')} className={BACK_BTN}>
              ← zurück
            </button>
            <div className="font-mono text-sm text-muted">
              {glossaryQuizIdx + 1}/{glossaryQuiz.length}
            </div>
          </div>

          <div className={`${CARD} rounded-lg shadow-xl p-8`}>
            <div className="mb-6">
              <div className="mb-4">
                <TickBar percent={((glossaryQuizIdx + 1) / glossaryQuiz.length) * 100} width={32} />
              </div>
              <p className="text-sm text-slate-400 mb-2">Was bedeutet dieser Begriff?</p>
              <h2 className="font-display text-xl font-bold text-ink">{gq.term}</h2>
            </div>

            <div className="space-y-3 mb-8">
              {gq.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleGlossaryAnswer(idx)}
                  disabled={glossarySubmitted}
                  className={`w-full p-4 text-left rounded-lg border-2 transition ${
                    optionStateClasses(glossaryAnswer === idx, glossarySubmitted, idx === gq.correct)
                  }`}
                >
                  <div className="text-slate-300">{option}</div>
                </button>
              ))}
            </div>

            {glossarySubmitted && (
              <div className={`p-4 rounded-lg mb-6 border flex items-center gap-2 ${glossaryAnswer === gq.correct ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-red-500/15 border-red-500/30'}`}>
                <ResultBadge correct={glossaryAnswer === gq.correct} />
                <p className={`font-semibold ${glossaryAnswer === gq.correct ? 'text-emerald-300' : 'text-red-300'}`}>
                  {glossaryAnswer === gq.correct ? 'Richtig!' : 'Leider falsch.'}
                </p>
              </div>
            )}

            <div className="flex gap-4">
              {!glossarySubmitted ? (
                <button
                  onClick={handleGlossarySubmit}
                  disabled={glossaryAnswer === null}
                  className="flex-1 py-3 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition"
                >
                  Antwort überprüfen
                </button>
              ) : (
                <button
                  onClick={handleGlossaryNext}
                  className="flex-1 py-3 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-400 transition"
                >
                  {glossaryQuizIdx === glossaryQuiz.length - 1 ? 'Ergebnis anzeigen' : 'Nächste Frage'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STATS VIEW
  if (view === 'stats') {
    const passPercentage = stats.maxPoints > 0 ? Math.round((stats.points / stats.maxPoints) * 100) : 0;
    const passingScore = 65;

    return (
      <div className={`min-h-screen ${PAGE_BG} p-4`}>
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setView('home')} className={`mb-6 ${BACK_BTN}`}>
            ← zurück
          </button>

          <div className={`${CARD} rounded-lg shadow-xl p-8`}>
            <h2 className="font-display text-2xl font-bold mb-8 text-ink">Deine Statistik</h2>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-6">
                <div className="font-mono text-xs uppercase tracking-wide text-muted mb-2">Beantwortet</div>
                <div className="font-display text-4xl font-bold text-indigo-400">{stats.total}</div>
              </div>
              <div className="bg-emerald-500/15 border border-emerald-500/20 rounded-lg p-6">
                <div className="font-mono text-xs uppercase tracking-wide text-muted mb-2">Richtig</div>
                <div className="font-display text-4xl font-bold text-emerald-400">
                  {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                <div className="font-mono text-xs uppercase tracking-wide text-muted mb-2">Punkte</div>
                <div className="font-display text-4xl font-bold text-blue-400">{stats.points}</div>
              </div>
              <div className={`${passPercentage >= passingScore ? 'bg-emerald-500/15 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'} border rounded-lg p-6`}>
                <div className="font-mono text-xs uppercase tracking-wide text-muted mb-2">Erfolgsquote</div>
                <div className={`font-display text-4xl font-bold ${passPercentage >= passingScore ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {passPercentage}%
                </div>
              </div>
            </div>

            {stats.maxPoints > 0 && (
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-slate-300">Bestandene Prüfung</span>
                  {passPercentage >= passingScore ? (
                    <ResultBadge correct={true} />
                  ) : (
                    <span className="font-mono text-xs text-amber-400 font-bold">{passingScore - passPercentage}% FEHLEN</span>
                  )}
                </div>
                <TickBar
                  percent={Math.min(passPercentage, 100)}
                  width={36}
                  filledClass={passPercentage >= passingScore ? 'text-emerald-400' : 'text-amber-400'}
                />
                <p className="text-xs text-slate-400 mt-2">Mindestens {passingScore}% erforderlich</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // FALLBACK (e.g. chapter with no questions selected)
  return (
    <div className={`min-h-screen ${PAGE_BG} flex items-center justify-center p-4`}>
      <div className={`${CARD} rounded-lg shadow-xl p-8 text-center`}>
        <p className="text-slate-300 mb-4">Für dieses Kapitel gibt es noch keine Fragen.</p>
        <button
          onClick={() => setView('home')}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-400"
        >
          Zurück zur Übersicht
        </button>
      </div>
    </div>
  );
  }

  return (
    <>
      {renderView()}
      <FontSizeControl scaleIdx={fontScaleIdx} onChange={setFontScaleIdx} />
    </>
  );
}
