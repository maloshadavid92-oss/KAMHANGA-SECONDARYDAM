import React, { useState, useEffect } from 'react';
import { 
  auth, db, loginWithGoogle, logout, onAuthStateChanged, 
  ref, get, set, push, onValue, 
  OperationType, handleDatabaseError 
} from './firebase';
import { Student, Subject, Result, UserProfile } from './types';
import { 
  LayoutDashboard, Users, BookOpen, FileText, LogOut, Plus, 
  Search, Filter, ChevronRight, GraduationCap, TrendingUp, AlertCircle,
  UserCircle, CheckCircle2, XCircle, Wifi, WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Grade calculation logic
const calculateGrade = (score: number) => {
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'subjects' | 'results'>('dashboard');
  
  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  
  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    console.log("App mounted, setting up auth listener...");
    
    // Fallback: if auth state doesn't change in 5 seconds, stop loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth listener timed out, forcing loading to false");
        setLoading(false);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed:", currentUser ? "User logged in" : "No user");
      clearTimeout(timeout);
      setUser(currentUser);
      if (currentUser) {
        // Check/Create user profile
        const userRef = ref(db, 'users/' + currentUser.uid);
        try {
          const userSnap = await get(userRef);
          if (userSnap.exists()) {
            setUserProfile(userSnap.val() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              role: 'teacher' // Default role
            };
            await set(userRef, newProfile);
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time listeners
  useEffect(() => {
    if (!user) return;

    const studentsRef = ref(db, 'students');
    const unsubStudents = onValue(studentsRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...(val as any) } as Student));
      setStudents(list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    }, (err) => handleDatabaseError(err, OperationType.LIST, 'students'));

    const subjectsRef = ref(db, 'subjects');
    const unsubSubjects = onValue(subjectsRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...(val as any) } as Subject));
      setSubjects(list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    }, (err) => handleDatabaseError(err, OperationType.LIST, 'subjects'));

    const resultsRef = ref(db, 'results');
    const unsubResults = onValue(resultsRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...(val as any) } as Result));
      setResults(list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    }, (err) => handleDatabaseError(err, OperationType.LIST, 'results'));

    return () => {
      unsubStudents();
      unsubSubjects();
      unsubResults();
    };
  }, [user]);

  const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      class: formData.get('class') as string,
      gender: formData.get('gender') as 'Male' | 'Female',
      createdAt: new Date()
    };

    try {
      const newRef = push(ref(db, 'students'));
      await set(newRef, data);
      setSuccess("Mwanafunzi ameongezwa!");
      setIsAdding(false);
    } catch (err) {
      setError("Imeshindwa kuongeza mwanafunzi.");
    }
  };

  const handleAddSubject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      createdAt: new Date()
    };

    try {
      const newRef = push(ref(db, 'subjects'));
      await set(newRef, data);
      setSuccess("Somo limeongezwa!");
      setIsAdding(false);
    } catch (err) {
      setError("Imeshindwa kuongeza somo.");
    }
  };

  const handleAddResult = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const score = Number(formData.get('score'));
    const data = {
      studentId: formData.get('studentId') as string,
      subjectId: formData.get('subjectId') as string,
      score: score,
      grade: calculateGrade(score),
      term: formData.get('term') as string,
      year: formData.get('year') as string,
      authorUid: user.uid,
      createdAt: new Date()
    };

    try {
      const newRef = push(ref(db, 'results'));
      await set(newRef, data);
      setSuccess("Matokeo yamewekwa!");
      setIsAdding(false);
    } catch (err) {
      setError("Imeshindwa kuweka matokeo.");
    }
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      // Ignore common user-triggered cancellation errors
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        console.log("Login cancelled or popup closed by user.");
      } else {
        setError("Imeshindwa kuingia. Tafadhali jaribu tena.");
        console.error("Login error:", err);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gold-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gold-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gold-200"
        >
          <div className="bg-gold-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Mfumo wa Matokeo</h1>
          <p className="text-emerald-700 mb-8">Karibu kwenye mfumo wa kusimamia matokeo ya wanafunzi.</p>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className={`w-full bg-blue-900 text-white py-4 rounded-2xl font-semibold hover:bg-blue-800 transition-colors flex items-center justify-center gap-3 ${isLoggingIn ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoggingIn ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                Ingia na Google
              </>
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gold-50 flex flex-col lg:flex-row">
      {/* Mobile Top Bar */}
      <header className="lg:hidden bg-white border-b border-gold-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowMobileSidebar(true)}
            className="p-1.5 hover:bg-gold-50 rounded-lg text-blue-900 transition-colors"
          >
            <div className="space-y-1.5">
              <div className="w-6 h-0.5 bg-current rounded-full"></div>
              <div className="w-6 h-0.5 bg-current rounded-full"></div>
              <div className="w-6 h-0.5 bg-current rounded-full"></div>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-blue-900 p-1.5 rounded-lg">
              <GraduationCap className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-blue-900">MatokeoApp</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-gold-50 rounded-full">
            {isOnline ? (
              <>
                <Wifi size={14} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Online</span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="text-amber-500" />
                <span className="text-[10px] font-bold text-amber-600 uppercase">Offline Mode</span>
              </>
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-gold-200 flex items-center justify-center overflow-hidden">
            {user.photoURL ? <img src={user.photoURL} alt="Avatar" /> : <UserCircle className="text-blue-400" />}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {showMobileSidebar && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileSidebar(false)}
              className="lg:hidden fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white z-50 flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-gold-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-900 p-2 rounded-lg">
                    <GraduationCap className="text-white w-6 h-6" />
                  </div>
                  <span className="font-bold text-lg text-blue-900">MatokeoApp</span>
                </div>
                <button onClick={() => setShowMobileSidebar(false)} className="text-emerald-400 hover:text-blue-900">
                  <XCircle size={24} />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-2">
                <NavItem 
                  active={activeTab === 'dashboard'} 
                  onClick={() => { setActiveTab('dashboard'); setShowMobileSidebar(false); setIsAdding(false); }}
                  icon={<LayoutDashboard size={20} />}
                  label="Dashboard"
                />
                <NavItem 
                  active={activeTab === 'students'} 
                  onClick={() => { setActiveTab('students'); setShowMobileSidebar(false); setIsAdding(false); }}
                  icon={<Users size={20} />}
                  label="Wanafunzi"
                />
                <NavItem 
                  active={activeTab === 'subjects'} 
                  onClick={() => { setActiveTab('subjects'); setShowMobileSidebar(false); setIsAdding(false); }}
                  icon={<BookOpen size={20} />}
                  label="Masomo"
                />
                <NavItem 
                  active={activeTab === 'results'} 
                  onClick={() => { setActiveTab('results'); setShowMobileSidebar(false); setIsAdding(false); }}
                  icon={<FileText size={20} />}
                  label="Matokeo"
                />
              </nav>

              <div className="p-4 border-t border-gold-100">
                <div className="flex items-center gap-3 p-3 bg-gold-50 rounded-2xl mb-4">
                  <div className="w-10 h-10 rounded-full bg-gold-200 flex items-center justify-center overflow-hidden">
                    {user.photoURL ? <img src={user.photoURL} alt="Avatar" /> : <UserCircle className="text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-blue-900 truncate">{user.displayName}</p>
                    <p className="text-xs text-emerald-600 truncate capitalize">{userProfile?.role}</p>
                  </div>
                </div>
                <button 
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-emerald-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
                >
                  <LogOut size={20} />
                  <span className="font-medium">Ondoka</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar (Desktop only) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gold-200 flex-col fixed h-full">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-900 p-2 rounded-lg">
            <GraduationCap className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-lg text-blue-900">MatokeoApp</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => { setActiveTab('dashboard'); setIsAdding(false); }}
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
          />
          <NavItem 
            active={activeTab === 'students'} 
            onClick={() => { setActiveTab('students'); setIsAdding(false); }}
            icon={<Users size={20} />}
            label="Wanafunzi"
          />
          <NavItem 
            active={activeTab === 'subjects'} 
            onClick={() => { setActiveTab('subjects'); setIsAdding(false); }}
            icon={<BookOpen size={20} />}
            label="Masomo"
          />
          <NavItem 
            active={activeTab === 'results'} 
            onClick={() => { setActiveTab('results'); setIsAdding(false); }}
            icon={<FileText size={20} />}
            label="Matokeo"
          />
        </nav>

        <div className="p-4 border-t border-gold-100">
          <div className="flex items-center gap-3 p-3 bg-gold-50 rounded-2xl mb-4">
            <div className="w-10 h-10 rounded-full bg-gold-200 flex items-center justify-center overflow-hidden">
              {user.photoURL ? <img src={user.photoURL} alt="Avatar" /> : <UserCircle className="text-blue-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-900 truncate">{user.displayName}</p>
              <p className="text-xs text-emerald-600 truncate capitalize">{userProfile?.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-emerald-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Ondoka</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pb-24 lg:pb-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-blue-900 capitalize">{activeTab}</h2>
              <p className="text-emerald-600 text-sm lg:text-base">Karibu tena, {user.displayName?.split(' ')[0]}</p>
            </div>
            <div className={`hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full border ${isOnline ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
              {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
              <span className="text-xs font-bold uppercase tracking-wider">
                {isOnline ? 'Mfumo upo Online' : 'Unatumia Offline (Data zitasawazishwa)'}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="hidden sm:flex bg-blue-900 text-white px-6 py-3 rounded-2xl font-semibold items-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-gold-200"
          >
            <Plus size={20} />
            Ongeza {activeTab === 'dashboard' ? 'Matokeo' : activeTab.slice(0, -1)}
          </button>
        </header>

        {/* Mobile Floating Action Button */}
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="sm:hidden fixed right-6 bottom-24 z-40 bg-blue-900 text-white p-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={24} />
          </button>
        )}

        {/* Notifications */}
        <AnimatePresence>
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl mb-6 flex items-center gap-3"
            >
              <CheckCircle2 size={20} />
              <span>{success}</span>
              <button onClick={() => setSuccess(null)} className="ml-auto">×</button>
            </motion.div>
          )}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 flex items-center gap-3"
            >
              <AlertCircle size={20} />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto">×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content */}
        <div className="space-y-6">
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-gold-200 p-6 shadow-sm"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-blue-900">
                  Ongeza {activeTab === 'dashboard' ? 'Matokeo' : activeTab === 'students' ? 'Mwanafunzi' : activeTab === 'subjects' ? 'Somo' : 'Matokeo'}
                </h3>
                <button 
                  onClick={() => setIsAdding(false)} 
                  className="text-emerald-600 hover:text-blue-900 font-medium flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gold-50 transition-colors"
                >
                  <XCircle size={20} />
                  <span>Ghairi</span>
                </button>
              </div>

              <form 
                className="space-y-4"
                onSubmit={
                  activeTab === 'students' ? handleAddStudent : 
                  activeTab === 'subjects' ? handleAddSubject : 
                  handleAddResult
                }
              >
                {activeTab === 'students' && (
                  <>
                    <InputGroup label="Jina Kamili" name="name" placeholder="Mfn. Juma Hamisi" required />
                    <InputGroup label="Darasa" name="class" placeholder="Mfn. Form 4A" required />
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-blue-700">Jinsia</label>
                      <select name="gender" className="w-full px-4 py-3 bg-gold-50 rounded-xl border border-gold-200 outline-none focus:ring-2 focus:ring-blue-900/10 transition-all text-blue-900" required>
                        <option value="Male">Mwanaume</option>
                        <option value="Female">Mwanamke</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'subjects' && (
                  <>
                    <InputGroup label="Jina la Somo" name="name" placeholder="Mfn. Hisabati" required />
                    <InputGroup label="Kifupisho/Code" name="code" placeholder="Mfn. MATH" required />
                  </>
                )}

                {(activeTab === 'results' || activeTab === 'dashboard') && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-blue-700">Mwanafunzi</label>
                      <select name="studentId" className="w-full px-4 py-3 bg-gold-50 rounded-xl border border-gold-200 outline-none focus:ring-2 focus:ring-blue-900/10 transition-all text-blue-900" required>
                        <option value="">Chagua Mwanafunzi</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-blue-700">Somo</label>
                      <select name="subjectId" className="w-full px-4 py-3 bg-gold-50 rounded-xl border border-gold-200 outline-none focus:ring-2 focus:ring-blue-900/10 transition-all text-blue-900" required>
                        <option value="">Chagua Somo</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="Alama (0-100)" name="score" type="number" placeholder="Mfn. 85" required min="0" max="100" />
                      <InputGroup label="Mwaka" name="year" type="text" placeholder="Mfn. 2026" required />
                    </div>
                    <InputGroup label="Muhula (Term)" name="term" placeholder="Mfn. Term 1" required />
                  </>
                )}

                <button 
                  type="submit"
                  className="w-full bg-blue-900 text-white py-4 rounded-2xl font-bold hover:bg-blue-800 transition-all mt-4 shadow-lg shadow-gold-200"
                >
                  Hifadhi Taarifa
                </button>
              </form>
            </motion.div>
          )}

          {!isAdding && activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard 
                icon={<Users className="text-blue-900" />} 
                label="Wanafunzi" 
                value={students.length} 
                color="bg-blue-50"
              />
              <StatCard 
                icon={<BookOpen className="text-emerald-700" />} 
                label="Masomo" 
                value={subjects.length} 
                color="bg-emerald-50"
              />
              <StatCard 
                icon={<TrendingUp className="text-blue-900" />} 
                label="Matokeo" 
                value={results.length} 
                color="bg-blue-50"
              />
              
              <div className="md:col-span-3 bg-white p-4 lg:p-6 rounded-3xl border border-gold-200">
                <h3 className="text-lg font-bold mb-4 text-blue-900">Matokeo ya Hivi Karibuni</h3>
                <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="text-left text-blue-400 text-sm border-b border-gold-100">
                        <th className="pb-4 font-medium">Mwanafunzi</th>
                        <th className="pb-4 font-medium">Somo</th>
                        <th className="pb-4 font-medium">Alama</th>
                        <th className="pb-4 font-medium">Daraja</th>
                        <th className="pb-4 font-medium">Tarehe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold-50">
                      {results.slice(0, 5).map(result => {
                        const student = students.find(s => s.id === result.studentId);
                        const subject = subjects.find(s => s.id === result.subjectId);
                        return (
                          <tr key={result.id} className="text-blue-900">
                            <td className="py-4 font-medium">{student?.name || 'Unknown'}</td>
                            <td className="py-4 text-emerald-700">{subject?.name || 'Unknown'}</td>
                            <td className="py-4 font-bold">{result.score}</td>
                            <td className="py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getGradeColor(result.grade)}`}>
                                {result.grade}
                              </span>
                            </td>
                            <td className="py-4 text-emerald-400 text-sm">
                              {new Date(result.createdAt?.seconds * 1000).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!isAdding && activeTab === 'students' && (
            <div className="bg-white rounded-3xl border border-gold-200 overflow-hidden">
              <div className="p-4 lg:p-6 border-b border-gold-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Tafuta mwanafunzi..." 
                    className="w-full pl-10 pr-4 py-2 bg-gold-50 rounded-xl border-none focus:ring-2 focus:ring-blue-200 outline-none text-sm text-blue-900"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="text-left text-blue-400 text-sm bg-gold-50/50">
                      <th className="px-6 py-4 font-medium">Jina Kamili</th>
                      <th className="px-6 py-4 font-medium">Darasa</th>
                      <th className="px-6 py-4 font-medium">Jinsia</th>
                      <th className="px-6 py-4 font-medium">Kitendo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold-100">
                    {students.map(student => (
                      <tr key={student.id} className="hover:bg-gold-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-blue-900">{student.name}</td>
                        <td className="px-6 py-4 text-emerald-700">{student.class}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${student.gender === 'Male' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {student.gender}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="text-blue-400 hover:text-blue-900 transition-colors">
                            <ChevronRight size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!isAdding && activeTab === 'subjects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map(subject => (
                <div key={subject.id} className="bg-white p-6 rounded-3xl border border-gold-200 hover:shadow-lg transition-all group">
                  <div className="bg-blue-100 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-900 group-hover:text-white transition-colors text-blue-700">
                    <BookOpen size={24} />
                  </div>
                  <h4 className="text-xl font-bold text-blue-900 mb-1">{subject.name}</h4>
                  <p className="text-emerald-600 font-mono text-sm uppercase tracking-wider">{subject.code}</p>
                </div>
              ))}
            </div>
          )}

          {!isAdding && activeTab === 'results' && (
            <div className="bg-white rounded-3xl border border-gold-200 overflow-hidden">
              <div className="p-4 lg:p-6 border-b border-gold-100 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Tafuta matokeo..." 
                    className="w-full pl-10 pr-4 py-2 bg-gold-50 rounded-xl border-none focus:ring-2 focus:ring-blue-200 outline-none text-sm text-blue-900"
                  />
                </div>
                <button className="w-full sm:w-auto px-4 py-2 bg-gold-50 text-emerald-700 rounded-xl flex items-center justify-center gap-2 hover:bg-gold-100 transition-colors text-sm font-medium">
                  <Filter size={16} />
                  Chuja
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="text-left text-blue-400 text-sm bg-gold-50/50">
                      <th className="px-6 py-4 font-medium">Mwanafunzi</th>
                      <th className="px-6 py-4 font-medium">Somo</th>
                      <th className="px-6 py-4 font-medium">Alama</th>
                      <th className="px-6 py-4 font-medium">Daraja</th>
                      <th className="px-6 py-4 font-medium">Muhula/Mwaka</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold-100">
                    {results.map(result => {
                      const student = students.find(s => s.id === result.studentId);
                      const subject = subjects.find(s => s.id === result.subjectId);
                      return (
                        <tr key={result.id} className="hover:bg-gold-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-blue-900">{student?.name || 'N/A'}</td>
                          <td className="px-6 py-4 text-emerald-700">{subject?.name || 'N/A'}</td>
                          <td className="px-6 py-4 font-mono font-bold text-blue-900">{result.score}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getGradeColor(result.grade)}`}>
                              {result.grade}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-emerald-500 text-sm">
                            {result.term} / {result.year}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gold-200 px-6 py-3 flex justify-between items-center z-40">
        <MobileNavItem 
          active={activeTab === 'dashboard'} 
          onClick={() => { setActiveTab('dashboard'); setIsAdding(false); }}
          icon={<LayoutDashboard size={22} />}
          label="Dash"
        />
        <MobileNavItem 
          active={activeTab === 'students'} 
          onClick={() => { setActiveTab('students'); setIsAdding(false); }}
          icon={<Users size={22} />}
          label="Wanafunzi"
        />
        <MobileNavItem 
          active={activeTab === 'subjects'} 
          onClick={() => { setActiveTab('subjects'); setIsAdding(false); }}
          icon={<BookOpen size={22} />}
          label="Masomo"
        />
        <MobileNavItem 
          active={activeTab === 'results'} 
          onClick={() => { setActiveTab('results'); setIsAdding(false); }}
          icon={<FileText size={22} />}
          label="Matokeo"
        />
      </nav>
    </div>
  );
}

function MobileNavItem({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${
        active ? 'text-blue-900' : 'text-emerald-400'
      }`}
    >
      <div className={`p-1 rounded-lg transition-all ${active ? 'bg-blue-50' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
      {active && <motion.div layoutId="mobile-pill" className="w-1 h-1 rounded-full bg-blue-900" />}
    </button>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
        active 
          ? 'bg-blue-900 text-white shadow-lg shadow-gold-200' 
          : 'text-emerald-600 hover:bg-blue-50 hover:text-blue-900'
      }`}
    >
      {icon}
      <span>{label}</span>
      {active && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
    </button>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) {
  return (
    <div className="bg-white p-4 lg:p-6 rounded-3xl border border-gold-200 flex items-center gap-4 lg:gap-5">
      <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center ${color}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 24 })}
      </div>
      <div>
        <p className="text-emerald-600 text-xs lg:text-sm font-medium">{label}</p>
        <p className="text-xl lg:text-2xl font-bold text-blue-900">{value}</p>
      </div>
    </div>
  );
}

function InputGroup({ label, ...props }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-blue-700">{label}</label>
      <input 
        className="w-full px-4 py-3 bg-gold-50 rounded-xl border border-gold-200 outline-none focus:ring-2 focus:ring-blue-900/10 transition-all placeholder:text-emerald-300 text-blue-900"
        {...props}
      />
    </div>
  );
}

function getGradeColor(grade: string) {
  switch (grade) {
    case 'A': return 'bg-emerald-50 text-emerald-600';
    case 'B': return 'bg-blue-50 text-blue-600';
    case 'C': return 'bg-amber-50 text-amber-600';
    case 'D': return 'bg-orange-50 text-orange-600';
    case 'F': return 'bg-red-50 text-red-600';
    default: return 'bg-blue-50 text-blue-600';
  }
}
