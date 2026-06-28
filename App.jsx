import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, query, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { 
  UploadCloud, BookOpen, Menu, X, Loader2, Highlighter, 
  Sparkles, BrainCircuit, History, Lightbulb, ChevronLeft, ChevronRight, Focus,
  Plus, Minus, Palette, Send, Library, Moon, Sun, Trash2, Hash, CheckCircle2, AlertCircle, FileText, Maximize2, Minimize2
} from 'lucide-react';

// --- Configuration & Firebase Setup ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'pdf-reader-pro';
const apiKey = "";

// --- IndexedDB for Large File Storage ---
const DB_NAME = 'PDFReaderDB';
const STORE_NAME = 'pdfFiles';

const initIDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

const saveFileLocally = async (id, data) => {
  const db = await initIDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const getFileLocally = async (id) => {
  const db = await initIDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const deleteFileLocally = async (id) => {
  const db = await initIDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).delete(id);
};

const THEMES = {
  paper: {
    id: 'paper', bg: 'bg-[#f9f7f2]', text: 'text-[#3c3c3c]', border: 'border-[#e2ddd1]',
    panel: 'bg-[#fffefc]', accent: '#5d4037', aiBtn: 'bg-[#5d4037] text-[#f9f7f2]',
    aiSecondary: 'bg-[#ede8db] text-[#5d4037]', pageBg: 'bg-[#ede8db]',
    pageFilter: 'sepia(0.2) contrast(0.9) brightness(1.02)', overlay: 'bg-[#fbf9f4]/20'
  },
  dark: {
    id: 'dark', bg: 'bg-[#0a0a0a]', text: 'text-[#d4d4d8]', border: 'border-zinc-800',
    panel: 'bg-[#121212]', accent: '#71717a', aiBtn: 'bg-zinc-200 text-black',
    aiSecondary: 'bg-zinc-900 text-zinc-400', pageBg: 'bg-[#050505]',
    pageFilter: 'invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9)', overlay: 'bg-transparent'
  },
  midnight: {
    id: 'midnight', bg: 'bg-[#0f172a]', text: 'text-slate-200', border: 'border-slate-800',
    panel: 'bg-[#1e293b]', accent: '#38bdf8', aiBtn: 'bg-sky-500 text-white',
    aiSecondary: 'bg-slate-800 text-sky-400', pageBg: 'bg-[#020617]',
    pageFilter: 'invert(0.9) hue-rotate(190deg) brightness(1.1)', overlay: 'bg-transparent'
  },
  forest: {
    id: 'forest', bg: 'bg-[#f0f4f0]', text: 'text-[#2d3a2d]', border: 'border-[#d8e0d8]',
    panel: 'bg-[#ffffff]', accent: '#4a6741', aiBtn: 'bg-[#4a6741] text-white',
    aiSecondary: 'bg-[#e0eadc] text-[#4a6741]', pageBg: 'bg-[#e8f0e5]',
    pageFilter: 'sepia(0.1) hue-rotate(80deg) saturate(0.8)', overlay: 'bg-transparent'
  },
  lavender: {
    id: 'lavender', bg: 'bg-[#f8f7ff]', text: 'text-[#483d8b]', border: 'border-[#e6e4f5]',
    panel: 'bg-[#ffffff]', accent: '#7b68ee', aiBtn: 'bg-[#7b68ee] text-white',
    aiSecondary: 'bg-[#f0effc] text-[#7b68ee]', pageBg: 'bg-[#eceaff]',
    pageFilter: 'hue-rotate(260deg) saturate(0.7) brightness(1.05)', overlay: 'bg-transparent'
  }
};

const InteractiveQuiz = ({ data }) => {
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  if (!data || !data.question) return null;
  const handleSelection = (idx) => { if (showResult) return; setSelected(idx); setShowResult(true); };
  return (
    <div className="bg-white/50 dark:bg-white/5 border border-current/10 rounded-xl p-4 my-2 space-y-3 shadow-sm">
      <h4 className="font-bold text-sm leading-snug">{data.question}</h4>
      <div className="space-y-2">
        {data.options.map((opt, i) => {
          const isCorrect = i === data.correctIndex;
          const isSelected = i === selected;
          let statusStyle = "border-current/10 hover:bg-black/5 dark:hover:bg-white/5";
          if (showResult) {
            if (isCorrect) statusStyle = "bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-300";
            else if (isSelected) statusStyle = "bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-300";
            else statusStyle = "opacity-40 border-current/5";
          }
          return (
            <button key={i} onClick={() => handleSelection(i)} disabled={showResult} className={`w-full text-right p-3 rounded-lg border text-xs transition-all flex items-center justify-between ${statusStyle}`}>
              <span>{opt}</span>
              {showResult && isCorrect && <CheckCircle2 size={14} />}
              {showResult && isSelected && !isCorrect && <AlertCircle size={14} />}
            </button>
          );
        })}
      </div>
      {showResult && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-[11px] border border-blue-100 dark:border-blue-800 animate-in fade-in slide-in-from-top-1">
          <p className="font-bold mb-1">הסבר:</p>
          {data.explanation}
        </div>
      )}
    </div>
  );
};

