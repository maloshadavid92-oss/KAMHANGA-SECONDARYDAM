import React, { useState, useEffect } from 'react';
import { 
  auth, db, loginWithGoogle, logout, onAuthStateChanged, 
  collection, doc, getDoc, setDoc, addDoc, onSnapshot, query, orderBy, where, 
  OperationType, handleFirestoreError 
} from './firebase';
import { Student, Subject, Result, UserProfile } from './types';
import { 
  LayoutDashboard, Users, BookOpen, FileText, LogOut, Plus, 
  Search, Filter, ChevronRight, GraduationCap, TrendingUp, AlertCircle,
  UserCircle, CheckCircle2, XCircle
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check/Create user profile
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUserProfile(userSnap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              role: 'teacher' // Default role
            };
            await setDoc(userRef, newProfile);
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

    const qStudents = query(collection(db, 'students'), orderBy('createdAt', 'desc'));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'students'));

    const qSubjects = query(collection(db, 'subjects'), orderBy('createdAt', 'desc'));
    const unsubSubjects = onSnapshot(qSubjects, (snap) => {
      setSubjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'subjects'));

    const qResults = query(collection(db, 'results'), orderBy('createdAt', 'desc'));
    const unsubResults = onSnapshot(qResults, (snap) => {
      setResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'results'));

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
      await addDoc(collection(db, 'students'), data);
      setSuccess("Mwanafunzi ameongezwa!");
      setShowAddModal(false);
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
      await addDoc(collection(db, 'subjects'), data);
      setSuccess("Somo limeongezwa!");
      setShowAddModal(false);
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
      await addDoc(collection(db, 'results'), data);
      setSuccess("Matokeo yamewekwa!");
      setShowAddModal(false);
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
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-stone-200"
        >
          <div className="bg-stone-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Mfumo wa Matokeo</h1>
          <p className="text-stone-500 mb-8">Karibu kwenye mfumo wa kusimamia matokeo ya wanafunzi.</p>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className={`w-full bg-stone-900 text-white py-4 rounded-2xl font-semibold hover:bg-stone-800 transition-colors flex items-center justify-center gap-3 ${isLoggingIn ? 'opacity-70 cursor-not-allowed' : ''}`}
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
    <div className="min-h-screen bg-stone-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col fixed h-full">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-stone-900 p-2 rounded-lg">
            <GraduationCap className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-lg text-stone-900">MatokeoApp</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
          />
          <NavItem 
            active={activeTab === 'students'} 
            onClick={() => setActiveTab('students')}
            icon={<Users size={20} />}
            label="Wanafunzi"
          />
          <NavItem 
            active={activeTab === 'subjects'} 
            onClick={() => setActiveTab('subjects')}
            icon={<BookOpen size={20} />}
            label="Masomo"
          />
          <NavItem 
            active={activeTab === 'results'} 
            onClick={() => setActiveTab('results')}
            icon={<FileText size={20} />}
            label="Matokeo"
          />
        </nav>

        <div className="p-4 border-t border-stone-100">
          <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl mb-4">
            <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden">
              {user.photoURL ? <img src={user.photoURL} alt="Avatar" /> : <UserCircle className="text-stone-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">{user.displayName}</p>
              <p className="text-xs text-stone-500 truncate capitalize">{userProfile?.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Ondoka</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-stone-900 capitalize">{activeTab}</h2>
            <p className="text-stone-500">Karibu tena, {user.displayName?.split(' ')[0]}</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-stone-900 text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
          >
            <Plus size={20} />
            Ongeza {activeTab === 'dashboard' ? 'Matokeo' : activeTab.slice(0, -1)}
          </button>
        </header>

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
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard 
                icon={<Users className="text-blue-600" />} 
                label="Wanafunzi" 
                value={students.length} 
                color="bg-blue-50"
              />
              <StatCard 
                icon={<BookOpen className="text-purple-600" />} 
                label="Masomo" 
                value={subjects.length} 
                color="bg-purple-50"
              />
              <StatCard 
                icon={<TrendingUp className="text-emerald-600" />} 
                label="Matokeo" 
                value={results.length} 
                color="bg-emerald-50"
              />
              
              <div className="md:col-span-3 bg-white p-6 rounded-3xl border border-stone-200">
                <h3 className="text-lg font-bold mb-4">Matokeo ya Hivi Karibuni</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-stone-400 text-sm border-b border-stone-100">
                        <th className="pb-4 font-medium">Mwanafunzi</th>
                        <th className="pb-4 font-medium">Somo</th>
                        <th className="pb-4 font-medium">Alama</th>
                        <th className="pb-4 font-medium">Daraja</th>
                        <th className="pb-4 font-medium">Tarehe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {results.slice(0, 5).map(result => {
                        const student = students.find(s => s.id === result.studentId);
                        const subject = subjects.find(s => s.id === result.subjectId);
                        return (
                          <tr key={result.id} className="text-stone-700">
                            <td className="py-4 font-medium">{student?.name || 'Unknown'}</td>
                            <td className="py-4">{subject?.name || 'Unknown'}</td>
                            <td className="py-4">{result.score}</td>
                            <td className="py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getGradeColor(result.grade)}`}>
                                {result.grade}
                              </span>
                            </td>
                            <td className="py-4 text-stone-400 text-sm">
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

          {activeTab === 'students' && (
            <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden">
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Tafuta mwanafunzi..." 
                    className="w-full pl-10 pr-4 py-2 bg-stone-50 rounded-xl border-none focus:ring-2 focus:ring-stone-200 outline-none text-sm"
                  />
                </div>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-stone-400 text-sm bg-stone-50/50">
                    <th className="px-6 py-4 font-medium">Jina Kamili</th>
                    <th className="px-6 py-4 font-medium">Darasa</th>
                    <th className="px-6 py-4 font-medium">Jinsia</th>
                    <th className="px-6 py-4 font-medium">Kitendo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {students.map(student => (
                    <tr key={student.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-stone-900">{student.name}</td>
                      <td className="px-6 py-4 text-stone-600">{student.class}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${student.gender === 'Male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                          {student.gender}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-stone-400 hover:text-stone-900 transition-colors">
                          <ChevronRight size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'subjects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map(subject => (
                <div key={subject.id} className="bg-white p-6 rounded-3xl border border-stone-200 hover:shadow-lg transition-all group">
                  <div className="bg-stone-100 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-stone-900 group-hover:text-white transition-colors">
                    <BookOpen size={24} />
                  </div>
                  <h4 className="text-xl font-bold text-stone-900 mb-1">{subject.name}</h4>
                  <p className="text-stone-500 font-mono text-sm uppercase tracking-wider">{subject.code}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'results' && (
            <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden">
              <div className="p-6 border-b border-stone-100 flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Tafuta matokeo..." 
                    className="w-full pl-10 pr-4 py-2 bg-stone-50 rounded-xl border-none focus:ring-2 focus:ring-stone-200 outline-none text-sm"
                  />
                </div>
                <button className="px-4 py-2 bg-stone-50 text-stone-600 rounded-xl flex items-center gap-2 hover:bg-stone-100 transition-colors text-sm font-medium">
                  <Filter size={16} />
                  Chuja
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-stone-400 text-sm bg-stone-50/50">
                    <th className="px-6 py-4 font-medium">Mwanafunzi</th>
                    <th className="px-6 py-4 font-medium">Somo</th>
                    <th className="px-6 py-4 font-medium">Alama</th>
                    <th className="px-6 py-4 font-medium">Daraja</th>
                    <th className="px-6 py-4 font-medium">Muhula/Mwaka</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {results.map(result => {
                    const student = students.find(s => s.id === result.studentId);
                    const subject = subjects.find(s => s.id === result.subjectId);
                    return (
                      <tr key={result.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-stone-900">{student?.name || 'N/A'}</td>
                        <td className="px-6 py-4 text-stone-600">{subject?.name || 'N/A'}</td>
                        <td className="px-6 py-4 font-mono font-bold">{result.score}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getGradeColor(result.grade)}`}>
                            {result.grade}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-stone-500 text-sm">
                          {result.term} / {result.year}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <h3 className="text-xl font-bold text-stone-900">
                  Ongeza {activeTab === 'dashboard' ? 'Matokeo' : activeTab === 'students' ? 'Mwanafunzi' : activeTab === 'subjects' ? 'Somo' : 'Matokeo'}
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-900">
                  <XCircle size={24} />
                </button>
              </div>

              <form 
                className="p-6 space-y-4"
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
                      <label className="text-sm font-semibold text-stone-700">Jinsia</label>
                      <select name="gender" className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900/10 transition-all" required>
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
                      <label className="text-sm font-semibold text-stone-700">Mwanafunzi</label>
                      <select name="studentId" className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900/10 transition-all" required>
                        <option value="">Chagua Mwanafunzi</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-stone-700">Somo</label>
                      <select name="subjectId" className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900/10 transition-all" required>
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
                  className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all mt-4 shadow-lg shadow-stone-200"
                >
                  Hifadhi Taarifa
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
        active 
          ? 'bg-stone-900 text-white shadow-lg shadow-stone-200' 
          : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
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
    <div className="bg-white p-6 rounded-3xl border border-stone-200 flex items-center gap-5">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-stone-500 text-sm font-medium">{label}</p>
        <p className="text-2xl font-bold text-stone-900">{value}</p>
      </div>
    </div>
  );
}

function InputGroup({ label, ...props }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-stone-700">{label}</label>
      <input 
        className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900/10 transition-all placeholder:text-stone-300"
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
    default: return 'bg-stone-50 text-stone-600';
  }
}
