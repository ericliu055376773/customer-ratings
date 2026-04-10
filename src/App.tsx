import React, { useState, useEffect, useRef } from 'react';

// ==========================================
// 1. 白屏防護罩 (Error Boundary)
// ==========================================
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', backgroundColor: '#FEF2F2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#3E3124' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#DC2626', marginBottom: '1rem' }}>畫面渲染錯誤</h1>
          <pre style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '42rem', overflow: 'auto', fontSize: '0.875rem', border: '1px solid #FECACA' }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// Types, Constants & SVG Helpers
// ==========================================
type RatingLevel = 1 | 2 | 3 | 4 | 5;

interface MoodConfig {
  value: RatingLevel;
  text: string;
  color: string;
}

interface Store {
  id: string;
  name: string;
  password?: string;
}

interface RatingData {
  id: string;
  storeId: string;
  storeName: string;
  ratingValue: number;
  ratingText: string;
  timestamp: any;
}

const MOODS: Record<RatingLevel, MoodConfig> = {
  1: { value: 1, text: "感覺極差 (Terrible)", color: "#8C84E9" },
  2: { value: 2, text: "感覺不好 (Bad)", color: "#EF8761" },
  3: { value: 3, text: "感覺普通 (Neutral)", color: "#7DA164" }, 
  4: { value: 4, text: "感覺不錯 (Good)", color: "#A8C686" },
  5: { value: 5, text: "非常滿意 (Excellent)", color: "#F3D060" } 
};

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, startAngle);
  const end = polarToCartesian(x, y, radius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y
  ].join(" ");
}

// ==========================================
// Components
// ==========================================
const DynamicFace = ({ rating, className = "", style }: { rating: RatingLevel; className?: string; style?: React.CSSProperties }) => {
  const config = MOODS[rating];

  return (
    <svg viewBox="0 0 100 100" className={`transition-all duration-500 ease-out ${className}`} style={{ width: '100%', height: '100%', ...style }}>
      <circle cx="50" cy="50" r="50" fill={config.color} className="transition-colors duration-500" />
      <g stroke="#3E3124" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" className="transition-all duration-300">
        {rating === 1 && (
          <>
            <line x1="30" y1="35" x2="42" y2="47" />
            <line x1="42" y1="35" x2="30" y2="47" />
            <line x1="58" y1="35" x2="70" y2="47" />
            <line x1="70" y1="35" x2="58" y2="47" />
            <path d="M 32 65 Q 40 55 50 65 T 68 65" />
          </>
        )}
        {rating === 2 && (
          <>
            <line x1="36" y1="38" x2="36" y2="48" strokeWidth="8" />
            <line x1="64" y1="38" x2="64" y2="48" strokeWidth="8" />
            <path d="M 35 68 Q 50 55 65 68" />
          </>
        )}
        {rating === 3 && (
          <>
            <line x1="36" y1="38" x2="36" y2="48" strokeWidth="8" />
            <line x1="64" y1="38" x2="64" y2="48" strokeWidth="8" />
            <line x1="35" y1="65" x2="65" y2="65" />
          </>
        )}
        {rating === 4 && (
          <>
            <path d="M 30 40 Q 36 48 42 40" />
            <path d="M 58 40 Q 64 48 70 40" />
            <path d="M 35 62 Q 50 75 65 62" />
          </>
        )}
        {rating === 5 && (
          <>
            <path d="M 28 45 Q 35 35 42 45" />
            <path d="M 58 45 Q 65 35 72 45" />
            <path d="M 32 60 Q 50 85 68 60 Z" fill="#3E3124" />
          </>
        )}
      </g>
    </svg>
  );
};

