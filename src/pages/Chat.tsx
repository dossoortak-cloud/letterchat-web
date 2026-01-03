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
    Smile, Paperclip, Mic, Send, Image as ImageIcon, Camera, StopCircle, LogOut, FileText, MapPin, Trash2, X, Edit2, Eraser, UserPlus, Map, ShieldCheck
} from 'lucide-react';
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

    // Admin Rolünü Kontrol Et
    useEffect(() => {
        if (user) {
            const checkRole = async () => {
                const snap = await getDoc(doc(db, 'users', user.uid));
                if (snap.exists() && snap.data().role === 'admin') setIsAdmin(true);
            };
            checkRole();
        }
    }, [user]);

    // Sohbetleri Getir
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'chats'), where('members', 'array-contains', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatList = snapshot.docs.map(doc => {
                const data = doc.data();
                let displayName = 'Bilinmiyor';
                let displayEmail = '';
                if (data.isGroup) {
                    displayName = data.groupName;
                } else {
                    const friendEmail = data.memberEmails?.find((e: string) => e !== user.email);
                    displayName = friendEmail || 'Bilinmiyor';
                    displayEmail = friendEmail || '';
                }
                return { id: doc.id, ...data, displayName, displayEmail };
            });
            setChats(chatList);
        });
        return () => unsubscribe();
    }, [user]);

    // Mesajları Getir
    useEffect(() => {
        if (!activeChat) return;
        const q = query(collection(db, 'messages'), where('chatId', '==', activeChat.id), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });
        return () => unsubscribe();
    }, [activeChat]);

    const sendPushNotification = async (chatId: string, title: string, body: string) => {
        try {
            const chatDoc = await getDoc(doc(db, 'chats', chatId));
            if (!chatDoc.exists()) return;
            const members = chatDoc.data().members;
            for (const memberId of members) {
                if (memberId === user?.uid) continue;
                const userSnap = await getDoc(doc(db, 'users', memberId));
                if (userSnap.exists() && userSnap.data().pushToken) {
                    fetch(`${BACKEND_URL}/send-notification`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: userSnap.data().pushToken, title: title, body: body, data: { chatId: chatId } }),
                    }).catch(e => console.log(e));
                }
            }
        } catch (error) { console.error("Hata:", error); }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!messageText.trim() || !user || !activeChat) return;
        if (editingMsgId) {
            await updateDoc(doc(db, 'messages', editingMsgId), { text: messageText, isEdited: true });
            setEditingMsgId(null);
        } else {
            const senderName = user.displayName || user.email?.split('@')[0] || 'Üye';
            await addDoc(collection(db, 'messages'), {
                chatId: activeChat.id,
                senderId: user.uid,
                senderEmail: user.email,
                senderName: senderName,
                text: messageText, type: 'text', createdAt: serverTimestamp(), seen: false, isEdited: false, receiverId: activeChat.isGroup ? activeChat.id : activeChat.members.find((id: string) => id !== user.uid)
            });
            await updateDoc(doc(db, 'chats', activeChat.id), { lastMessage: messageText, lastMessageTime: serverTimestamp() });
            sendPushNotification(activeChat.id, "LetterChat", `${senderName}: ${messageText}`);
        }
        setMessageText(''); setShowEmojiPicker(false);
    };

    const openChatDetails = async () => { if (!activeChat) return; setShowChatDetails(true); setAddMemberEmail(''); const membersData: any[] = []; if (activeChat.memberEmails) { for (const email of activeChat.memberEmails) { const q = query(collection(db, 'users'), where('email', '==', email)); const snap = await getDocs(q); if (!snap.empty) membersData.push({ id: snap.docs[0].id, ...snap.docs[0].data() }); else membersData.push({ id: 'unknown', email: email }); } } setChatMembersDetails(membersData); };
    const handleAddMemberToGroup = async () => { if (!addMemberEmail || !activeChat) return; try { if (activeChat.memberEmails.includes(addMemberEmail)) { toast.error("Bu kişi zaten grupta."); return; } const q = query(collection(db, 'users'), where('email', '==', addMemberEmail)); const snap = await getDocs(q); if (snap.empty) { toast.error("Kullanıcı bulunamadı."); return; } const newMember = snap.docs[0].data(); const newMemberId = snap.docs[0].id; await updateDoc(doc(db, 'chats', activeChat.id), { members: arrayUnion(newMemberId), memberEmails: arrayUnion(addMemberEmail) }); toast.success("Üye eklendi!"); setAddMemberEmail(''); setChatMembersDetails(prev => [...prev, { id: newMemberId, ...newMember }]); } catch (error: any) { toast.error("Hata: " + error.message); } };
    const handleRemoveMember = async (memberId: string, memberEmail: string) => { if (!activeChat) return; if (!window.confirm(`${memberEmail} gruptan çıkarılsın mı?`)) return; try { await updateDoc(doc(db, 'chats', activeChat.id), { members: arrayRemove(memberId), memberEmails: arrayRemove(memberEmail) }); setChatMembersDetails(prev => prev.filter(m => m.id !== memberId)); toast.success("Üye çıkarıldı"); } catch (error) { toast.error("Hata oluştu"); } };
    const handleAddContact = async (e: React.FormEvent) => { e.preventDefault(); if (!newContactEmail || !user?.email) return; if (newContactEmail === user.email) { toast.error("Kendinizi ekleyemezsiniz."); return; } try { const exists = chats.find(c => !c.isGroup && c.memberEmails.includes(newContactEmail)); if (exists) { toast.error("Bu kişi zaten ekli!"); return; } const userQuery = query(collection(db, 'users'), where('email', '==', newContactEmail)); const userSnapshot = await getDocs(userQuery); if (userSnapshot.empty) { toast.error('Kullanıcı bulunamadı!'); return; } const friendUid = userSnapshot.docs[0].id; await addDoc(collection(db, 'chats'), { members: [user.uid, friendUid], memberEmails: [user.email, newContactEmail], createdAt: new Date(), lastMessage: 'Sohbet başlatıldı', isGroup: false }); toast.success('Kişi eklendi!'); setShowAddModal(false); setNewContactEmail(''); } catch (error: any) { toast.error(error.message); } };
    const addEmailToGroupList = () => { if (groupEmailInput && !groupMembersList.includes(groupEmailInput) && groupEmailInput !== user?.email) { setGroupMembersList([...groupMembersList, groupEmailInput]); setGroupEmailInput(''); } };
    const handleCreateGroup = async (e: React.FormEvent) => { e.preventDefault(); if (!groupName || groupMembersList.length === 0 || !user) { toast.error("Grup adı ve en az 1 kişi gerekli."); return; } const toastId = toast.loading("Grup oluşturuluyor..."); try { const memberUIDs = [user.uid]; const validEmails = [user.email]; for (const email of groupMembersList) { const q = query(collection(db, 'users'), where('email', '==', email)); const snap = await getDocs(q); if (!snap.empty) { memberUIDs.push(snap.docs[0].id); validEmails.push(email); } } await addDoc(collection(db, 'chats'), { isGroup: true, groupName: groupName, members: memberUIDs, memberEmails: validEmails, createdBy: user.uid, createdAt: serverTimestamp(), lastMessage: 'Grup oluşturuldu' }); toast.success("Grup kuruldu!", { id: toastId }); setShowGroupModal(false); setGroupName(''); setGroupMembersList([]); } catch (error: any) { toast.error("Hata: " + error.message, { id: toastId }); } };
    const handleMsgRightClick = (e: React.MouseEvent, msg: any) => { e.preventDefault(); setChatContextMenu(null); if (msg.senderId === user?.uid || isAdmin) { setMsgContextMenu({ x: e.pageX, y: e.pageY, msgId: msg.id, senderId: msg.senderId, type: msg.type, text: msg.text }); } else { toast.error("Yetkisiz işlem."); } };
    const handleDeleteMessage = async () => { if (!msgContextMenu) return; try { await deleteDoc(doc(db, 'messages', msgContextMenu.msgId)); toast.success("Silindi"); setMsgContextMenu(null); } catch (error) { toast.error("Silinemedi"); } };
    const handleEditStart = () => { if (!msgContextMenu || msgContextMenu.type !== 'text') return; setEditingMsgId(msgContextMenu.msgId); setMessageText(msgContextMenu.text); setMsgContextMenu(null); };
    const handleChatRightClick = (e: React.MouseEvent, chat: any) => { e.preventDefault(); setMsgContextMenu(null); setChatContextMenu({ x: e.pageX, y: e.pageY, chatId: chat.id }); };
    const handleDeleteChat = async () => { if (!chatContextMenu) return; if (!window.confirm("Bu sohbeti silmek istediğine emin misin?")) return; try { await deleteDoc(doc(db, 'chats', chatContextMenu.chatId)); const msgs = await getDocs(query(collection(db, 'messages'), where('chatId', '==', chatContextMenu.chatId))); const batch = writeBatch(db); msgs.forEach((doc) => batch.delete(doc.ref)); await batch.commit(); toast.success("Silindi"); setChatContextMenu(null); setActiveChat(null); } catch (error) { toast.error("Hata"); } };
    const handleClearHistory = async () => { if (!chatContextMenu) return; if (!window.confirm("Mesajları silmek istediğine emin misin?")) return; try { const msgs = await getDocs(query(collection(db, 'messages'), where('chatId', '==', chatContextMenu.chatId))); const batch = writeBatch(db); msgs.forEach((doc) => batch.delete(doc.ref)); await batch.commit(); await updateDoc(doc(db, 'chats', chatContextMenu.chatId), { lastMessage: '', lastMessageTime: serverTimestamp() }); toast.success("Temizlendi"); setChatContextMenu(null); } catch (error) { toast.error("Hata"); } };
    useEffect(() => { const handleClick = () => { setMsgContextMenu(null); setChatContextMenu(null); }; window.addEventListener('click', handleClick); return () => window.removeEventListener('click', handleClick); }, []);
    const uploadToCloudinary = async (file: Blob, resourceType: 'video' | 'image' | 'raw' | 'auto') => { const formData = new FormData(); formData.append("file", file); formData.append("upload_preset", UPLOAD_PRESET); try { const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, { method: "POST", body: formData }); const data = await response.json(); return data.secure_url; } catch (error) { throw error; } };
    const sendFileMessage = async (file: Blob | File, msgType: 'audio' | 'image' | 'file') => { if (!activeChat || !user) return; const toastId = toast.loading('Yükleniyor...'); try { let cloudType: 'video' | 'image' | 'raw' = 'image'; if (msgType === 'audio') cloudType = 'video'; if (msgType === 'file') cloudType = 'raw'; const downloadURL = await uploadToCloudinary(file, cloudType); let textContent = msgType === 'audio' ? '🎤 Sesli Mesaj' : msgType === 'image' ? '📷 Fotoğraf' : `📄 Dosya: ${(file as File).name}`; const senderName = user.displayName || user.email?.split('@')[0] || 'Üye'; await addDoc(collection(db, 'messages'), { chatId: activeChat.id, senderId: user.uid, senderEmail: user.email, senderName: senderName, text: textContent, mediaUrl: downloadURL, type: msgType, fileName: (file as File).name || 'dosya', createdAt: serverTimestamp(), seen: false, isEdited: false, receiverId: activeChat.isGroup ? activeChat.id : activeChat.members.find((id: string) => id !== user.uid) }); await updateDoc(doc(db, 'chats', activeChat.id), { lastMessage: textContent, lastMessageTime: serverTimestamp() }); toast.success('Gönderildi!', { id: toastId }); sendPushNotification(activeChat.id, "LetterChat", `${senderName}: ${textContent}`); } catch (error: any) { toast.error('Hata: ' + error.message, { id: toastId }); } };
    const handleSendLocation = () => { if (!navigator.geolocation) { toast.error("Tarayıcı desteklemiyor."); return; } navigator.geolocation.getCurrentPosition(async (position) => { const { latitude, longitude } = position.coords; const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`; const senderName = user?.displayName || user?.email?.split('@')[0] || 'Üye'; await addDoc(collection(db, 'messages'), { chatId: activeChat.id, senderId: user!.uid, senderEmail: user!.email, senderName: senderName, text: '📍 Konum', mediaUrl: mapsUrl, type: 'location', createdAt: serverTimestamp(), seen: false, receiverId: activeChat.isGroup ? activeChat.id : activeChat.members.find((id: string) => id !== user!.uid) }); setShowAttachMenu(false); sendPushNotification(activeChat.id, "LetterChat", `${senderName}: 📍 Konum`); }); };
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => { if (e.target.files && e.target.files[0]) { sendFileMessage(e.target.files[0], type); setShowAttachMenu(false); } };
    const startRecording = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mediaRecorder = new MediaRecorder(stream); mediaRecorderRef.current = mediaRecorder; audioChunksRef.current = []; mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); }; mediaRecorder.onstop = async () => { const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); await sendFileMessage(audioBlob, 'audio'); }; mediaRecorder.start(); setIsRecording(true); } catch (error) { toast.error('Mikrofon izni yok.'); } };
    const stopRecording = () => { if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); setIsRecording(false); mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); } };
    const onEmojiClick = (emojiData: EmojiClickData) => { setMessageText(prev => prev + emojiData.emoji); };
    const handleLogout = () => { signOut(auth); toast.success('Çıkış yapıldı'); };

    const filteredMessages = messages.filter(msg => {
        if (!searchQuery) return true;
        const lowerQuery = searchQuery.toLowerCase();
        return (msg.text && msg.text.toLowerCase().includes(lowerQuery)) || (msg.fileName && msg.fileName.toLowerCase().includes(lowerQuery));
    });

    return (
        <div className="flex h-screen bg-[#e5ddd5] overflow-hidden">
            {/* SOL MENÜ */}
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
                                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600 flex items-center gap-2"><LogOut className="w-4 h-4" /> Çıkış Yap</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-2 border-b border-gray-100 bg-white"><div className="bg-[#f0f2f5] rounded-lg flex items-center px-4 py-2"><Search className="w-5 h-5 text-gray-500 mr-4" /><input type="text" placeholder="Aratın" className="bg-transparent w-full focus:outline-none text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div></div>

                <div className="flex-1 overflow-y-auto bg-white">
                    {chats.map(chat => (
                        <div key={chat.id} onClick={() => setActiveChat(chat)} onContextMenu={(e) => handleChatRightClick(e, chat)} className={`flex items-center p-3 cursor-pointer hover:bg-[#f5f6f6] border-b border-gray-100 ${activeChat?.id === chat.id ? 'bg-[#f0f2f5]' : ''}`} title={chat.displayEmail || chat.displayName}>
                            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-xl font-bold text-white mr-4">{chat.isGroup ? <Users className="w-6 h-6" /> : chat.displayName[0]?.toUpperCase()}</div>
                            <div className="flex-1"><span className="font-semibold text-[#111b21]">{chat.displayName}</span><p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SAĞ TARAF */}
            <div className="flex-1 flex flex-col relative">
                {activeChat ? (
                    <>
                        <div className="h-16 bg-[#f0f2f5] px-4 flex justify-between items-center border-b border-gray-200 shadow-sm z-10">
                            <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition" onClick={openChatDetails} title="Detayları gör">
                                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center font-bold text-white">{activeChat.isGroup ? <Users className="w-5 h-5" /> : activeChat.displayName[0]?.toUpperCase()}</div>
                                <div><span className="font-semibold text-[#111b21] block">{activeChat.displayName}</span>{activeChat.isGroup && <span className="text-xs text-gray-500">{activeChat.memberEmails.length} üye - Tıkla ve Gör</span>}</div>
                            </div>
                            <div className="flex gap-6 text-[#54656f]">
                                <div className="relative flex items-center">{isSearching && <input type="text" autoFocus className="border rounded px-2 py-1 text-sm mr-2 w-40" placeholder="Ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />}<Search className={`w-6 h-6 cursor-pointer ${isSearching ? 'text-primary' : ''}`} onClick={() => { setIsSearching(!isSearching); setSearchQuery(''); }} /></div>
                                <Phone className="w-6 h-6" /><Video className="w-6 h-6" /><MoreVertical className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2 relative" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`, backgroundColor: '#e5ddd5' }}>
                            {filteredMessages.map(msg => {
                                const isMe = msg.senderId === user?.uid;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`} onContextMenu={(e) => handleMsgRightClick(e, msg)}>
                                        <div className={`max-w-[70%] px-2 py-2 rounded-lg shadow-sm relative cursor-context-menu ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-white text-primary rounded-tl-none'}`}>
                                            {!isMe && activeChat.isGroup && (<div className="text-xs font-bold mb-1" style={{ color: getUserColor(msg.senderId) }}>{msg.senderName || msg.senderEmail?.split('@')[0] || 'Üye'}</div>)}
                                            {msg.type === 'audio' && <div className="flex items-center gap-2 min-w-[200px]"><audio controls src={msg.mediaUrl} className="w-full h-8" /></div>}
                                            {msg.type === 'image' && <div className="p-1"><img src={msg.mediaUrl} alt="Fotoğraf" className="rounded-lg max-h-60 object-cover" /></div>}
                                            {msg.type === 'file' && <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-black/10 rounded hover:bg-black/20 transition text-inherit no-underline"><FileText className="w-8 h-8" /><div className="text-sm font-bold truncate max-w-[150px]">{msg.fileName || 'Dosya'}</div></a>}
                                            {msg.type === 'location' && <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-1 text-inherit no-underline"><MapPin className="w-6 h-6 text-red-500" /><span className="underline font-bold">Haritada Gör</span></a>}
                                            {msg.type === 'text' && <p className="px-2">{msg.text}</p>}
                                            <div className="flex justify-end items-center gap-1 mt-1 px-2">{msg.isEdited && <span className={`text-[9px] italic ${isMe ? 'text-gray-300' : 'text-gray-500'}`}>Düzenlendi</span>}<span className={`text-[10px] opacity-70 ${isMe ? 'text-gray-200' : 'text-gray-400'}`}>{msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {msgContextMenu && <div className="fixed bg-white shadow-xl rounded-lg py-2 z-50 w-44 border border-gray-200" style={{ top: msgContextMenu.y, left: msgContextMenu.x }}>{msgContextMenu.type === 'text' && msgContextMenu.senderId === user?.uid && <button onClick={handleEditStart} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 flex items-center gap-2 text-sm"><Edit2 className="w-4 h-4" /> Düzenle</button>}<button onClick={handleDeleteMessage} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 text-sm"><Trash2 className="w-4 h-4" /> Herkesten Sil</button><button onClick={() => setMsgContextMenu(null)} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-600 flex items-center gap-2 text-sm"><X className="w-4 h-4" /> İptal</button></div>}
                        {chatContextMenu && <div className="fixed bg-white shadow-xl rounded-lg py-2 z-50 w-52 border border-gray-200" style={{ top: chatContextMenu.y, left: chatContextMenu.x }}><button onClick={handleClearHistory} className="w-full text-left px-4 py-3 hover:bg-orange-50 text-orange-600 flex items-center gap-3 text-sm border-b border-gray-100"><Eraser className="w-4 h-4" /> Geçmişi Temizle</button><button onClick={handleDeleteChat} className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 flex items-center gap-3 text-sm font-bold"><Trash2 className="w-4 h-4" /> Kişiyi / Sohbeti Sil</button><button onClick={() => setChatContextMenu(null)} className="w-full text-left px-4 py-3 hover:bg-gray-100 text-gray-600 flex items-center gap-3 text-sm"><X className="w-4 h-4" /> İptal</button></div>}

                        <div className="bg-[#f0f2f5] p-3 flex items-center gap-3 relative">
                            <div className="relative"><button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-[#54656f] hover:bg-gray-200 p-2 rounded-full"><Smile className="w-6 h-6" /></button>{showEmojiPicker && <div className="absolute bottom-16 left-0 z-50"><EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} /></div>}</div>
                            <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={(e) => handleFileSelect(e, 'image')} />
                            <input type="file" accept="*/*" className="hidden" ref={docInputRef} onChange={(e) => handleFileSelect(e, 'file')} />
                            <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={(e) => handleFileSelect(e, 'image')} />
                            <div className="relative"><button onClick={() => setShowAttachMenu(!showAttachMenu)} className={`text-[#54656f] hover:bg-gray-200 p-2 rounded-full ${showAttachMenu ? 'bg-gray-200' : ''}`}><Paperclip className="w-6 h-6" /></button>{showAttachMenu && (<div className="absolute bottom-14 left-0 bg-white rounded-xl shadow-xl p-4 flex flex-col gap-4 w-44 animate-fade-in-up z-20"><div onClick={() => imageInputRef.current?.click()} className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded cursor-pointer text-gray-700"><ImageIcon className="w-6 h-6 text-purple-600" /> Galeri</div><div onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded cursor-pointer text-gray-700"><Camera className="w-6 h-6 text-pink-600" /> Kamera</div><div onClick={() => docInputRef.current?.click()} className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded cursor-pointer text-gray-700"><FileText className="w-6 h-6 text-indigo-600" /> Belge</div><div onClick={handleSendLocation} className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded cursor-pointer text-gray-700"><MapPin className="w-6 h-6 text-green-600" /> Konum</div></div>)}</div>
                            {editingMsgId && <div className="absolute bottom-16 bg-white w-full p-2 border-t flex justify-between items-center text-sm shadow-md"><span className="text-primary font-bold">Mesaj Düzenleniyor...</span><button onClick={() => { setEditingMsgId(null); setMessageText(''); }} className="text-red-500"><X className="w-4 h-4" /></button></div>}
                            {isRecording ? (<div className="flex-1 flex items-center text-red-500 font-bold animate-pulse px-4"><Mic className="w-5 h-5 mr-2" /> Kaydediliyor...</div>) : (<form className="flex-1 flex gap-2" onSubmit={handleSendMessage}><input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)} className="flex-1 bg-white rounded-lg px-4 py-3 focus:outline-none text-[#111b21] text-sm" placeholder="Bir mesaj yazın" onFocus={() => setShowEmojiPicker(false)} /></form>)}
                            {messageText.trim().length > 0 ? (<button onClick={handleSendMessage} className="text-[#54656f] hover:bg-gray-200 p-2 rounded-full">{editingMsgId ? <Edit2 className="w-6 h-6 text-green-600" /> : <Send className="w-6 h-6 text-primary" />}</button>) : (<button onClick={isRecording ? stopRecording : startRecording} className={`p-3 rounded-full transition-all duration-200 ${isRecording ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : 'hover:bg-gray-200 text-primary'}`}>{isRecording ? <StopCircle className="w-6 h-6" /> : <Mic className="w-6 h-6" />}</button>)}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] border-b-4 border-primary"><h1 className="text-3xl font-light text-[#41525d] mb-4">LetterChat V1</h1><p className="text-[#667781] text-sm">Güvenli, Hızlı ve Aile Dostu.</p></div>
                )}
            </div>

            {showAddModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded-xl shadow-xl w-96"><h2 className="font-bold mb-4">Yeni Sohbet</h2><form onSubmit={handleAddContact}><input type="email" required className="w-full border p-2 rounded mb-4" placeholder="Mail adresi" value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} /><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-gray-100 rounded">İptal</button><button type="submit" className="px-4 py-2 bg-primary text-white rounded">Ekle</button></div></form></div></div>}

            {showGroupModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-96">
                        <h2 className="font-bold mb-4 text-xl flex items-center gap-2"><Users className="w-6 h-6" /> Grup Oluştur</h2>
                        <div className="mb-4"><label className="text-sm text-gray-600">Grup Adı</label><input type="text" className="w-full border p-2 rounded" placeholder="Örn: Aile Grubu" value={groupName} onChange={(e) => setGroupName(e.target.value)} /></div>
                        <div className="mb-4"><label className="text-sm text-gray-600">Kişi Ekle (Mail)</label><div className="flex gap-2"><input type="email" className="flex-1 border p-2 rounded" placeholder="ornek@mail.com" value={groupEmailInput} onChange={(e) => setGroupEmailInput(e.target.value)} /><button type="button" onClick={addEmailToGroupList} className="bg-gray-200 px-3 rounded hover:bg-gray-300">+</button></div></div>
                        <div className="mb-4 max-h-32 overflow-y-auto bg-gray-50 p-2 rounded border">{groupMembersList.length === 0 && <p className="text-xs text-gray-400">Henüz kimse eklenmedi.</p>}{groupMembersList.map((mail, i) => (<div key={i} className="flex justify-between items-center text-sm bg-white p-1 mb-1 rounded border"><span>{mail}</span><button onClick={() => setGroupMembersList(prev => prev.filter(m => m !== mail))} className="text-red-500 font-bold px-2">x</button></div>))}</div>
                        <div className="flex justify-end gap-2 mt-4"><button onClick={() => setShowGroupModal(false)} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">İptal</button><button onClick={handleCreateGroup} className="px-4 py-2 bg-primary text-white rounded hover:bg-secondary">Oluştur</button></div>
                    </div>
                </div>
            )}

            {showChatDetails && activeChat && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-2xl w-96 max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="bg-[#f0f2f5] p-4 flex justify-between items-center border-b">
                            <h3 className="font-bold text-gray-700">{activeChat.isGroup ? 'Grup Bilgisi' : 'Kişi Bilgisi'}</h3>
                            <button onClick={() => setShowChatDetails(false)}><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <div className="p-6 flex flex-col items-center border-b">
                            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-3xl font-bold text-gray-500 mb-2">
                                {activeChat.isGroup ? <Users className="w-10 h-10" /> : activeChat.displayName[0]?.toUpperCase()}
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">{activeChat.displayName}</h2>
                            {!activeChat.isGroup && <p className="text-sm text-gray-500">{activeChat.displayEmail}</p>}
                        </div>
                        {activeChat.isGroup && (
                            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                                <div className="mb-4 flex gap-2"><input type="email" className="flex-1 border p-2 rounded text-sm" placeholder="Yeni Üye E-posta" value={addMemberEmail} onChange={(e) => setAddMemberEmail(e.target.value)} /><button onClick={handleAddMemberToGroup} className="bg-green-500 text-white p-2 rounded hover:bg-green-600"><UserPlus className="w-4 h-4" /></button></div>
                                <p className="text-xs font-bold text-gray-400 mb-2 uppercase">{chatMembersDetails.length} Üye</p>
                                {chatMembersDetails.map(member => (
                                    <div key={member.id} className="flex items-center justify-between bg-white p-2 rounded mb-2 shadow-sm">
                                        <div className="flex items-center gap-2"><div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-xs">{member.email?.[0].toUpperCase()}</div><div><p className="text-sm font-semibold">{member.name || 'İsimsiz'}</p><p className="text-xs text-gray-500">{member.email}</p></div></div>
                                        {(isAdmin || activeChat.createdBy === user?.uid) && member.id !== user?.uid && (<button onClick={() => handleRemoveMember(member.id, member.email)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Gruptan Çıkar"><X className="w-4 h-4" /></button>)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
            {showProfileModal && user && <ProfileModal user={user} onClose={() => setShowProfileModal(false)} />}
        </div>
    );
}