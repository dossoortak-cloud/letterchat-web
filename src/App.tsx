import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
// 🔥 FIX: Kullanılmayan ikonlar silindi
import { Send, LogOut, Mic, PlusCircle, X, MapPin, FileText, Paperclip, Smile } from 'lucide-react';
import { EmojiPicker } from 'emoji-picker-react';
import './index.css';

// 🔥🔥🔥 1. MOBİLDEKİ FIREBASE AYARLARINI BURAYA YAPIŞTIR 🔥🔥🔥
const firebaseConfig = {
    apiKey: "AIzaSyDELbE1PwhowUDRzjro63slZgh9NUgp_xw",
    authDomain: "letterchatv1.firebaseapp.com",
    projectId: "letterchatv1",
    storageBucket: "letterchatv1.firebasestorage.app",
    messagingSenderId: "294068242272",
    appId: "1:294068242272:web:8d2e90b3a0f7b8a9b18005",
    measurementId: "G-Y8PRGJTGGX"
};

// 🔥🔥🔥 2. MOBİLDEKİ IMAGEKIT AYARLARINI BURAYA YAPIŞTIR 🔥🔥🔥
const IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/av1wamlkg";
const IMAGEKIT_PRIVATE_KEY = "private_uparUjYJFlstEvM55APzBBATF4o="; 

