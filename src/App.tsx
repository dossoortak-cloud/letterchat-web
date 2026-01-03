import { useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuthStore } from './store/useAuthStore';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Chat from './pages/Chat';

function App() {
    const { user, setUser, setLoading } = useAuthStore();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
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
            {user ? <Chat /> : <Login />}
        </>
    );
}

export default App;
