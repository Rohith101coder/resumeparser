import { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, ChevronRight, BookOpen, BrainCircuit, Activity, CheckCircle, XCircle } from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:8080/api';

function App() {
  const [file, setFile] = useState(null);
  const [jdText, setJdText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [selectedSkill, setSelectedSkill] = useState(null);
  const [explanations, setExplanations] = useState({});
  const [loadingExpl, setLoadingExpl] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const analyzeGap = async () => {
    if (!file || !jdText.trim()) {
      setError('Please provide both a resume file and a job description.');
      return;
    }
    
    setError(null);
    setAnalyzing(true);
    setResult(null);
    setSelectedSkill(null);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('jobDescription', jdText);

    try {
      const res = await fetch(`${API_BASE}/analyze/resume-jd`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to analyze the resume.');
      
      const data = await fetchJson(res);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Error communicating with backend.');
    } finally {
      setAnalyzing(false);
    }
  };

  const fetchJson = async (res) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  const fetchExplanation = async (skill, type) => {
    setLoadingExpl(true);
    
    try {
      const endpoint = `${API_BASE}/ai/explain/${type}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missingSkills: [skill] }),
      });

      if (!res.ok) throw new Error(`Failed to fetch ${type} explanation.`);
      const data = await fetchJson(res);

      if(type === 'questions' && data.quiz) {
         // Some api variations
      }

      setExplanations(prev => ({
        ...prev,
        [skill]: {
          ...(prev[skill] || {}),
          [type]: type === 'questions' ? data : data.skills[0]
        }
      }));
    } catch (err) {
      setError(`Failed to load ${type} content for ${skill}: ${err.message}`);
    } finally {
      setLoadingExpl(false);
    }
  };

  const handleSkillClick = (skill) => {
    setSelectedSkill(skill);
    if (!explanations[skill]?.simple) {
      fetchExplanation(skill, 'simple');
    }
  };

  return (
    <div className="app-container">
      <header className="fade-in">
        <h1>SkillSync AI</h1>
        <p className="header-desc">Upload your resume, paste the job description, and let AI reveal and bridge your skill gaps.</p>
      </header>

      {error && <div className="error-msg fade-in"><AlertCircle size={20} /> {error}</div>}

      {!result && (
        <div className="glass glass-panel fade-in">
          <div className="form-group">
            <label><Upload size={18} style={{display:'inline', marginBottom:'-4px', marginRight:'8px'}}/> Upload Resume (PDF / DOCX)</label>
            <div className={`file-drop-zone ${file ? 'active' : ''}`} onClick={() => document.getElementById('file-upload').click()}>
              <input type="file" id="file-upload" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
              <div style={{ color: 'var(--text-muted)' }}>
                <FileText size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                <p>{file ? file.name : 'Click to browse or drag and drop your file here'}</p>
              </div>
            </div>
            {file && <div className="file-info"><CheckCircle2 size={16} /> File attached successfully</div>}
          </div>

          <div className="form-group">
            <label><FileText size={18} style={{display:'inline', marginBottom:'-4px', marginRight:'8px'}}/> Paste Job Description</label>
            <textarea 
              placeholder="Paste the requirements, responsibilities, and qualifications here..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </div>

          <button className="btn-primary" onClick={analyzeGap} disabled={analyzing || !file || !jdText.trim()}>
            {analyzing ? <><div className="loading-spinner" style={{width:'20px', height:'20px', marginBottom:0, borderTopColor:'white'}}></div> Analyzing...</> : <><BrainCircuit /> Analyze Match</>}
          </button>
        </div>
      )}

      {result && (
        <div className="results-grid fade-in">
          <div className="glass glass-panel">
            <h2 style={{marginBottom:'20px'}}>Skill Gap Analysis</h2>
            <div style={{marginBottom:'16px', background:'rgba(255,255,255,0.05)', padding:'16px', borderRadius:'12px'}}>
               <p style={{marginBottom:'8px'}}><strong>Match Status:</strong> <span style={{color: result.matchStatus === 'POSSIBLE' ? 'var(--success)' : 'var(--warning)', fontWeight:'bold'}}>{result.matchStatus}</span></p>
               <p style={{fontSize:'0.9rem', color: 'var(--text-muted)'}}>Matched: {result.resumeSkills?.length || 0} skills</p>
            </div>

            <h3 style={{fontSize:'1.1rem', marginTop:'24px', color:'#cbe0ff'}}>Missing Skills ({result.missingSkills?.length || 0})</h3>
            <div className="skills-list">
              {result.missingSkills.map(skill => (
                <div 
                  key={skill} 
                  className={`skill-card ${selectedSkill === skill ? 'active' : ''}`}
                  onClick={() => handleSkillClick(skill)}
                >
                  <span className="skill-name">{skill}</span>
                  <div className="skill-status status-missing"><AlertCircle size={14}/> Missing</div>
                </div>
              ))}
              {result.missingSkills.length === 0 && (
                <div className="empty-state">
                  <CheckCircle2 size={48} style={{opacity:0.5, marginBottom:'16px', color:'var(--success)'}}/>
                  <p>Incredible! You matched all required skills.</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass glass-panel explanation-panel">
            {selectedSkill ? (
              loadingExpl ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>AI is generating insights for <strong>{selectedSkill}</strong>...</p>
                </div>
              ) : (
                <ExplanationView 
                  skillName={selectedSkill} 
                  data={explanations[selectedSkill]} 
                  onFetchDeep={() => fetchExplanation(selectedSkill, 'deep')}
                  onFetchQuiz={() => fetchExplanation(selectedSkill, 'questions')}
                />
              )
            ) : (
              <div className="empty-state">
                <Activity size={48} style={{opacity:0.2, marginBottom:'16px'}}/>
                <h3>Select a missing skill to learn</h3>
                <p>Click on any missing skill from the left to get a personalized explanation and learning roadmap.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExplanationView({ skillName, data, onFetchDeep, onFetchQuiz }) {
  if (!data?.simple) return null;

  const [activeTab, setActiveTab] = useState('simple');
  const [answers, setAnswers] = useState({});

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    if(tab === 'deep' && !data.deep) onFetchDeep();
    if(tab === 'quiz' && !data.questions) onFetchQuiz();
  };

  const simple = data.simple;
  const deep = data.deep;
  const quizData = data.questions?.skills?.[0]?.questions || data.questions?.questions;

  const handleAnswer = (qIndex, optionLetter) => {
    setAnswers(prev => ({...prev, [qIndex]: optionLetter}));
  }

  return (
    <div className="fade-in">
      <div className="explanation-header">
        <h2>{skillName} <span className="badge">Beginner Story</span></h2>
      </div>

      <div className="actions-row" style={{marginTop:0, marginBottom:'24px'}}>
        <button className={`btn-secondary ${activeTab==='simple'?'active':''}`} onClick={()=>handleTabSwitch('simple')} style={{background: activeTab==='simple'?'rgba(99,102,241,0.2)':''}}>Story Mode</button>
        <button className={`btn-secondary ${activeTab==='deep'?'active':''}`} onClick={()=>handleTabSwitch('deep')} style={{background: activeTab==='deep'?'rgba(99,102,241,0.2)':''}}><BookOpen size={16}/> Deep Dive</button>
        <button className={`btn-secondary ${activeTab==='quiz'?'active':''}`} onClick={()=>handleTabSwitch('quiz')} style={{background: activeTab==='quiz'?'rgba(99,102,241,0.2)':''}}><BrainCircuit size={16}/> Mock Test</button>
      </div>

      <div className="explanation-content">
        {activeTab === 'simple' && simple && (
          <div className="fade-in">
            <div className="text-block">
              <h3>What It Is</h3>
              <p>{simple.whatItIs}</p>
            </div>
            <div className="text-block">
              <h3>Why It Matters</h3>
              <p>{simple.whyItIsImportant}</p>
            </div>
            <div className="text-block">
              <h3>Practical Example</h3>
              <p>{simple.practicalExample}</p>
            </div>
            <div className="text-block">
              <h3>Next Steps to Learn</h3>
              <ul className="steps-list">
                {simple.howToStartLearning?.map((step, i) => <li key={i}>{step}</li>)}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'deep' && (
          !deep ? (
            <div className="loading-container"><div className="loading-spinner"></div>Generating Deep Technical Analysis...</div>
          ) : (
            <div className="fade-in">
               <div className="text-block">
                <h3>Technical Definition</h3>
                <p>{deep.definition}</p>
              </div>
              <div className="text-block">
                <h3>Architecture & Performance (Why Used)</h3>
                <p>{deep.why_used}</p>
              </div>
              <div className="text-block">
                <h3>Real World Usage</h3>
                <ul className="steps-list">
                  {deep.real_world_usage?.map((use, i) => <li key={i}>{use}</li>)}
                </ul>
              </div>
              <div className="text-block">
                <h3>Advanced Topics</h3>
                <ul className="steps-list">
                  {deep.learning_path?.topics?.map((topic, i) => <li key={i}>{topic}</li>)}
                </ul>
              </div>
            </div>
          )
        )}

        {activeTab === 'quiz' && (
           !quizData ? (
             <div className="loading-container"><div className="loading-spinner"></div>Generating Interview Mock Test...</div>
           ) : (
             <div className="fade-in quiz-container">
                {quizData.map((q, qIndex) => (
                  <div key={qIndex} className="question-card">
                     <div className="question-text">{qIndex + 1}. {q.question}</div>
                     <div className="options-grid">
                        {Object.entries(q.options).map(([letter, text]) => {
                           const isSelected = answers[qIndex] === letter;
                           const isAnswered = answers[qIndex] !== undefined;
                           const isCorrect = isAnswered && q.correctAnswer === letter;
                           const isWrong = isSelected && !isCorrect;

                           let classes = "option-btn";
                           if(isSelected && !isAnswered) classes += " selected";
                           if(isCorrect) classes += " correct";
                           if(isWrong) classes += " wrong";

                           return (
                             <button 
                               key={letter} 
                               className={classes}
                               onClick={() => !isAnswered && handleAnswer(qIndex, letter)}
                               disabled={isAnswered}
                             >
                                <span className="option-letter">{letter}</span>
                                <div>{text}</div>
                                {isCorrect && <CheckCircle size={18} style={{marginLeft:'auto', color:'var(--success)'}}/>}
                                {isWrong && <XCircle size={18} style={{marginLeft:'auto', color:'var(--danger)'}}/>}
                             </button>
                           )
                        })}
                     </div>
                  </div>
                ))}
             </div>
           )
        )}
      </div>
    </div>
  );
}

export default App;