// Firebase Başlat
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages]);

  // Oturum Kontrolü
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u: any) => setUser(u));
    return () => unsub();
  }, []);

  // Sohbet Listesini Getir
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chats'), where('members', 'array-contains', user.uid), orderBy('lastMessageTime', 'desc'));
    const unsub = onSnapshot(q, (snapshot: any) => {
      const list = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      setChats(list);
    }, (error: any) => console.error(error));
    return () => unsub();
  }, [user]);

  // Mesajları Getir
  useEffect(() => {
    if (!activeChat) return;
    const q = query(collection(db, 'messages'), where('chatId', '==', activeChat.id), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snapshot: any) => {
      setMessages(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [activeChat]);

  // Yeni Kişi Listesi
  const fetchUsers = async () => {
    setShowNewChat(true);
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc: any) => ({ uid: doc.id, ...doc.data() })).filter((u: any) => u.uid !== user.uid);
      setUsersList(list);
    } catch (error) { console.error(error); }
  };

  const startChat = async (otherUser: any) => {
    setShowNewChat(false);
    const existingChat = chats.find(c => c.members.includes(otherUser.uid));
    if (existingChat) { setActiveChat(existingChat); return; }
    try {
      const newChatData = {
        members: [user.uid, otherUser.uid],
        memberEmails: [user.email, otherUser.email],
        chatName: otherUser.displayName || otherUser.email,
        lastMessage: "Sohbet başlatıldı",
        lastMessageTime: serverTimestamp(),
        createdAt: serverTimestamp(),
        isGroup: false
      };
      const docRef = await addDoc(collection(db, 'chats'), newChatData);
      setActiveChat({ id: docRef.id, ...newChatData });
    } catch (e) { console.error(e); }
  };

  // 🔥 WEB UYUMLU IMAGEKIT YÜKLEME FONKSİYONU 🔥
  const uploadToImageKit = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name);
    formData.append("useUniqueFileName", "true");

    const authHeader = `Basic ${btoa(IMAGEKIT_PRIVATE_KEY + ":")}`;

    try {
      const response = await fetch(`${IMAGEKIT_URL_ENDPOINT}/api/v1/files/upload`, {
        method: "POST",
        headers: { "Authorization": authHeader },
        body: formData
      });
      const data = await response.json();
      setUploading(false);
      return data.url;
    } catch (error) {
      console.error("Upload Hatası:", error);
      setUploading(false);
      return null;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = await uploadToImageKit(file);
      
      if (url) {
        let type = 'file';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('audio/')) type = 'audio';

        await addDoc(collection(db, 'messages'), {
          chatId: activeChat.id,
          senderId: user.uid,
          senderName: user.displayName || user.email,
          text: type === 'image' ? '📷 Fotoğraf' : file.name,
          mediaUrl: url,
          type: type,
          createdAt: serverTimestamp(),
          seen: false
        });
      }
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !activeChat) return;
    try {
      await addDoc(collection(db, 'messages'), {
        chatId: activeChat.id,
        senderId: user.uid,
        senderName: user.displayName || user.email,
        text: text,
        type: 'text',
        createdAt: serverTimestamp(),
        seen: false
      });
      setText("");
      setShowEmoji(false);
    } catch (error) { console.error(error); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (err: any) { alert("Giriş başarısız: " + err.message); } 
    finally { setLoading(false); }
  };

  // 🔥 FIX: Emoji event tipi any yapıldı
  const onEmojiClick = (emojiData: any) => {
    setText((prev) => prev + emojiData.emoji);
  };

  // --- LOGIN EKRANI ---
  if (!user) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1 style={{color: '#7b13d1', marginBottom: 10}}>LetterChat Web</h1>
          <p style={{color:'#666', marginBottom: 30}}>Mobil hesabınla giriş yap</p>
          <form onSubmit={handleLogin}>
            <input className="login-input" type="email" placeholder="E-posta Adresi" value={email} onChange={e => setEmail(e.target.value)} required />
            <input className="login-input" type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} required />
            <button className="login-btn" type="submit" disabled={loading}>{loading ? "Giriş Yapılıyor..." : "Giriş Yap"}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* SOL TARA: LISTE */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="my-avatar">{user.email?.charAt(0).toUpperCase()}</div>
          <div style={{display:'flex', gap: 15}}>
            <div title="Yeni Sohbet" style={{ cursor: 'pointer' }} onClick={fetchUsers}><PlusCircle size={24} color="#555" /></div>
            <div title="Çıkış Yap" style={{ cursor: 'pointer' }} onClick={() => signOut(auth)}><LogOut size={24} color="#d32f2f" /></div>
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {chats.length === 0 && <p style={{textAlign:'center', color:'#999', marginTop: 20}}>Sohbet yok. (+) ile başlat.</p>}
          {chats.map(chat => {
             let chatName = chat.chatName;
             if(!chat.isGroup) {
                const otherEmail = chat.memberEmails?.find((e:string) => e !== user.email);
                if(otherEmail) chatName = otherEmail.split('@')[0];
             }
             return (
              <div key={chat.id} className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`} onClick={() => setActiveChat(chat)}>
                <div className="avatar">{chatName ? chatName.charAt(0).toUpperCase() : '?'}</div>
                <div style={{flex:1, overflow:'hidden'}}>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <strong style={{fontSize: 16}}>{chatName}</strong>
                    {chat.lastMessageTime && <span style={{fontSize:11, color:'#667781'}}>{chat.lastMessageTime?.toDate ? chat.lastMessageTime.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</span>}
                  </div>
                  <p style={{ margin: '3px 0 0', color: '#667781', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.lastMessage || "..."}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* SAĞ TARAF: MESAJLAŞMA */}
      {activeChat ? (
        <div className="chat-area">
          <div className="chat-header">
            <div className="avatar">👤</div>
            <div>
              <strong style={{fontSize: 16}}>{activeChat.chatName || "Sohbet"}</strong>
            </div>
          </div>

          <div className="messages-list">
            {messages.map((msg: any) => {
              const isMe = msg.senderId === user.uid;
              let content = <p style={{margin:0}}>{msg.text}</p>;
              
              if(msg.type === 'image') content = (<div><img src={msg.mediaUrl} alt="Görsel" style={{maxWidth: '300px', borderRadius: 8, marginTop: 5}} />{msg.text !== '📷 Fotoğraf' && <p style={{margin:'5px 0 0'}}>{msg.text}</p>}</div>);
              else if (msg.type === 'audio') content = ( <div style={{display:'flex', alignItems:'center', gap: 5}}><Mic size={16} /> <span>Sesli Mesaj</span></div> );
              else if (msg.type === 'location') content = ( <div style={{display:'flex', alignItems:'center', gap: 5}}><MapPin size={16} color="red" /> <a href={msg.text} target="_blank" style={{color: 'blue'}} rel="noreferrer">Konumu Haritada Aç</a></div> );
              else if (msg.type === 'file') content = ( <div style={{display:'flex', alignItems:'center', gap: 5}}><FileText size={16} /> <a href={msg.mediaUrl} target="_blank" style={{color: 'blue'}} rel="noreferrer">Dosyayı İndir</a></div> );

              return (
                <div key={msg.id} className={`message ${isMe ? 'sent' : 'received'}`}>
                  {!isMe && <div style={{fontSize:10, color: '#e542a3', fontWeight:'bold', marginBottom: 2}}>{msg.senderName?.split('@')[0]}</div>}
                  {content}
                  <div className="message-time">{msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'} {isMe && <span>✓</span>}</div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT ALANI */}
          <div className="input-area" style={{position: 'relative'}}>
            
            {/* EMOJI PANELİ */}
            {showEmoji && (
              <div style={{position: 'absolute', bottom: '70px', left: '20px', zIndex: 10}}>
                <EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} />
              </div>
            )}

            {/* GİZLİ DOSYA INPUTU */}
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{display: 'none'}} 
              onChange={handleFileSelect} 
              accept="image/*,video/*,.pdf,.doc,.docx"
            />

            <div style={{display: 'flex', gap: 10}}>
                <button onClick={() => setShowEmoji(!showEmoji)} style={{background: 'none', border:'none', cursor:'pointer'}} title="Emoji">
                    <Smile color="#54656f" />
                </button>
                <button onClick={() => fileInputRef.current?.click()} style={{background: 'none', border:'none', cursor:'pointer'}} title="Dosya Ekle">
                    <Paperclip color="#54656f" />
                </button>
            </div>

            <input 
              className="chat-input"
              type="text" 
              value={text} 
              onChange={e => setText(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={uploading ? "Dosya yükleniyor..." : "Bir mesaj yazın..."}
              disabled={uploading}
            />
            
            <button onClick={handleSend} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
              {uploading ? <div className="loader">⌛</div> : <Send color="#7b13d1" />}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background:'#f0f2f5', borderBottom: '6px solid #7b13d1' }}>
          <h1 style={{color: '#7b13d1', fontWeight: 300, fontSize: 40}}>LetterChat Web</h1>
          <p style={{color: '#667781'}}>Telefonunu cebinde tut, mesajlaşmaya buradan devam et.</p>
        </div>
      )}

      {showNewChat && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header"><h3>Yeni Sohbet</h3><X style={{cursor: 'pointer'}} onClick={() => setShowNewChat(false)} /></div>
            <div style={{flex: 1, overflowY: 'auto'}}>
              {usersList.map((u: any) => (
                <div key={u.uid} onClick={() => startChat(u)} className="chat-item">
                  <div className="avatar">👤</div>
                  <div><strong>{u.displayName || u.email}</strong><div style={{fontSize: 12, color: '#666'}}>{u.email}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

