import { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { MessageSquare, Lock, Mail, ArrowRight, X, Users, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [registerMode, setRegisterMode] = useState<'join' | 'create'>('join'); // Web için mod seçimi

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Aile Verileri
    const [familyCode, setFamilyCode] = useState('');
    const [familyName, setFamilyName] = useState('');

    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [resetEmail, setResetEmail] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                // --- GİRİŞ YAPMA ---
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                if (!user.emailVerified) {
                    await signOut(auth);
                    toast.error('Lütfen önce Gmail kutunuza gelen doğrulama linkine tıklayın.');
                    setLoading(false);
                    return;
                }

                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists() && userDoc.data().isApproved === false) {
                    await signOut(auth);
                    toast.error('Yöneticiniz henüz üyeliğinizi onaylamadı.');
                    return;
                }
                toast.success('Giriş yapıldı');
            } else {
                // --- KAYIT OLMA (AİLE SİSTEMİ) ---
                
                // 1. Gmail Kontrolü
                if (!email.trim().toLowerCase().endsWith('@gmail.com')) {
                    toast.error('Sadece @gmail.com uzantılı adresler kabul edilmektedir.');
                    setLoading(false);
                    return;
                }

                if (!familyCode || familyCode.length < 4) {
                    toast.error('Aile kodu en az 4 karakter olmalı.');
                    setLoading(false);
                    return;
                }

                let finalFamilyId = "";
                let finalFamilyName = "";

                // SENARYO A: YENİ AİLE KURMA
                if (registerMode === 'create') {
                    if (!familyName) { toast.error("Aile adı giriniz."); setLoading(false); return; }

                    const q = query(collection(db, 'families'), where('code', '==', familyCode));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        toast.error("Bu aile kodu zaten kullanılıyor.");
                        setLoading(false); return;
                    }

                    const familyRef = await addDoc(collection(db, 'families'), {
                        name: familyName,
                        code: familyCode,
                        createdByEmail: email,
                        createdAt: serverTimestamp()
                    });
                    finalFamilyId = familyRef.id;
                    finalFamilyName = familyName;
                } 
                // SENARYO B: MEVCUT AİLEYE KATILMA
                else {
                    const q = query(collection(db, 'families'), where('code', '==', familyCode));
                    const snap = await getDocs(q);
                    if (snap.empty) {
                        toast.error("Böyle bir aile kodu bulunamadı!");
                        setLoading(false); return;
                    }
                    finalFamilyId = snap.docs[0].id;
                    finalFamilyName = snap.docs[0].data().name;
                }

                // 2. Kullanıcıyı Oluştur
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await sendEmailVerification(user);

                // 3. Veritabanına Kaydet
                await setDoc(doc(db, 'users', user.uid), {
                    uid: user.uid,
                    email: user.email,
                    createdAt: serverTimestamp(),
                    isApproved: false,
                    role: 'user',
                    familyId: finalFamilyId,
                    familyName: finalFamilyName
                });

                toast.success(`"${finalFamilyName}" grubuna kayıt alındı! Lütfen Gmail'den onaylayın.`);
                await signOut(auth);
            }
        } catch (error: any) {
            let msg = error.message;
            if(msg.includes('email-already-in-use')) msg = "Bu mail zaten kayıtlı.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // Şifre Sıfırlama
    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetEmail) return;
        try {
            await addDoc(collection(db, 'requests'), { type: 'password_reset', email: resetEmail, status: 'pending', createdAt: serverTimestamp() });
            toast.success('Talep iletildi.'); setShowForgot(false); setResetEmail('');
        } catch (error: any) { toast.error('Hata: ' + error.message); }
    };

    return (
        <div className="min-h-screen bg-[#d1d7db] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-primary z-0"></div>

            <div className="bg-white rounded-lg shadow-2xl w-full max-w-[900px] flex z-10 overflow-hidden relative md:h-[600px] h-auto">
                {/* SOL TARAFI */}
                <div className="hidden md:flex w-1/2 bg-gray-50 flex-col items-center justify-center p-10 text-center border-r border-gray-100">
                    <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <MessageSquare className="w-12 h-12 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">LetterChat V1</h2>
                    <p className="text-gray-500 text-sm">Aileniz için güvenli, özel iletişim.</p>
                </div>

                {/* SAĞ TARAFI (FORM) */}
                <div className="w-full md:w-1/2 p-10 flex flex-col justify-center bg-white overflow-y-auto">
                    <h1 className="text-2xl font-light text-gray-700 mb-6 text-center">
                        {isLogin ? 'Giriş Yap' : 'Aileye Katıl / Kur'}
                    </h1>

                    <form onSubmit={handleAuth} className="space-y-5">
                        
                        {/* KAYIT MODU SEÇİCİ */}
                        {!isLogin && (
                            <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                                <button type="button" onClick={() => setRegisterMode('join')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${registerMode === 'join' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <Users size={16} /> Aileye Katıl
                                </button>
                                <button type="button" onClick={() => setRegisterMode('create')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${registerMode === 'create' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <PlusCircle size={16} /> Yeni Aile Kur
                                </button>
                            </div>
                        )}

                        {/* AİLE BİLGİLERİ (Sadece Kayıtta) */}
                        {!isLogin && registerMode === 'create' && (
                            <input type="text" placeholder="Aile Adı (Örn: Çelik Ailesi)" className="w-full px-4 py-3 border rounded-lg bg-gray-50" value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
                        )}

                        {!isLogin && (
                            <input type="text" placeholder={registerMode === 'create' ? "Yeni Aile Kodu Belirle" : "Aile Kodunu Gir"} className="w-full px-4 py-3 border border-primary/50 rounded-lg bg-gray-50 font-bold text-center tracking-widest uppercase" value={familyCode} onChange={(e) => setFamilyCode(e.target.value.toUpperCase())} />
                        )}

                        {/* EMAIL & PASSWORD */}
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input type="email" placeholder="Gmail Adresi" className="w-full pl-10 pr-4 py-3 border rounded-lg bg-gray-50" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input type="password" placeholder="Şifre" className="w-full pl-10 pr-4 py-3 border rounded-lg bg-gray-50" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>

                        {isLogin && (
                            <div className="text-right">
                                <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-primary hover:underline">Şifremi Unuttum?</button>
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-secondary text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
                            {loading ? 'İşleniyor...' : (isLogin ? 'Giriş Yap' : 'Tamamla')}
                            {!loading && <ArrowRight className="w-5 h-5" />}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline text-sm font-medium">
                            {isLogin ? 'Hesabın yok mu? Kayıt Ol' : 'Zaten üye misin? Giriş Yap'}
                        </button>
                    </div>
                </div>

                {/* MODAL (Şifre Unuttum) */}
                {showForgot && (
                    <div className="absolute inset-0 bg-white/95 z-20 flex items-center justify-center p-8">
                        <div className="w-full max-w-sm relative">
                            <button onClick={() => setShowForgot(false)} className="absolute right-0 top-0"><X className="w-5 h-5 text-gray-500" /></button>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Şifre Talebi</h3>
                            <p className="text-sm text-gray-600 mb-4">Admin'e iletilecektir.</p>
                            <form onSubmit={handleResetRequest}>
                                <input type="email" placeholder="Kayıtlı E-posta" className="w-full border p-3 rounded mb-4" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
                                <button type="submit" className="w-full bg-primary text-white py-3 rounded font-bold">Talep Gönder</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}