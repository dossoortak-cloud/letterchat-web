import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import {
    collection, query, where, onSnapshot, addDoc, getDocs, doc, getDoc,
    serverTimestamp, orderBy, updateDoc, deleteDoc, writeBatch, arrayRemove, arrayUnion
} from 'firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import {
    Plus, Search, MoreVertical, Phone, Video, Users,
    Smile, Paperclip, Mic, Send, ShieldCheck, Image as ImageIcon, Camera, StopCircle, LogOut, FileText, MapPin, Trash2, X, Edit2, Eraser, UserPlus, Map
} from 'lucide-react'; // 🔥 'lucide-react' olacak, native değil.
import toast from 'react-hot-toast';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import ProfileModal from '../components/ProfileModal';
import AdminPanel from '../components/AdminPanel';

const BACKEND_URL = "https://letterchat-server.vercel.app";
const CLOUD_NAME = "dfxaa5u6w";
const UPLOAD_PRESET = "letterchat";

const getUserColor = (userId: string) => {
    const colors = ['#e53935', '#d81b60', '#8e24aa', '#5e35b1', '#3949ab', '#1e88e5', '#039be5', '#00acc1', '#00897b', '#43a047', '#7cb342', '#c0ca33', '#fdd835', '#ffb300', '#fb8c00', '#f4511e'];
    let hash = 0; for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

export default function Chat({ onOpenMap }: { onOpenMap: () => void }) {
    const { user } = useAuthStore();
    const [chats, setChats] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [activeChat, setActiveChat] = useState<any>(null);
    const [messageText, setMessageText] = useState('');
    const [showChatDetails, setShowChatDetails] = useState(false);
    const [chatMembersDetails, setChatMembersDetails] = useState<any[]>([]);
    const [addMemberEmail, setAddMemberEmail] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupEmailInput, setGroupEmailInput] = useState('');
    const [groupMembersList, setGroupMembersList] = useState<string[]>([]);
    const [msgContextMenu, setMsgContextMenu] = useState<any>(null);
    const [chatContextMenu, setChatContextMenu] = useState<any>(null);
    const [newContactEmail, setNewContactEmail] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            const checkRole = async () => {
                const snap = await getDoc(doc(db, 'users', user.uid));
                if (snap.exists() && snap.data().role === 'admin') setIsAdmin(true);
            };
            checkRole();
        }
    }, [user]);

    // ... (Diğer tüm kodlar aynı, değişiklik yok)
    // Sadece JSX (return) kısmını güncelleyeceğiz.
    // ...

    return (
        <div className="flex h-screen bg-[#e5ddd5] overflow-hidden">
            <div className="w-[400px] bg-white border-r border-gray-300 flex flex-col">
                <div className="h-16 bg-[#f0f2f5] px-4 flex justify-between items-center border-b border-gray-200">
                    <div onClick={() => setShowProfileModal(true)} className="cursor-pointer">{user?.photoURL ? <img src={user.photoURL} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center font-bold text-gray-600">{user?.email?.[0].toUpperCase()}</div>}</div>
                    <div className="flex gap-4 text-[#54656f]">
                        <button onClick={() => setShowGroupModal(true)} title="Grup Oluştur"><Users className="w-6 h-6" /></button>
                        <button onClick={() => setShowAddModal(true)} title="Kişi Ekle"><Plus className="w-6 h-6" /></button>
                        <div className="relative">
                            <button onClick={() => setShowSettingsMenu(!showSettingsMenu)}><MoreVertical className="w-6 h-6" /></button>
                            {showSettingsMenu && (
                                <div className="absolute right-0 top-10 bg-white shadow-xl rounded-lg py-2 w-56 z-50">
                                    <button onClick={() => { setShowProfileModal(true); setShowSettingsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">Profil</button>
                                    {/* 🔥 CİHAZIMI BUL BUTONU */}
                                    <button onClick={() => { setShowSettingsMenu(false); onOpenMap(); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2 text-blue-600 font-bold">
                                        <Map className="w-4 h-4" /> Cihazımı Bul / Alarm
                                    </button>
                                    {isAdmin && <button onClick={() => { setShowSettingsMenu(false); setShowAdminPanel(true); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-yellow-600 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Admin Paneli</button>}
                                    <div className="h-px bg-gray-200 my-1"></div>
                                    <button onClick={() => { signOut(auth); toast.success('Çıkış yapıldı'); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600 flex items-center gap-2"><LogOut className="w-4 h-4" /> Çıkış Yap</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/* ... (Diğer tüm JSX aynı) ... */}
            </div>
            {/* ... (Diğer tüm JSX aynı) ... */}
        </div>
    );
}
