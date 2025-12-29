import { useEffect } from 'react';
import { auth, db } from './firebase'; // db import edildi
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // Firestore fonksiyonları
import { useAuthStore } from './store/useAuthStore';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Chat from './pages/Chat'; // Chat sayfası import edildi

function App() {
    const { user, setUser, setLoading } = useAuthStore();

    useEffect(() => {
        // Kullanıcı durumunu dinle
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // Kullanıcı giriş yapmışsa, Firestore'dan ekstra bilgilerini (ad, resim vb.) çekebiliriz
                // Şimdilik sadece user objesini store'a atıyoruz
                setUser(currentUser);
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [setUser, setLoading]);

    return (
        <>
            <Toaster position="top-center" />
            {/* Kullanıcı varsa CHAT, yoksa LOGIN sayfasını göster */}
            {user ? <Chat /> : <Login />}
        </>
    );
}

export default App;