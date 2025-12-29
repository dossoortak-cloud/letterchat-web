import { useState } from 'react';
import { updateProfile, updatePassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { X, Camera, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
    user: any;
    onClose: () => void;
}

export default function ProfileModal({ user, onClose }: Props) {
    const [displayName, setDisplayName] = useState(user.displayName || '');
    const [photoURL, setPhotoURL] = useState(user.photoURL || '');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 1. Profil Bilgilerini Güncelle (Auth)
            await updateProfile(user, {
                displayName: displayName,
                photoURL: photoURL // Şimdilik internetten link olarak alıyoruz
            });

            // 2. Veritabanını Güncelle (Firestore)
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                name: displayName,
                photoURL: photoURL
            });

            // 3. Şifre Değişikliği İstenmişse
            if (newPassword) {
                await updatePassword(user, newPassword);
                toast.success('Şifreniz güncellendi!');
            }

            toast.success('Profil güncellendi!');
            onClose();
        } catch (error: any) {
            toast.error('Hata: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-primary p-4 flex justify-between items-center text-white">
                    <h2 className="font-bold text-lg">Profili Düzenle</h2>
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleUpdate} className="p-6 space-y-4">

                    {/* İsim */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Görünen İsim</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full pl-9 p-2 border rounded bg-gray-50 focus:ring-primary"
                                placeholder="Adınız Soyadınız"
                            />
                        </div>
                    </div>

                    {/* Profil Resmi (URL) */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Profil Resmi (Link)</label>
                        <div className="relative">
                            <Camera className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={photoURL}
                                onChange={(e) => setPhotoURL(e.target.value)}
                                className="w-full pl-9 p-2 border rounded bg-gray-50 focus:ring-primary"
                                placeholder="https://site.com/resim.jpg"
                            />
                        </div>
                        <p className="text-xs text-gray-400">* Resim linkini yapıştırın</p>
                    </div>

                    {/* Yeni Şifre */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Yeni Şifre (İsteğe Bağlı)</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-9 p-2 border rounded bg-gray-50 focus:ring-primary"
                                placeholder="Değiştirmek istemiyorsanız boş bırakın"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white py-2 rounded hover:bg-secondary transition"
                    >
                        {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </button>
                </form>
            </div>
        </div>
    );
}