// ==========================================
// 3. 主應用程式
// ==========================================
function RatingApp() {
  // --- 評分系統狀態 ---
  const [rating, setRating] = useState<RatingLevel>(3);
  const [gaugeRotation, setGaugeRotation] = useState(0); 
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  
  // --- 後台自訂設定狀態 ---
  const [mainQuestion, setMainQuestion] = useState("您今天的心情\n感覺如何？");
  const [customMessage, setCustomMessage] = useState("滑動來評分");
  const [customTextAlign, setCustomTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [fontFamily, setFontFamily] = useState<string>('font-sans'); 
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // --- 帳號登入與管理系統狀態 ---
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  
  // 登入表單狀態
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // 新增分店表單狀態
  const [newStoreName, setNewStoreName] = useState('');
  const [newStorePassword, setNewStorePassword] = useState('');
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [addStoreError, setAddStoreError] = useState('');

  // --- 數據分析儀表板狀態 ---
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'trend' | 'compare'>('trend');
  const [allRatings, setAllRatings] = useState<RatingData[]>([]);
  const [dashSelectedStoreId, setDashSelectedStoreId] = useState<string>('all');

  // --- 獨立管理員密碼驗證狀態 (0204) ---
  const [authPromptContext, setAuthPromptContext] = useState<'admin' | 'dashboard' | null>(null);
  const [adminPwd, setAdminPwd] = useState('');
  const [adminPwdError, setAdminPwdError] = useState('');

  const [user, setUser] = useState<any>(null);
  
  const gaugeRef = useRef<SVGSVGElement>(null);
  const faceContainerRef = useRef<HTMLDivElement>(null);
  const dragStartAngle = useRef(0);
  const dragStartRotation = useRef(0);
  const dragMoved = useRef(false);

  // 用 useRef 儲存動態載入的 Firebase 方法
  const authRef = useRef<any>(null);
  const dbRef = useRef<any>(null);
  const addDocRef = useRef<any>(null);
  const collectionRef = useRef<any>(null);
  const serverTimestampRef = useRef<any>(null);
  const deleteDocRef = useRef<any>(null);
  const docRef = useRef<any>(null);
  const onSnapshotRef = useRef<any>(null);

  useEffect(() => {
    // 確保 TailwindCSS 樣式正確載入
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }

    setStores([
      { id: 'store-1', name: '載入中...', password: '123' },
    ]);

    const initFirebase = async () => {
      try {
        // @ts-ignore
        const { initializeApp } = await import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
        // @ts-ignore
        const { getAuth, signInAnonymously, onAuthStateChanged } = await import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
        // @ts-ignore
        const { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, deleteDoc, doc } = await import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

        addDocRef.current = addDoc;
        collectionRef.current = collection;
        serverTimestampRef.current = serverTimestamp;
        deleteDocRef.current = deleteDoc;
        docRef.current = doc;
        onSnapshotRef.current = onSnapshot;

        const firebaseConfig = {
          apiKey: "AIzaSyAT3wmU155GpYkZHdYRSIML9-VpBHTBDAY",
          authDomain: "customer-ratings-65587.firebaseapp.com",
          projectId: "customer-ratings-65587",
          storageBucket: "customer-ratings-65587.firebasestorage.app",
          messagingSenderId: "39297783333",
          appId: "1:39297783333:web:91ade134a181eb4bcd51cc"
        };

        const app = initializeApp(firebaseConfig);
        authRef.current = getAuth(app);
        dbRef.current = getFirestore(app);

        await signInAnonymously(authRef.current).catch(() => console.warn('測試登入跳過'));

        onAuthStateChanged(authRef.current, (currentUser: any) => {
          setUser(currentUser);
          if (currentUser) {
            const appIdStr = 'customer-rating-app';
            const storesRef = collection(dbRef.current, 'artifacts', appIdStr, 'public', 'data', 'stores');

            onSnapshot(storesRef, (snapshot: any) => {
              const loadedStores: Store[] = [];
              snapshot.forEach((docSnap: any) => {
                loadedStores.push({ id: docSnap.id, ...docSnap.data() } as Store);
              });
              setStores(loadedStores);
            }, (err: any) => {
              console.error("Fetch stores error:", err);
            });
          }
        });
      } catch (error) {
        console.warn("Firebase 載入失敗，已切換至純 UI 展示模式", error);
        setStores([
          { id: 'store-1', name: '台北信義店 (測試)', password: '123' },
          { id: 'store-2', name: '台中勤美店 (測試)', password: '456' }
        ]);
      }
    };

    initFirebase();
  }, []);

  useEffect(() => {
    if (stores.length > 0) {
      const isValidStore = stores.some(s => s.id === selectedStoreId);
      if (!selectedStoreId || !isValidStore) {
        setSelectedStoreId(stores[0].id);
      }
    } else {
      setSelectedStoreId('');
    }
  }, [stores, selectedStoreId]);

  // 動態表情縮放特效
  useEffect(() => {
    if (faceContainerRef.current && isLoggedIn) {
      faceContainerRef.current.classList.remove('scale-100');
      faceContainerRef.current.classList.add('scale-110');
      setTimeout(() => {
        if (faceContainerRef.current) {
          faceContainerRef.current.classList.remove('scale-110');
          faceContainerRef.current.classList.add('scale-100');
        }
      }, 150);
    }
  }, [rating, isLoggedIn]);

  // 監聽並抓取數據分析所需的所有評分
  useEffect(() => {
    if (!isDashboardOpen) return;

    if (!dbRef.current || !collectionRef.current || !onSnapshotRef.current) {
      // 如果沒有資料庫，提供一些測試用假數據來預覽後台
      setAllRatings([
        { id: '1', storeId: 'store-1', storeName: '台北信義店 (測試)', ratingValue: 5, ratingText: '非常滿意', timestamp: { seconds: Date.now() / 1000 } },
        { id: '2', storeId: 'store-1', storeName: '台北信義店 (測試)', ratingValue: 4, ratingText: '感覺不錯', timestamp: { seconds: Date.now() / 1000 - 86400 * 2 } },
        { id: '3', storeId: 'store-2', storeName: '台中勤美店 (測試)', ratingValue: 3, ratingText: '感覺普通', timestamp: { seconds: Date.now() / 1000 - 86400 * 10 } },
      ]);
      return;
    }

    const appIdStr = 'customer-rating-app';
    // 為了能抓到所有評分，將路徑從 user 私有池改到 public 池統一管理
    const allRatingsRef = collectionRef.current(dbRef.current, 'artifacts', appIdStr, 'public', 'data', 'ratings');
    
    const unsubscribe = onSnapshotRef.current(allRatingsRef, (snapshot: any) => {
      const fetched: RatingData[] = [];
      snapshot.forEach((doc: any) => {
        fetched.push({ id: doc.id, ...doc.data() } as RatingData);
      });
      setAllRatings(fetched);
    }, (err: any) => {
      console.error("Fetch all ratings error:", err);
    });

    return () => unsubscribe();
  }, [isDashboardOpen]);

  // --- 互動邏輯 ---
  const getAngleFromEvent = (e: React.PointerEvent | PointerEvent) => {
    if (!gaugeRef.current) return undefined;
    const rect = gaugeRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.bottom; 
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    return Math.atan2(dy, dx) * (180 / Math.PI) + 90; 
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const angle = getAngleFromEvent(e);
    if (angle === undefined) return;
    setIsDragging(true);
    dragStartAngle.current = angle;
    dragStartRotation.current = gaugeRotation;
    dragMoved.current = false;
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !isLoggedIn) return;
      const angle = getAngleFromEvent(e);
      if (angle === undefined) return;
      
      const delta = angle - dragStartAngle.current;
      if (Math.abs(delta) > 2) dragMoved.current = true;

      let newRot = dragStartRotation.current + delta;
      newRot = clamp(newRot, -72, 72);
      
      setGaugeRotation(newRot);
      setRating(clamp(3 - Math.round(newRot / 36), 1, 5) as RatingLevel);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging || !isLoggedIn) return;
      setIsDragging(false);
      
      let finalRot = gaugeRotation;
      if (!dragMoved.current) {
        const angle = getAngleFromEvent(e);
        if (angle !== undefined) {
          finalRot = gaugeRotation - angle;
        }
      }
      
      let targetRot = Math.round(finalRot / 36) * 36;
      targetRot = clamp(targetRot, -72, 72);
      
      setGaugeRotation(targetRot);
      setRating(clamp(3 - Math.round(targetRot / 36), 1, 5) as RatingLevel);
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, gaugeRotation, isLoggedIn]);

  // --- 管理員密碼驗證處理 (0204) ---
  const handleAdminAuth = () => {
    if (adminPwd === '0204') {
      // 密碼正確，開啟對應的彈跳視窗
      if (authPromptContext === 'admin') setIsAdminOpen(true);
      else if (authPromptContext === 'dashboard') setIsDashboardOpen(true);
      
      // 清空狀態
      setAuthPromptContext(null);
      setAdminPwd('');
      setAdminPwdError('');
    } else {
      setAdminPwdError('密碼錯誤');
    }
  };

  const cancelAdminAuth = () => {
    setAuthPromptContext(null);
    setAdminPwd('');
    setAdminPwdError('');
  };

  // --- 操作處理 ---
  const handleLogin = () => {
    const store = stores.find(s => s.id === selectedStoreId);
    if (store && store.password?.trim() === loginPassword.trim()) {
      setCurrentStore(store);
      setIsLoggedIn(true);
      setLoginError('');
      setLoginPassword(''); 
    } else {
      setLoginError('密碼錯誤或無效的分店');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentStore(null);
  };

  const handleAddStore = async () => {
    if (!newStoreName || !newStorePassword) return;
    
    setIsAddingStore(true);
    setAddStoreError('');

    if (!dbRef.current || !addDocRef.current || !collectionRef.current) {
      const newStore = { id: `temp-${Date.now()}`, name: newStoreName, password: newStorePassword };
      setStores([...stores, newStore]);
      setNewStoreName('');
      setNewStorePassword('');
      setIsAddingStore(false);
      return;
    }

    try {
      const appIdStr = 'customer-rating-app';
      const storesRef = collectionRef.current(dbRef.current, 'artifacts', appIdStr, 'public', 'data', 'stores');
      await addDocRef.current(storesRef, {
        name: newStoreName.trim(), 
        password: newStorePassword.trim()
      });
      setNewStoreName('');
      setNewStorePassword('');
    } catch (error) {
      console.error("Error adding store:", error);
      setAddStoreError("資料庫權限不足！請至 Firebase 開放 Firestore 讀寫規則。");
    } finally {
      setIsAddingStore(false);
    }
  };

  const handleDeleteStore = async (id: string) => {
    if (!dbRef.current || !deleteDocRef.current || !docRef.current) {
      setStores(stores.filter(s => s.id !== id));
      return;
    }
    try {
      const appIdStr = 'customer-rating-app';
      const storeDoc = docRef.current(dbRef.current, 'artifacts', appIdStr, 'public', 'data', 'stores', id);
      await deleteDocRef.current(storeDoc);
      if (currentStore?.id === id) handleLogout(); 
    } catch (error) {
      console.error("Error deleting store:", error);
    }
  };

  const handleSaveRating = async () => {
    setIsSaving(true);
    setSaveStatus('');
    
    if (!authRef.current || !dbRef.current || !user || !addDocRef.current || !serverTimestampRef.current) {
      setTimeout(() => {
        setSaveStatus(`UI測試模式：${currentStore?.name} 的評分已送出！`);
        setIsSaving(false);
        setTimeout(() => setSaveStatus(''), 3000);
      }, 800);
      return;
    }

    try {
      const appIdStr = 'customer-rating-app';
      const ratingsRef = collectionRef.current(dbRef.current, 'artifacts', appIdStr, 'public', 'data', 'ratings');
      await addDocRef.current(ratingsRef, {
        storeId: currentStore?.id,
        storeName: currentStore?.name, 
        ratingValue: rating,
        ratingText: MOODS[rating].text,
        timestamp: serverTimestampRef.current()
      });
      setSaveStatus('評分已成功送出！');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error("Error saving rating:", error);
      setSaveStatus('送出失敗，請檢查資料庫規則設定。');
    } finally {
      setIsSaving(false);
    }
  };

  // --- 數據分析計算輔助函數 ---
  const getPeriodStats = (ratings: RatingData[]) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = new Date(todayStart - now.getDay() * 86400000).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).getTime();
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

    const getAvg = (list: RatingData[]) => list.length ? (list.reduce((a,b)=>a+b.ratingValue,0)/list.length).toFixed(1) : '-';

    const parseTime = (ts: any) => ts ? (ts.toMillis ? ts.toMillis() : (ts.seconds ? ts.seconds * 1000 : Date.now())) : Date.now();

    const daily = ratings.filter(r => parseTime(r.timestamp) >= todayStart);
    const weekly = ratings.filter(r => parseTime(r.timestamp) >= weekStart);
    const monthly = ratings.filter(r => parseTime(r.timestamp) >= monthStart);
    const quarterly = ratings.filter(r => parseTime(r.timestamp) >= quarterStart);
    const yearly = ratings.filter(r => parseTime(r.timestamp) >= yearStart);

    return [
      { label: '本日', avg: getAvg(daily), count: daily.length },
      { label: '本週', avg: getAvg(weekly), count: weekly.length },
      { label: '本月', avg: getAvg(monthly), count: monthly.length },
      { label: '本季', avg: getAvg(quarterly), count: quarterly.length },
      { label: '本年', avg: getAvg(yearly), count: yearly.length },
    ];
  };

  return (
    <div 
      className={`min-h-screen bg-[#F8F8F8] flex items-center justify-center p-8 selection:bg-orange-200 overflow-hidden ${fontFamily}`}
      style={{ minHeight: '100vh', backgroundColor: '#F8F8F8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3E3124' }}
    >
      
      {/* ========================================================= */}
      {/* 浮動功能按鈕區 */}
      {/* ========================================================= */}

      {/* 浮動齒輪按鈕 (後台設定) */}
      <button 
        onClick={() => setAuthPromptContext('admin')}
        className="fixed top-6 right-6 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-gray-800 hover:shadow-lg transition-all z-40 border border-gray-100"
        title="後台設定"
        style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', width: '3rem', height: '3rem', backgroundColor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 40, cursor: 'pointer', border: 'none' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>

      {/* 浮動數據分析按鈕 (在齒輪下方) */}
      <button 
        onClick={() => setAuthPromptContext('dashboard')}
        className="fixed right-6 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-[#7DA164] hover:text-[#5d7c49] hover:shadow-lg transition-all z-40 border border-gray-100"
        title="數據分析報表"
        style={{ position: 'fixed', top: '5.5rem', right: '1.5rem', width: '3rem', height: '3rem', backgroundColor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 40, cursor: 'pointer', border: 'none' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
      </button>

      {/* ========================================================= */}
      {/* 統一管理員密碼輸入視窗 (0204) */}
      {/* ========================================================= */}
      {authPromptContext && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1.5rem', width: '100%', maxWidth: '22rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ width: '4rem', height: '4rem', backgroundColor: '#F3F4F6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4B5563' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
            </div>
            <h2 className="text-xl font-extrabold text-[#3E3124] mb-2 text-center" style={{ fontSize: '1.25rem', fontWeight: '900', color: '#3E3124', marginBottom: '0.5rem', textAlign: 'center' }}>
              系統安全驗證
            </h2>
            <p className="text-center text-gray-500 mb-6 text-sm" style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              請輸入管理員密碼以進入{authPromptContext === 'admin' ? '後台設定' : '數據分析'}。
            </p>
            
            <input
              type="password"
              value={adminPwd}
              onChange={(e) => setAdminPwd(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminAuth()}
              placeholder="請輸入密碼"
              className="w-full bg-gray-50 border-2 border-gray-200 text-[#3E3124] text-lg rounded-xl focus:ring-[#7DA164] focus:border-[#7DA164] block p-3 outline-none transition-colors mb-2 text-center tracking-widest"
              style={{ width: '100%', backgroundColor: '#F9FAFB', border: '2px solid #E5E7EB', color: '#3E3124', fontSize: '1.125rem', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center', letterSpacing: '0.2em' }}
              autoFocus
            />
            
            {adminPwdError && (
              <p className="text-red-500 text-sm font-bold text-center mb-4" style={{ color: '#EF4444', fontSize: '0.875rem', fontWeight: 'bold', textAlign: 'center', marginTop: '0.5rem' }}>
                {adminPwdError}
              </p>
            )}
            
            <div className="flex gap-3 mt-6" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={cancelAdminAuth}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#E5E7EB', color: '#374151', borderRadius: '0.75rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              >
                取消
              </button>
              <button
                onClick={handleAdminAuth}
                className="flex-1 bg-[#3E3124] text-white py-3 rounded-xl font-bold hover:bg-black transition-colors"
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#3E3124', color: 'white', borderRadius: '0.75rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 後台管理彈跳視窗 (Modal) */}
      {/* ========================================================= */}
      {isAdminOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1.5rem', width: '100%', maxWidth: '32rem' }}>
            <h2 className="text-2xl font-extrabold text-[#3E3124] mb-6 flex items-center justify-between">
              後台管理設定
              {isLoggedIn && (
                <button onClick={handleLogout} className="text-sm bg-red-100 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-200" style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>
                  登出目前分店
                </button>
              )}
            </h2>
            
            {/* 區塊 1：帳號管理 */}
            <div className="mb-8 bg-gray-50 p-5 rounded-2xl border border-gray-100" style={{ backgroundColor: '#F9FAFB', padding: '1.25rem', borderRadius: '1rem', marginBottom: '2rem', border: '1px solid #F3F4F6' }}>
              <h3 className="text-lg font-bold text-[#3E3124] mb-4 border-b pb-2">📍 分店帳號管理</h3>
              
              {/* 現有分店列表 */}
              <div className="space-y-2 mb-5 max-h-40 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem', maxHeight: '10rem', overflowY: 'auto' }}>
                {stores.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">目前無任何分店，請新增。</p>
                ) : (
                  stores.map(store => (
                    <div key={store.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #E5E7EB' }}>
                      <div>
                        <div className="font-bold text-[#3E3124] text-sm">{store.name}</div>
                        <div className="text-xs text-gray-400 font-mono">密碼: {store.password}</div>
                      </div>
                      <button onClick={() => handleDeleteStore(store.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg" style={{ color: '#EF4444', padding: '0.5rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* 新增分店表單 */}
              <div className="flex flex-col gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="新分店名稱" 
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-[#3E3124] text-sm rounded-lg p-2.5 outline-none focus:border-[#7DA164]"
                  style={{ width: '100%', padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}
                />
                <div className="flex gap-2" style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="設定密碼" 
                    value={newStorePassword}
                    onChange={(e) => setNewStorePassword(e.target.value)}
                    className="flex-1 bg-white border border-gray-200 text-[#3E3124] text-sm rounded-lg p-2.5 outline-none focus:border-[#7DA164]"
                    style={{ flex: 1, padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}
                  />
                  <button 
                    onClick={handleAddStore}
                    disabled={!newStoreName || !newStorePassword || isAddingStore}
                    className="bg-[#7DA164] text-white font-bold px-4 rounded-lg disabled:opacity-50"
                    style={{ backgroundColor: '#7DA164', color: 'white', fontWeight: 'bold', padding: '0 1rem', borderRadius: '0.5rem', border: 'none', cursor: (!newStoreName || !newStorePassword || isAddingStore) ? 'not-allowed' : 'pointer', opacity: (!newStoreName || !newStorePassword || isAddingStore) ? 0.5 : 1 }}
                  >
                    {isAddingStore ? '處理中...' : '新增'}
                  </button>
                </div>
                {addStoreError && (
                  <div style={{ color: '#EF4444', fontSize: '0.875rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                    {addStoreError}
                  </div>
                )}
              </div>
            </div>

            {/* 區塊 2：介面設定 */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-6" style={{ backgroundColor: '#F9FAFB', padding: '1.25rem', borderRadius: '1rem', marginBottom: '1.5rem', border: '1px solid #F3F4F6' }}>
              <h3 className="text-lg font-bold text-[#3E3124] mb-4 border-b pb-2">🎨 介面文案設定</h3>
              
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">主標題</label>
                <textarea 
                  value={mainQuestion}
                  onChange={(e) => setMainQuestion(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-[#3E3124] text-sm rounded-lg p-2 outline-none focus:border-[#7DA164] resize-none"
                  rows={2}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB', resize: 'none' }}
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">備註顯示文字</label>
                <textarea 
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-[#3E3124] text-sm rounded-lg p-2 outline-none focus:border-[#7DA164] resize-none"
                  rows={2}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB', resize: 'none' }}
                />
              </div>

              <div className="flex gap-3" style={{ display: 'flex', gap: '0.75rem' }}>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">文字對齊</label>
                  <select 
                    value={customTextAlign}
                    onChange={(e) => setCustomTextAlign(e.target.value as 'left' | 'center' | 'right')}
                    className="w-full bg-white border border-gray-200 text-[#3E3124] text-sm rounded-lg p-2 outline-none"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}
                  >
                    <option value="left">靠左</option>
                    <option value="center">置中</option>
                    <option value="right">靠右</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">網頁字體</label>
                  <select 
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-[#3E3124] text-sm rounded-lg p-2 outline-none"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}
                  >
                    <option value="font-sans">無襯線 (預設)</option>
                    <option value="font-serif">襯線體</option>
                    <option value="font-mono">等寬體</option>
                  </select>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsAdminOpen(false)}
              className="w-full bg-[#3E3124] text-white py-3.5 rounded-xl font-bold text-lg hover:bg-black transition-colors shadow-md"
              style={{ width: '100%', padding: '0.875rem', backgroundColor: '#3E3124', color: 'white', borderRadius: '0.75rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              完成並關閉
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 數據分析報表彈跳視窗 (Dashboard Modal) */}
      {/* ========================================================= */}
      {isDashboardOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1.5rem', width: '100%', maxWidth: '42rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="text-2xl font-extrabold text-[#3E3124] flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7DA164" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                評分數據分析
              </h2>
              <button onClick={() => setIsDashboardOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* 頁籤切換 */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', backgroundColor: '#F3F4F6', padding: '0.375rem', borderRadius: '0.75rem' }}>
              <button 
                onClick={() => setDashboardTab('trend')}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '0.875rem', border: 'none', cursor: 'pointer', backgroundColor: dashboardTab === 'trend' ? 'white' : 'transparent', color: dashboardTab === 'trend' ? '#3E3124' : '#6B7280', boxShadow: dashboardTab === 'trend' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
              >
                各分店趨勢
              </button>
              <button 
                onClick={() => setDashboardTab('compare')}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '0.875rem', border: 'none', cursor: 'pointer', backgroundColor: dashboardTab === 'compare' ? 'white' : 'transparent', color: dashboardTab === 'compare' ? '#3E3124' : '#6B7280', boxShadow: dashboardTab === 'compare' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
              >
                門店比較
              </button>
            </div>

            {/* 頁面 1: 各分店趨勢 */}
            {dashboardTab === 'trend' && (
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#4B5563', marginBottom: '0.5rem' }}>篩選分店</label>
                  <select 
                    value={dashSelectedStoreId}
                    onChange={(e) => setDashSelectedStoreId(e.target.value)}
                    style={{ width: '100%', backgroundColor: '#F9FAFB', border: '2px solid #E5E7EB', color: '#3E3124', fontSize: '1rem', borderRadius: '0.5rem', padding: '0.75rem' }}
                  >
                    <option value="all">所有分店總計</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                  {(() => {
                    const filteredRatings = dashSelectedStoreId === 'all' 
                      ? allRatings 
                      : allRatings.filter(r => r.storeId === dashSelectedStoreId);
                    const stats = getPeriodStats(filteredRatings);

                    return stats.map((stat, idx) => (
                      <div key={idx} style={{ backgroundColor: '#F8F8F8', border: '1px solid #E5E7EB', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: 'bold', marginBottom: '0.25rem' }}>{stat.label}平均</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '900', color: stat.avg !== '-' ? '#7DA164' : '#D1D5DB' }}>
                          {stat.avg} <span style={{ fontSize: '1rem' }}>★</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.25rem' }}>共 {stat.count} 筆</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* 頁面 2: 門店比較 */}
            {dashboardTab === 'compare' && (
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1rem' }}>列出各分店的總體平均評分表現 (滿分 5.0)</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(() => {
                    // 分組計算
                    const storeStats: Record<string, { name: string, sum: number, count: number }> = {};
                    allRatings.forEach(r => {
                      if (!storeStats[r.storeId]) storeStats[r.storeId] = { name: r.storeName || '未知分店', sum: 0, count: 0 };
                      storeStats[r.storeId].sum += r.ratingValue;
                      storeStats[r.storeId].count += 1;
                    });

                    const ranking = Object.values(storeStats)
                      .map(s => ({ ...s, avg: s.sum / s.count }))
                      .sort((a, b) => b.avg - a.avg);

                    if (ranking.length === 0) return <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>目前尚無任何評分資料</div>;

                    return ranking.map((store, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', padding: '1rem', borderRadius: '1rem', border: '1px solid #F3F4F6' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 'bold', color: '#3E3124' }}>{store.name}</span>
                          <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>累計 {store.count} 筆評價</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ fontWeight: '900', fontSize: '1.5rem', color: '#EF8761' }}>{store.avg.toFixed(1)}</div>
                          <span style={{ color: '#F3D060', fontSize: '1.25rem' }}>★</span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 判斷：若未登入則顯示登入畫面，若已登入則顯示評分畫面 */}
      {/* ========================================================= */}
      {!isLoggedIn ? (
        
        /* --- 登入介面 --- */
        <div className="bg-white p-10 rounded-[2rem] shadow-xl w-full max-w-md flex flex-col items-center" style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', width: '100%', maxWidth: '28rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* Logo 或圖示區 */}
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6 text-orange-500" style={{ width: '5rem', height: '5rem', backgroundColor: '#FFEDD5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: '#F97316' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          
          <h2 className="text-3xl font-extrabold text-[#3E3124] mb-2" style={{ fontSize: '1.875rem', fontWeight: '900', color: '#3E3124', marginBottom: '0.5rem' }}>店鋪登入</h2>
          <p className="text-gray-500 mb-8" style={{ color: '#6B7280', marginBottom: '2rem' }}>請選擇您的分店並輸入密碼以啟用評分系統</p>

          <div className="w-full space-y-5" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* 選擇分店 */}
            <div style={{ width: '100%' }}>
              <label className="block text-sm font-bold text-gray-600 mb-2" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#4B5563', marginBottom: '0.5rem' }}>選擇分店</label>
              <select 
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-200 text-[#3E3124] text-lg rounded-xl focus:ring-[#7DA164] focus:border-[#7DA164] block p-4 outline-none transition-colors"
                style={{ width: '100%', backgroundColor: '#F9FAFB', border: '2px solid #E5E7EB', color: '#3E3124', fontSize: '1.125rem', borderRadius: '0.75rem', padding: '1rem' }}
              >
                {stores.length === 0 ? (
                  <option value="" disabled>載入中或無分店資料...</option>
                ) : (
                  stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))
                )}
              </select>
            </div>

            {/* 輸入密碼 */}
            <div style={{ width: '100%' }}>
              <label className="block text-sm font-bold text-gray-600 mb-2" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#4B5563', marginBottom: '0.5rem' }}>分店密碼</label>
              <input 
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="請輸入密碼"
                className="w-full bg-gray-50 border-2 border-gray-200 text-[#3E3124] text-lg rounded-xl focus:ring-[#7DA164] focus:border-[#7DA164] block p-4 outline-none transition-colors"
                style={{ width: '100%', backgroundColor: '#F9FAFB', border: '2px solid #E5E7EB', color: '#3E3124', fontSize: '1.125rem', borderRadius: '0.75rem', padding: '1rem' }}
              />
            </div>

            {/* 錯誤提示 */}
            {loginError && (
              <div className="text-red-500 text-sm font-bold text-center" style={{ color: '#EF4444', fontSize: '0.875rem', fontWeight: 'bold', textAlign: 'center' }}>
                {loginError}
              </div>
            )}

            {/* 登入按鈕 */}
            <button 
              onClick={handleLogin}
              disabled={!selectedStoreId || !loginPassword}
              className="w-full mt-4 bg-[#3E3124] text-white py-4 rounded-xl font-bold text-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ width: '100%', marginTop: '1rem', backgroundColor: '#3E3124', color: 'white', padding: '1rem', borderRadius: '0.75rem', fontWeight: 'bold', fontSize: '1.25rem', border: 'none', cursor: (!selectedStoreId || !loginPassword) ? 'not-allowed' : 'pointer', opacity: (!selectedStoreId || !loginPassword) ? 0.5 : 1 }}
            >
              進入評分系統
            </button>

          </div>
        </div>

      ) : (

        /* --- 評分介面 (已登入) --- */
        <div className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-center gap-10 md:gap-24 relative animate-in fade-in duration-500" style={{ display: 'flex', flexWrap: 'wrap', width: '100%', maxWidth: '72rem', justifyContent: 'center', gap: '2.5rem' }}>
          
          {/* 左側：問題與表情 */}
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '28rem' }}>
            
            <h1 className="text-[36px] md:text-[44px] font-extrabold text-[#3E3124] text-center leading-tight mb-4 tracking-wide whitespace-pre-line" style={{ fontSize: '2.5rem', fontWeight: '900', textAlign: 'center', whiteSpace: 'pre-line', marginBottom: '1rem' }}>
              {mainQuestion}
            </h1>

            <div className="text-gray-500 font-medium text-xl md:text-2xl mb-10 transition-all duration-300" style={{ color: '#6B7280', fontSize: '1.25rem', marginBottom: '2.5rem' }}>
              {MOODS[rating].text}
            </div>

            <div 
              ref={faceContainerRef}
              className="w-48 h-48 md:w-64 md:h-64 transition-transform duration-300 ease-in-out transform origin-center rounded-full shadow-2xl"
              style={{ width: '12rem', height: '12rem', transition: 'transform 300ms', borderRadius: '9999px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            >
              <DynamicFace rating={rating} />
            </div>
          </div>

          {/* 右側：滑輪與按鈕 */}
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg relative mt-8 md:mt-0" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '32rem', position: 'relative' }}>
            <div className="w-full max-w-[420px] flex justify-between px-8 mb-4 pointer-events-none opacity-50" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 2rem', opacity: 0.5 }}>
              <DynamicFace rating={1} className="w-12 h-12 opacity-60" style={{ width: '3rem', height: '3rem' }} />
              <DynamicFace rating={5} className="w-12 h-12 opacity-60" style={{ width: '3rem', height: '3rem' }} />
            </div>

            <div className="relative w-[380px] h-[190px] mb-8" style={{ position: 'relative', width: '380px', height: '190px', marginBottom: '2rem' }}>
              <svg 
                ref={gaugeRef}
                viewBox="0 0 400 200" 
                className={`w-full h-full touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onPointerDown={handlePointerDown}
                style={{ width: '100%', height: '100%', touchAction: 'none', cursor: isDragging ? 'grabbing' : 'grab' }}
              >
                <g 
                  transform={`rotate(${gaugeRotation}, 200, 200)`}
                  className={isDragging ? "" : "transition-transform duration-500 ease-out"}
                  style={{ transition: isDragging ? 'none' : 'transform 500ms ease-out' }}
                >
                  {/* 色塊路徑 */}
                  <path d={describeArc(200, 200, 150, -180, -54)} fill="none" stroke={MOODS[1].color} strokeWidth="60" />
                  <path d={describeArc(200, 200, 150, -54, -18)} fill="none" stroke={MOODS[2].color} strokeWidth="60" />
                  <path d={describeArc(200, 200, 150, -18, 18)} fill="none" stroke={MOODS[3].color} strokeWidth="60" />
                  <path d={describeArc(200, 200, 150, 18, 54)} fill="none" stroke={MOODS[4].color} strokeWidth="60" />
                  <path d={describeArc(200, 200, 150, 54, 180)} fill="none" stroke={MOODS[5].color} strokeWidth="60" />
                  
                  {/* 【新增】：在色塊上方添加 1~5 的數字 */}
                  {[1, 2, 3, 4, 5].map(val => {
                    const angle = (val - 3) * 36; // 根據滑輪邏輯，1 是 -72度，5 是 72度
                    const pos = polarToCartesian(200, 200, 150, angle);
                    return (
                      <text 
                        key={val} 
                        x={pos.x} 
                        y={pos.y} 
                        textAnchor="middle" 
                        dominantBaseline="central" 
                        fill="white" 
                        fontSize="28" 
                        fontWeight="bold" 
                        opacity="0.8"
                        style={{ userSelect: 'none' }}
                      >
                        {val}
                      </text>
                    );
                  })}
                </g>

                <g transform="translate(200, 200) scale(1.1)">
                  <path d="M -30 0 C -30 -20 -15 -30 -10 -35 L -6 -110 A 6 6 0 0 1 6 -110 L 10 -35 C 15 -30 30 -20 30 0 Z" fill="#3E3124" />
                  <circle cx="0" cy="-75" r="8" fill="#F8F8F8" />
                </g>
              </svg>
            </div>

            {/* 備註區塊 */}
            <div className="w-full max-w-[400px] mb-8 relative px-4" style={{ width: '100%', padding: '0 1rem', marginBottom: '2rem' }}>
              <div 
                className="w-full text-[#3E3124] text-xl font-bold whitespace-pre-line min-h-[30px] tracking-wide transition-all"
                style={{ textAlign: customTextAlign, color: '#3E3124', fontSize: '1.25rem', fontWeight: 'bold', whiteSpace: 'pre-line' }}
              >
                {customMessage}
              </div>
            </div>

            {/* 狀態提示文字 */}
            {saveStatus && (
              <div className="absolute -bottom-10 text-sm font-bold text-green-600 bg-green-50 px-4 py-1 rounded-full animate-bounce shadow-sm" style={{ position: 'absolute', bottom: '-2.5rem', color: '#16A34A', padding: '0.25rem 1rem', backgroundColor: '#F0FDF4', borderRadius: '9999px' }}>
                {saveStatus}
              </div>
            )}

            {/* 繼續按鈕 */}
            <button 
              onClick={handleSaveRating}
              disabled={isSaving}
              className={`w-full max-w-[400px] bg-[#3E3124] text-white py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-black hover:shadow-xl'}`}
              style={{ width: '100%', maxWidth: '25rem', backgroundColor: '#3E3124', color: 'white', padding: '1.25rem', borderRadius: '1rem', fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer' }}
            >
              {isSaving ? '處理中...' : '繼續 (Continue)'}
              {!isSaving && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>}
            </button>
          </div>
        </div>

      )}
    </div>
  );
}

// ==========================================
// 3. 輸出外層包裝了防護罩的 App
// ==========================================
export default function App() {
  return (
    <ErrorBoundary>
      <RatingApp />
    </ErrorBoundary>
  );
}