const RenderMarkdown = ({ text, type }) => {
  if (!text) return null;
  if (type === 'quiz') {
    try {
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const quizData = JSON.parse(cleanJson);
      return (
        <div className="space-y-4">
          {Array.isArray(quizData) ? quizData.map((q, i) => <InteractiveQuiz key={i} data={q} />) : <InteractiveQuiz data={quizData} />}
        </div>
      );
    } catch (e) { /* silent fail */ }
  }
  
  // Clean up markdown formatting symbols for a cleaner look
  const cleanText = text
    .replace(/#{1,6}\s?/g, '') // Remove hash titles
    .replace(/\*\*/g, '');      // Remove bold markers

  const lines = cleanText.split('\n');
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        if (line.startsWith('* ') || line.startsWith('- ')) return <li key={i} className="mr-4 mb-1 list-disc">{line.substring(2)}</li>;
        return <p key={i} className="mb-2">{line}</p>;
      })}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [library, setLibrary] = useState([]);
  const [activeBookId, setActiveBookId] = useState(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [fileName, setFileName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [currentTheme, setCurrentTheme] = useState('paper');
  const [isRendering, setIsRendering] = useState(false);
  const [pageImageUrl, setPageImageUrl] = useState(null);
  const [pageText, setPageText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [highlights, setHighlights] = useState({});
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiHistory, setAiHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [loadingBook, setLoadingBook] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const libRef = collection(db, 'artifacts', appId, 'users', user.uid, 'library');
    return onSnapshot(libRef, (snapshot) => {
      setLibrary(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Library load error:", error));
  }, [user]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    };
    document.body.appendChild(script);
  }, []);

  const saveProgress = async (pageNum, newHighlights = highlights, history = aiHistory) => {
    if (!user || !activeBookId) return;
    const bookRef = doc(db, 'artifacts', appId, 'users', user.uid, 'library', activeBookId);
    try {
      await updateDoc(bookRef, {
        lastPage: pageNum,
        highlights: JSON.stringify(newHighlights),
        aiHistory: history
      });
    } catch (e) { console.error("Save progress error:", e); }
  };

  const loadPdfBytes = async (bytes, bookData) => {
    setLoadingBook(true);
    try {
      const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      setTotalPages(pdf.numPages);
      setPdfDocument(pdf);
      setFileName(bookData.name);
      setActiveBookId(bookData.id);
      setCurrentPage(bookData.lastPage || 1);
      setHighlights(bookData.highlights ? JSON.parse(bookData.highlights) : {});
      setAiHistory(bookData.aiHistory || []);
      setSidebarOpen(false);
    } catch (e) { console.error("Load PDF error:", e); }
    finally { setLoadingBook(false); }
  };

  const loadBookFromLibrary = async (book) => {
    if (activeBookId === book.id) return;
    setLoadingBook(true);
    setPdfDocument(null);
    setPageImageUrl(null);
    try {
      let bytes = await getFileLocally(book.id);
      if (!bytes) {
        const base64 = book.fileData;
        if (!base64) throw new Error("File not found");
        const binaryStr = atob(base64.split(',')[1]);
        bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      }
      await loadPdfBytes(bytes, book);
    } catch (err) { console.error(err); setLoadingBook(false); }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file?.type === 'application/pdf' && user) {
      setLoadingBook(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target.result;
        const bytes = new Uint8Array(arrayBuffer);
        const bookId = crypto.randomUUID();
        await saveFileLocally(bookId, bytes);
        const newBook = { id: bookId, name: file.name, lastPage: 1, highlights: "{}", aiHistory: [], addedAt: Date.now() };
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'library', bookId), newBook);
        await loadPdfBytes(bytes, newBook);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const deleteBook = async (e, bookId) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'library', bookId));
      await deleteFileLocally(bookId);
      if (activeBookId === bookId) { setActiveBookId(null); setPdfDocument(null); setFileName(''); setAiHistory([]); }
    } catch (err) { console.error(err); }
  };

  const renderPageAsImage = useCallback(async (pageNum) => {
    if (!pdfDocument) return;
    setIsRendering(true);
    try {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      setPageText(textContent.items.map(item => item.str).join(' '));
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      setPageImageUrl(canvas.toDataURL('image/png'));
      if (activeBookId) saveProgress(pageNum);
    } catch (error) { console.error(error); }
    finally { setIsRendering(false); }
  }, [pdfDocument, activeBookId, highlights, aiHistory]);

  useEffect(() => {
    if (pdfDocument) renderPageAsImage(currentPage);
  }, [currentPage, pdfDocument, renderPageAsImage]);

  const handlePageInputChange = (e) => {
    const val = e.target.value;
    setPageInput(val);
    const num = parseInt(val);
    if (num >= 1 && num <= totalPages) setCurrentPage(num);
  };

  const onMouseDown = (e) => {
    if (!isHighlighting || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDoc({ x, y, start: true });
    // Local start state
    window.__dragStart = { x, y };
  };

  const onMouseUp = (e) => {
    if (!window.__dragStart || !isHighlighting) return;
    const rect = containerRef.current.getBoundingClientRect();
    const endX = ((e.clientX - rect.left) / rect.width) * 100;
    const endY = ((e.clientY - rect.top) / rect.height) * 100;
    const newHighlight = {
      id: crypto.randomUUID(),
      x: Math.min(window.__dragStart.x, endX),
      y: Math.min(window.__dragStart.y, endY),
      w: Math.abs(endX - window.__dragStart.x),
      h: Math.abs(endY - window.__dragStart.y)
    };
    if (newHighlight.w > 0.5 || newHighlight.h > 0.5) {
      const updated = { ...highlights, [currentPage]: [...(highlights[currentPage] || []), newHighlight] };
      setHighlights(updated);
      saveProgress(currentPage, updated);
    }
    window.__dragStart = null;
  };

  const deleteHighlight = (id) => {
    const updated = { ...highlights, [currentPage]: highlights[currentPage].filter(h => h.id !== id) };
    setHighlights(updated);
    saveProgress(currentPage, updated);
  };

  const callGemini = async (prompt, systemPrompt, type, isFollowUp = false) => {
    setAiLoading(true);
    setShowAiPanel(true);
    let finalSystemPrompt = systemPrompt + " Do not use markdown symbols like * or # in your response text.";
    if (type === 'quiz') finalSystemPrompt += ` Return ONLY a JSON array. Language: Hebrew.`;
    const context = (isFollowUp && aiHistory.length > 0)
      ? `History: ${JSON.stringify(aiHistory.slice(0,2))}\n\nQ: ${prompt}`
      : `Context: ${pageText.substring(0, 2000)}\n\nTask: ${prompt}`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: context }] }],
          systemInstruction: { parts: [{ text: finalSystemPrompt }] }
        })
      });
      const result = await response.json();
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "שגיאה בתקשורת";
      const newEntry = { type: isFollowUp ? 'chat' : type, page: currentPage, content: rawText, timestamp: new Date().toLocaleTimeString() };
      const updated = [newEntry, ...aiHistory];
      setAiHistory(updated);
      if (activeBookId) saveProgress(currentPage, highlights, updated);
      setChatInput('');
    } catch (e) { console.error(e); }
    finally { setAiLoading(false); }
  };

  const askAiAboutHighlight = (e) => {
    e.stopPropagation();
    callGemini("הסבר לי את הנושא המודגש בדף זה בפירוט ובהקשר רחב יותר של הטקסט", "אתה עוזר לימודי מומחה. הסבר בפירוט את החלק המודגש.", "insight");
  };

  const theme = THEMES[currentTheme] || THEMES.paper;

  return (
    <div dir="rtl" className={`h-screen flex flex-col transition-all duration-500 ${theme.bg} ${theme.text} font-sans overflow-hidden`}>
      {/* Header - Hidden in Focus Mode */}
      {!isFocusMode && (
        <header className={`flex items-center justify-between px-6 py-2 border-b ${theme.border} ${theme.bg} z-50 shadow-sm animate-in slide-in-from-top`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-black/5 rounded-full" title="ספרייה"><Library size={18} /></button>
            <span className="font-bold text-sm truncate max-w-[200px]">{fileName || 'קורא ספרים חכם'}</span>
            {loadingBook && <Loader2 size={16} className="animate-spin opacity-50" />}
          </div>
          <div className="flex items-center gap-3">
            {pdfDocument && (
              <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-full px-3 py-1 ml-4 border border-current/5">
                <span className="text-[10px] opacity-40">עבור לעמוד:</span>
                <input type="number" value={pageInput} onChange={handlePageInputChange} placeholder={currentPage.toString()} className="bg-transparent text-[10px] w-12 outline-none border-none text-center font-bold" />
              </div>
            )}
            <div className="flex items-center gap-1 bg-black/5 rounded-full px-2 py-1">
               <button onClick={() => setZoom(z => Math.max(0.5, z-0.1))} className="p-1 hover:bg-black/10 rounded-full"><Minus size={12}/></button>
               <span className="text-[10px] w-8 text-center">{Math.round(zoom * 100)}%</span>
               <button onClick={() => setZoom(z => Math.min(3, z+0.1))} className="p-1 hover:bg-black/10 rounded-full"><Plus size={12}/></button>
            </div>
            
            {/* Theme Selector */}
            <div className="relative">
              <button onClick={() => setShowThemeMenu(!showThemeMenu)} className="p-2 hover:bg-black/5 rounded-full" title="ערכות נושא">
                <Palette size={18}/>
              </button>
              {showThemeMenu && (
                <div className={`absolute left-0 mt-2 p-2 rounded-xl border shadow-xl z-[100] grid grid-cols-1 w-32 ${theme.panel} ${theme.border} animate-in fade-in zoom-in-95`}>
                  {Object.values(THEMES).map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => { setCurrentTheme(t.id); setShowThemeMenu(false); }}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-black/5 ${currentTheme === t.id ? 'font-bold bg-black/5' : ''}`}
                    >
                      <div className={`w-3 h-3 rounded-full border border-black/10`} style={{ backgroundColor: t.accent }}></div>
                      <span className="capitalize">{t.id === 'paper' ? 'נייר' : t.id === 'dark' ? 'לילה' : t.id === 'midnight' ? 'חצות' : t.id === 'forest' ? 'יער' : 'לוונדר'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => setIsHighlighting(!isHighlighting)} className={`p-2 rounded-full transition-all ${isHighlighting ? 'bg-yellow-400 text-black shadow-lg scale-110' : 'hover:bg-black/5'}`} title="מצב הדגשה"><Highlighter size={18} /></button>
            <button onClick={() => setIsFocusMode(true)} className="p-2 hover:bg-black/5 rounded-full" title="מצב פוקוס"><Maximize2 size={18}/></button>
            <button onClick={() => setShowAiPanel(!showAiPanel)} className="p-2 rounded-full hover:bg-purple-500/10 text-purple-600" title="AI"><BrainCircuit size={18} /></button>
          </div>
        </header>
      )}

      {/* Focus Mode Exit Trigger */}
      {isFocusMode && (
        <div className="fixed top-4 left-4 z-[100] flex flex-col items-center gap-2 animate-in fade-in zoom-in">
           <button 
            onClick={() => setIsFocusMode(false)}
            className="p-3 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white shadow-xl transition-all border border-white/10 group"
            title="צא ממצב פוקוס"
          >
            <Minimize2 size={24} className="group-hover:scale-110 transition-transform"/>
          </button>
          <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">חזרה</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Library Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
            <div className={`absolute right-0 top-0 bottom-0 w-80 ${theme.panel} shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-extrabold text-xl">הספרייה שלי</h2>
                <button onClick={() => setSidebarOpen(false)}><X size={20}/></button>
              </div>
              <div className="space-y-3">
                <label className="block w-full border-2 border-dashed border-current/20 rounded-xl p-4 text-center cursor-pointer hover:bg-black/5 mb-6 transition-colors">
                  <UploadCloud className="mx-auto mb-2 opacity-50" />
                  <span className="text-xs font-bold">העלה ספר חדש</span>
                  <input type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
                </label>
                {library.length > 0 && library.sort((a,b) => b.addedAt - a.addedAt).map(book => (
                  <div key={book.id} onClick={() => loadBookFromLibrary(book)} className={`group relative w-full text-right p-4 rounded-xl border transition-all cursor-pointer ${activeBookId === book.id ? 'border-purple-500 bg-purple-500/5' : 'border-current/10 hover:bg-black/5'}`}>
                    <div className="flex items-start gap-3">
                      <FileText size={18} className="mt-0.5 opacity-40 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate mb-1">{book.name}</div>
                        <div className="text-[10px] opacity-50 flex justify-between items-center">
                          <span>עמוד {book.lastPage || 1}</span>
                          <button onClick={(e) => deleteBook(e, book.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI Panel */}
        {showAiPanel && (
          <div className={`absolute left-0 top-0 bottom-0 w-80 md:w-96 z-[70] shadow-2xl flex flex-col border-r ${theme.border} ${theme.panel} animate-in slide-in-from-left duration-300`}>
             <div className={`p-4 border-b flex justify-between items-center ${theme.bg}`}>
              <span className={`font-extrabold flex items-center gap-2 text-purple-600`}><Sparkles size={16}/> עוזר AI</span>
              <button onClick={() => setShowAiPanel(false)}><X size={18}/></button>
            </div>
            <div className={`p-4 border-b flex gap-2 ${theme.bg}`}>
              <button onClick={() => callGemini(`סכם את העמוד`, "אתה עוזר אקדמי", "summary")} className={`flex-1 py-2 rounded-lg text-xs font-bold ${theme.aiBtn}`}>סכם</button>
              <button onClick={() => callGemini(`צור בוחן`, "צור בוחן אמריקאי", "quiz")} className={`flex-1 py-2 rounded-lg text-xs font-bold ${theme.aiSecondary}`}>בחן אותי</button>
            </div>
            <div className={`flex-1 overflow-y-auto p-6 text-sm leading-relaxed ${theme.text}`}>
              {aiLoading ? <div className="flex flex-col items-center py-20 opacity-50"><Loader2 className="animate-spin text-purple-500 mb-2" /></div> :
                aiHistory.map((entry, idx) => (
                  <div key={idx} className="mb-8 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-current/5 animate-in fade-in slide-in-from-bottom-2">
                    <div className="text-[10px] opacity-40 mb-2 border-b pb-1 flex justify-between uppercase tracking-tighter">
                      <span>עמוד {entry.page}</span>
                      <span>{entry.timestamp}</span>
                    </div>
                    <RenderMarkdown text={entry.content} type={entry.type} />
                  </div>
                ))
              }
            </div>
            <div className="p-4 border-t">
              <div className="relative">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && callGemini(chatInput, "ענה קצר ולעניין", "chat", true)} placeholder="שאל משהו על הטקסט..." className="w-full pl-10 pr-4 py-3 rounded-xl border bg-transparent text-sm outline-none focus:border-purple-500 transition-all" />
                <button onClick={() => callGemini(chatInput, "ענה קצר ולעניין", "chat", true)} className="absolute left-2 top-2 p-1.5 bg-purple-600 text-white rounded-lg"><Send size={14}/></button>
              </div>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className={`flex-1 overflow-auto p-8 flex justify-center relative transition-all duration-700 ${theme.pageBg}`}>
          {!pdfDocument ? (
            <div className="flex flex-col items-center justify-center text-center py-20 max-w-md mx-auto">
              <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mb-6"><BookOpen size={40} className="text-purple-600 opacity-60" /></div>
              <h2 className="text-2xl font-black mb-4">קורא ספרים חכם</h2>
              <p className="text-sm opacity-50 mb-8 leading-relaxed">העלה קובץ PDF כדי להתחיל. ההדגשות שלך יישמרו אוטומטית.</p>
              <label className="bg-purple-600 text-white px-8 py-4 rounded-2xl cursor-pointer font-bold shadow-xl shadow-purple-500/20 hover:bg-purple-700 transition-all">
                בחר קובץ
                <input type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
              </label>
            </div>
          ) : (
            <div 
              ref={containerRef}
              onMouseDown={onMouseDown}
              onMouseUp={onMouseUp}
              className={`relative shadow-2xl transition-all ${isHighlighting ? 'cursor-crosshair' : 'cursor-default'}`} 
              style={{ width: '800px', height: 'fit-content', transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            >
              {pageImageUrl && <img src={pageImageUrl} className="block w-full h-auto select-none pointer-events-none" style={{ filter: theme.pageFilter }} />}
              
              {/* Highlights Rendering */}
              {(highlights[currentPage] || []).map(h => (
                <div 
                  key={h.id} 
                  className="absolute bg-yellow-400/40 rounded-sm group transition-all duration-300 hover:bg-yellow-400/60" 
                  style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%` }}
                >
                  <div className="absolute -top-8 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    <button 
                      onClick={(e) => askAiAboutHighlight(e)} 
                      className="text-white bg-purple-600 rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                      title="שאל את ה-AI על זה"
                    >
                      <Lightbulb size={12} strokeWidth={3}/>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteHighlight(h.id); }} 
                      className="text-white bg-red-500 rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                    >
                      <X size={12} strokeWidth={3}/>
                    </button>
                  </div>
                </div>
              ))}

              {isRendering && <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] flex items-center justify-center"><Loader2 className="animate-spin opacity-30 text-purple-600" size={32} /></div>}
            </div>
          )}
        </div>
      </div>

      {/* Footer - Hidden in Focus Mode */}
      {pdfDocument && !isFocusMode && (
        <footer className={`px-10 py-4 border-t ${theme.border} ${theme.bg} flex items-center justify-between z-50 animate-in slide-in-from-bottom`}>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-2 text-xs font-bold opacity-60 hover:opacity-100 disabled:opacity-10 transition-all"><ChevronRight size={18}/> עמוד הבא</button>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">עמוד {currentPage} / {totalPages}</span>
            <div className="w-64 h-1.5 bg-black/10 rounded-full overflow-hidden"><div className="h-full bg-purple-600 transition-all duration-500" style={{ width: `${(currentPage/totalPages)*100}%` }}></div></div>
          </div>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-2 text-xs font-bold opacity-60 hover:opacity-100 disabled:opacity-10 transition-all">עמוד קודם <ChevronLeft size={18}/></button>
        </footer>
      )}
    </div>
  );
}