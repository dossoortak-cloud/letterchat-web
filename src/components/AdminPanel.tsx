import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { Check, X, Shield, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
    onClose: () => void;
}

export default function AdminPanel({ onClose }: Props) {
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [resetRequests, setResetRequests] = useState<any[]>([]);

    // 1. Onay Bekleyen Kullanıcıları Çek
    useEffect(() => {
        const q = query(collection(db, 'users'), where('isApproved', '==', false));
        const unsub = onSnapshot(q, (snapshot) => {
            setPendingUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    // 2. Şifre Sıfırlama Taleplerini Çek
    useEffect(() => {
        const q = query(collection(db, 'requests'), where('status', '==', 'pending'));
        const unsub = onSnapshot(q, (snapshot) => {
            setResetRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    // Kullanıcıyı Onayla
    const handleApprove = async (userId: string) => {
        try {
            await updateDoc(doc(db, 'users', userId), { isApproved: true });
            toast.success('Kullanıcı onaylandı ve erişimi açıldı.');
        } catch (error) {
            toast.error('Hata oluştu.');
        }
    };

    // Kullanıcıyı Reddet (Sil)
    const handleReject = async (userId: string) => {
        if (!window.confirm("Bu kullanıcıyı silmek istediğine emin misin?")) return;
        try {
            await deleteDoc(doc(db, 'users', userId)); // Direkt veritabanından siler
            toast.success('Kullanıcı başvurusu reddedildi ve silindi.');
        } catch (error) {
            toast.error('Hata oluştu.');
        }
    };

    // Şifre Talebini Kapat (Manuel halledildi varsayıyoruz şimdilik)
    const handleCloseRequest = async (reqId: string) => {
        await updateDoc(doc(db, 'requests', reqId), { status: 'completed' });
        toast.success('Talep arşivlendi.');
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">

                {/* Başlık */}
                <div className="bg-yellow-500 p-4 flex justify-between items-center text-white shadow-md">
                    <div className="flex items-center gap-2">
                        <Shield className="w-6 h-6" />
                        <h2 className="font-bold text-xl">Yönetim Paneli</h2>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 p-1 rounded"><X /></button>
                </div>

                <div className="p-6 overflow-y-auto space-y-8 flex-1 bg-gray-50">

                    {/* BÖLÜM 1: Onay Bekleyenler */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-700 mb-3 border-b pb-2 flex items-center gap-2">
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{pendingUsers.length}</span>
                            Onay Bekleyen Üyeler
                        </h3>

                        {pendingUsers.length === 0 ? (
                            <p className="text-gray-400 text-sm italic">Şu an onay bekleyen kimse yok.</p>
                        ) : (
                            <div className="space-y-3">
                                {pendingUsers.map(u => (
                                    <div key={u.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-gray-800">{u.email}</p>
                                            <p className="text-xs text-gray-500">UID: {u.id}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleReject(u.id)} className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Reddet/Sil">
                                                <X className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleApprove(u.id)} className="p-2 bg-green-100 text-green-600 rounded hover:bg-green-200" title="Onayla">
                                                <Check className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* BÖLÜM 2: Şifre Talepleri */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-700 mb-3 border-b pb-2 flex items-center gap-2">
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">{resetRequests.length}</span>
                            Şifre Sıfırlama Talepleri
                        </h3>
                        {resetRequests.length === 0 ? (
                            <p className="text-gray-400 text-sm italic">Yeni talep yok.</p>
                        ) : (
                            <div className="space-y-3">
                                {resetRequests.map(req => (
                                    <div key={req.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-gray-800">{req.email}</p>
                                            <p className="text-xs text-gray-500">Talep Tarihi: {new Date(req.createdAt?.toDate()).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={() => handleCloseRequest(req.id)} className="text-sm text-blue-600 hover:underline">
                                            Tamamlandı İşaretle
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}