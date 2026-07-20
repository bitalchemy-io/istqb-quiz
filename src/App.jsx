import React, { useState, useEffect } from 'react';
import { BookOpen, BarChart3, Search, ChevronRight, RotateCcw, Lock, Star, FileText } from 'lucide-react';
import { marked } from 'marked';
import QUIZ_DATA from './data/quizData.json';
import THEORY_1_MD from './data/theory-1.md?raw';
import THEORY_2_MD from './data/theory-2.md?raw';
import THEORY_3_MD from './data/theory-3.md?raw';
import THEORY_4_MD from './data/theory-4.md?raw';
import THEORY_5_MD from './data/theory-5.md?raw';

const THEORY_HTML = {
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

const PAGE_BG = 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950';
const CARD = 'bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm';
const CARD_HOVER = 'hover:border-indigo-500/50 hover:bg-slate-800';
const BACK_BTN = 'px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg shadow hover:bg-slate-700 text-slate-300 transition';

export default function ISTQBQuizApp() {
  const [view, setView] = useState('home');
  const [currentChapter, setCurrentChapter] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [searchGlossary, setSearchGlossary] = useState('');
  const [stats, setStats] = useState({ total: 0, correct: 0, points: 0, maxPoints: 0 });
  const [glossaryQuiz, setGlossaryQuiz] = useState([]);
  const [glossaryQuizIdx, setGlossaryQuizIdx] = useState(0);
  const [glossaryAnswer, setGlossaryAnswer] = useState(null);
  const [glossarySubmitted, setGlossarySubmitted] = useState(false);
  const [glossaryScore, setGlossaryScore] = useState({ correct: 0, total: 0 });

  // Daten aus localStorage laden
  useEffect(() => {
    const saved = localStorage.getItem('istqb_progress');
    if (saved) {
      const data = JSON.parse(saved);
      setAnswers(data.answers || {});
      setStats(data.stats || { total: 0, correct: 0, points: 0, maxPoints: 0 });
    }
  }, []);

  // Fortschritt speichern
  useEffect(() => {
    localStorage.setItem('istqb_progress', JSON.stringify({
      answers,
      stats,
      timestamp: new Date().toISOString()
    }));
  }, [answers, stats]);

  const handleAnswer = (question, optionIndex) => {
    if (submitted) return;
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

  const isAnswerCorrect = (question, userAnswer) => {
    if (question.multiSelect) {
      if (!Array.isArray(userAnswer)) return false;
      const sortedUser = [...userAnswer].sort();
      const sortedCorrect = [...question.correct].sort();
      return sortedUser.length === sortedCorrect.length &&
        sortedUser.every((v, i) => v === sortedCorrect[i]);
    }
    return userAnswer === question.correct;
  };

  const handleSubmitQuestion = () => {
    const q = chapQuestions[currentQuestionIdx];
    const userAnswer = answers[q.id];
    const isCorrect = isAnswerCorrect(q, userAnswer);

    setStats(prev => ({
      total: prev.total + 1,
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      points: isCorrect ? prev.points + q.points : prev.points,
      maxPoints: prev.maxPoints + q.points
    }));

    setSubmitted(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < chapQuestions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSubmitted(false);
    } else {
      setView('home');
      setCurrentChapter(null);
      setCurrentQuestionIdx(0);
      setSubmitted(false);
    }
  };

  const resetProgress = () => {
    if (confirm('Fortschritt wirklich zurücksetzen?')) {
      setAnswers({});
      setStats({ total: 0, correct: 0, points: 0, maxPoints: 0 });
      localStorage.removeItem('istqb_progress');
    }
  };

  const handleStartChapter = (chapId) => {
    setCurrentChapter(chapId);
    setCurrentQuestionIdx(0);
    setSubmitted(false);
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

  const chapQuestions = QUIZ_DATA.questions.filter(q => q.chapter === currentChapter);
  const currentQuestion = chapQuestions[currentQuestionIdx];
  const isPremium = !QUIZ_DATA.chapters[currentChapter]?.free;

  // HOME VIEW
  if (view === 'home') {
    return (
      <div className={`min-h-screen ${PAGE_BG}`}>
        <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-indigo-400" />
                <h1 className="text-3xl font-bold text-white tracking-tight">ISTQB CT-GenAI</h1>
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
              <div className="text-sm text-slate-400">Fragen beantwortet</div>
              <div className="text-4xl font-bold text-indigo-400">{stats.total}</div>
            </div>
            <div className={`${CARD} rounded-lg p-6`}>
              <div className="text-sm text-slate-400">Richtige Antworten</div>
              <div className="text-4xl font-bold text-emerald-400">{stats.correct}</div>
            </div>
            <div className={`${CARD} rounded-lg p-6`}>
              <div className="text-sm text-slate-400">Punkte</div>
              <div className="text-4xl font-bold text-indigo-400">{stats.points}/{stats.maxPoints}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <button
              onClick={() => setView('glossary')}
              className={`${CARD} ${CARD_HOVER} rounded-lg p-8 transition text-left`}
            >
              <BookOpen className="w-8 h-8 text-indigo-400 mb-3" />
              <h3 className="text-xl font-bold mb-2 text-white">Glossar</h3>
              <p className="text-slate-400">{QUIZ_DATA.glossary.length} Begriffe durchsuchen</p>
            </button>
            <button
              onClick={resetProgress}
              className={`${CARD} ${CARD_HOVER} rounded-lg p-8 transition text-left`}
            >
              <RotateCcw className="w-8 h-8 text-red-400 mb-3" />
              <h3 className="text-xl font-bold mb-2 text-white">Fortschritt zurücksetzen</h3>
              <p className="text-slate-400">Alle Antworten löschen</p>
            </button>
          </div>

          <section>
            <h2 className="text-2xl font-bold mb-6 text-white">Kapitel</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {QUIZ_DATA.chapters.map((chap) => {
                const chapQuiz = QUIZ_DATA.questions.filter(q => q.chapter === chap.id);
                const chapAnswered = chapQuiz.filter(q => answers[q.id] !== undefined).length;
                const progress = chapQuiz.length > 0 ? Math.round((chapAnswered / chapQuiz.length) * 100) : 0;

                return (
                  <div key={chap.id} className={`${CARD} rounded-lg p-6 hover:border-slate-600 transition`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white">{chap.title}</h3>
                        <p className="text-sm text-slate-400">{chapQuiz.length} Fragen · {chap.duration}</p>
                      </div>
                      {chap.free ? <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> : <Lock className="w-5 h-5 text-slate-500" />}
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-slate-400 mb-2">
                        <span>Fortschritt</span>
                        <span>{chapAnswered}/{chapQuiz.length}</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {THEORY_HTML[chap.id] && (
                        <button
                          onClick={() => handleOpenTheory(chap.id)}
                          className="flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20"
                        >
                          <FileText className="w-4 h-4" /> Theorie
                        </button>
                      )}
                      <button
                        onClick={() => handleStartChapter(chap.id)}
                        disabled={(isPremium && !chap.free) || chapQuiz.length === 0}
                        className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                          (isPremium && !chap.free) || chapQuiz.length === 0
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-indigo-500 text-white hover:bg-indigo-400'
                        }`}
                      >
                        Quiz starten <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
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
            <button onClick={() => setView('home')} className={BACK_BTN}>
              ← Zurück
            </button>
            <div className="text-sm font-semibold text-slate-300">
              Frage {currentQuestionIdx + 1} von {chapQuestions.length}
            </div>
          </div>

          <div className={`${CARD} rounded-lg shadow-xl p-8`}>
            <div className="mb-6">
              <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${((currentQuestionIdx + 1) / chapQuestions.length) * 100}%` }}
                />
              </div>
              <h2 className="text-lg sm:text-xl font-bold mb-4 text-white whitespace-pre-line text-left">{currentQuestion.question}</h2>
              <p className="text-sm text-slate-400">
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
                    {currentQuestion.multiSelect ? '☐' : ''} {String.fromCharCode(97 + idx)})
                  </div>
                  <div className="text-slate-300 mt-1">{option}</div>
                </button>
              ))}
            </div>

            {submitted && (
              <div className={`p-4 rounded-lg mb-6 border ${wasCorrect ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-red-500/15 border-red-500/30'}`}>
                <p className={`font-semibold mb-2 ${wasCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
                  {wasCorrect ? '✓ Richtig!' : '✗ Leider falsch.'}
                </p>
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
                <button
                  onClick={handleNextQuestion}
                  className="flex-1 py-3 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-400 transition"
                >
                  {currentQuestionIdx === chapQuestions.length - 1 ? 'Kapitel beenden' : 'Nächste Frage'}
                </button>
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
            ← Zurück
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
            ← Zurück
          </button>

          <div className={`${CARD} rounded-lg shadow-xl p-8`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Glossar</h2>
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
                    <h3 className="font-bold text-white">{item.term}</h3>
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
            <h2 className="text-2xl font-bold mb-4 text-white">Runde beendet!</h2>
            <p className="text-4xl font-bold text-indigo-400 mb-2">
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
              ← Zurück
            </button>
            <div className="text-sm font-semibold text-slate-300">
              Frage {glossaryQuizIdx + 1} von {glossaryQuiz.length}
            </div>
          </div>

          <div className={`${CARD} rounded-lg shadow-xl p-8`}>
            <div className="mb-6">
              <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${((glossaryQuizIdx + 1) / glossaryQuiz.length) * 100}%` }}
                />
              </div>
              <p className="text-sm text-slate-400 mb-2">Was bedeutet dieser Begriff?</p>
              <h2 className="text-xl font-bold text-white">{gq.term}</h2>
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
              <div className={`p-4 rounded-lg mb-6 border ${glossaryAnswer === gq.correct ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-red-500/15 border-red-500/30'}`}>
                <p className={`font-semibold ${glossaryAnswer === gq.correct ? 'text-emerald-300' : 'text-red-300'}`}>
                  {glossaryAnswer === gq.correct ? '✓ Richtig!' : '✗ Leider falsch.'}
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
            ← Zurück
          </button>

          <div className={`${CARD} rounded-lg shadow-xl p-8`}>
            <h2 className="text-2xl font-bold mb-8 text-white">Deine Statistik</h2>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-6">
                <div className="text-sm text-slate-400 mb-2">Beantwortete Fragen</div>
                <div className="text-4xl font-bold text-indigo-400">{stats.total}</div>
              </div>
              <div className="bg-emerald-500/15 border border-emerald-500/20 rounded-lg p-6">
                <div className="text-sm text-slate-400 mb-2">Richtige Antworten</div>
                <div className="text-4xl font-bold text-emerald-400">
                  {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                <div className="text-sm text-slate-400 mb-2">Punkte</div>
                <div className="text-4xl font-bold text-blue-400">{stats.points}</div>
              </div>
              <div className={`${passPercentage >= passingScore ? 'bg-emerald-500/15 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'} border rounded-lg p-6`}>
                <div className="text-sm text-slate-400 mb-2">Erfolgsquote</div>
                <div className={`text-4xl font-bold ${passPercentage >= passingScore ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {passPercentage}%
                </div>
              </div>
            </div>

            {stats.maxPoints > 0 && (
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold text-slate-300">Bestandene Prüfung</span>
                  <span className={passPercentage >= passingScore ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {passPercentage >= passingScore ? '✓ JA' : `${passingScore - passPercentage}% fehlen`}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${passPercentage >= passingScore ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(passPercentage, 100)}%` }}
                  />
                </div>
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
