import { useEffect, useState } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuthStore } from './store/useAuthStore';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Chat from './pages/Chat';
import FindPhone from './pages/FindPhone';

function App() {
    const { user, setUser, setLoading } = useAuthStore();
    const [currentView, setCurrentView] = useState<'chat' | 'map'>('chat');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                setUser(null);
                setCurrentView('chat');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [setUser, setLoading]);

    const handleBackToChat = () => setCurrentView('chat');

    return (
        <>
            <Toaster position="top-center" />
            
            {!user ? (
                <Login />
            ) : currentView === 'chat' ? (
                <Chat onOpenMap={() => setCurrentView('map')} />
            ) : (
                <div className="relative h-screen w-screen">
                    <button 
                        onClick={handleBackToChat}
                        className="absolute top-4 left-4 z-[2000] bg-white text-black px-4 py-2 rounded-full shadow-lg font-bold hover:bg-gray-100"
                    >
                        ⬅️ Sohbete Dön
                    </button>
                    <FindPhone />
                </div>
            )}
        </>
    );
}

export default App;
