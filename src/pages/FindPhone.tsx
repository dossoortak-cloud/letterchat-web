import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import { BellRing } from 'lucide-react';

// 📍 LEAFLET İKON HATASI DÜZELTMESİ
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Haritayı merkeze odaklayan yardımcı bileşen
function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    map.setView(center);
    return null;
}

export default function FindPhone() {
    const { user } = useAuthStore();
    const [location, setLocation] = useState<[number, number] | null>(null);
    const [lastSeen, setLastSeen] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [pushToken, setPushToken] = useState<string | null>(null);

    const BACKEND_URL = "https://letterchat-server.vercel.app";

    // 1. KONUMU VE TOKEN'I CANLI DİNLE
    useEffect(() => {
        if (!user) return;

        const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                if (data.pushToken) setPushToken(data.pushToken);

                if (data.lastLocation) {
                    const { latitude, longitude, timestamp } = data.lastLocation;
                    setLocation([latitude, longitude]);
                    if (timestamp) {
                        setLastSeen(new Date(timestamp.seconds * 1000).toLocaleString());
                    }
                }
            }
        });
        return () => unsub();
    }, [user]);

    // 2. ALARM ÇALDIR
    const handleRing = async () => {
        if (!pushToken) {
            alert("Hata: Cihazın bildirim token'ı bulunamadı. Telefondan uygulamaya bir kez giriş yapın.");
            return;
        }

        const confirm = window.confirm("Telefonunda YÜKSEK SESLİ alarm çalacak ve GPS açılacak. Onaylıyor musun?");
        if (!confirm) return;

        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/send-notification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: pushToken,
                    title: "🚨 ACİL DURUM",
                    body: "Web panelinden alarm tetiklendi!",
                    data: { type: 'find_phone' }
                }),
            });

            if (response.ok) {
                alert("Sinyal başarıyla gönderildi! Telefon çalıyor...");
            } else {
                alert("Sunucu hatası oluştu.");
            }
        } catch (error) {
            alert("Bağlantı hatası.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen w-full relative bg-gray-100">
            {/* Üst Bilgi Barı */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4">
                <div>
                    <h1 className="text-lg font-bold text-gray-800">Cihazımı Bul 🛰️</h1>
                    <p className="text-xs text-gray-500">
                        {location ? `Son Görülme: ${lastSeen}` : 'Konum bekleniyor...'}
                    </p>
                </div>

                <button
                    onClick={handleRing}
                    disabled={loading || !pushToken}
                    className={`text-white font-bold py-2 px-4 rounded-full transition-all flex items-center gap-2 ${loading || !pushToken ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 animate-pulse'}`}
                >
                    {loading ? 'Sinyal Gidiyor...' : <><BellRing size={18} /> ALARMI ÇALDIR</>}
                </button>
            </div>

            {/* Harita */}
            {location ? (
                <MapContainer center={location} zoom={15} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={location}>
                        <Popup>
                            <b>Telefonun Burada!</b> <br /> {lastSeen}
                        </Popup>
                    </Marker>
                    <ChangeView center={location} />
                </MapContainer>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4 mx-auto"></div>
                        <h2 className="text-xl text-gray-600">Cihazdan sinyal bekleniyor...</h2>
                        <p className="text-sm text-gray-400 mt-2">
                            {pushToken ? "Telefondan konum izninin açık olduğundan emin olun." : "Cihaz bilgisi bekleniyor..."}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}