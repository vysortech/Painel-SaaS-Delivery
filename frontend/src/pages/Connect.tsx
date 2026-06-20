import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Smartphone, CheckCircle2, Loader2, AlertCircle, Hash } from 'lucide-react';

export default function Connect() {
    const { instancia } = useParams(); // actually this is the token now
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [status, setStatus] = useState<'loading' | 'qr' | 'connected' | 'error' | 'pairing'>('loading');
    const [phone, setPhone] = useState('');
    const [requestingPairing, setRequestingPairing] = useState(false);

    const fetchStatus = async (phoneNumber?: string) => {
        try {
            let url = `/api/public/whatsapp/qrcode/${instancia}`;
            if (phoneNumber) url += `?phone=${phoneNumber}`;
            
            const res = await axios.get(url);
            const data = res.data;

            if (data.connected || data.status === 'CONNECTED') {
                setStatus('connected');
                setQrCode(null);
                setPairingCode(null);
            } else if (data.code) {
                // Evolution Go returns pairing code as 'code'
                setStatus('pairing');
                setPairingCode(data.code);
            } else if (data.pairingCode) {
                setStatus('pairing');
                setPairingCode(data.pairingCode);
            } else if (data.base64) {
                setStatus('qr');
                setQrCode(data.base64);
            } else {
                setStatus('error');
            }
        } catch (err) {
            setStatus('error');
        } finally {
            setRequestingPairing(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(() => {
            if (status !== 'connected' && !requestingPairing) {
                fetchStatus();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [instancia, status, requestingPairing]);

    const handleRequestPairing = () => {
        if (!phone || phone.length < 10) return;
        setRequestingPairing(true);
        setStatus('loading');
        fetchStatus(phone.replace(/\D/g, ''));
    };

    return (
        <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#111827] border border-gray-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
                
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-8 h-8" />
                </div>

                <h1 className="text-2xl font-bold text-white">Conectar WhatsApp</h1>
                
                {status !== 'connected' && (
                    <p className="text-gray-400 text-sm">
                        Escaneie o QR Code abaixo ou solicite um código de conexão para o seu número.
                    </p>
                )}

                <div className="bg-white p-4 rounded-xl flex flex-col items-center justify-center min-h-[250px] relative">
                    {status === 'loading' && (
                        <div className="flex flex-col items-center text-gray-500">
                            <Loader2 className="w-10 h-10 animate-spin mb-2 text-blue-500" />
                            <p className="font-medium">Carregando conexão...</p>
                        </div>
                    )}
                    
                    {status === 'qr' && qrCode && (
                        <img src={qrCode} alt="QR Code WhatsApp" className="w-full h-auto max-w-[250px] mx-auto rounded" />
                    )}

                    {status === 'pairing' && pairingCode && (
                        <div className="flex flex-col items-center justify-center text-gray-800 p-4">
                            <Hash className="w-12 h-12 text-blue-500 mb-2" />
                            <p className="font-semibold mb-2">Seu Código de Conexão:</p>
                            <div className="text-4xl font-black tracking-widest text-blue-600 bg-blue-50 px-6 py-3 rounded-xl border border-blue-200">
                                {pairingCode}
                            </div>
                            <p className="text-xs text-gray-500 mt-4 text-center">Digite este código no WhatsApp quando for notificado.</p>
                        </div>
                    )}

                    {status === 'connected' && (
                        <div className="flex flex-col items-center text-emerald-500">
                            <CheckCircle2 className="w-16 h-16 mb-2" />
                            <p className="font-bold text-lg">WhatsApp Conectado!</p>
                            <p className="text-sm text-gray-500 mt-2 text-center">Seu robô de atendimento já está pronto para uso. Você pode fechar esta tela.</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center text-red-500">
                            <AlertCircle className="w-12 h-12 mb-2" />
                            <p className="font-bold">Erro de conexão</p>
                            <p className="text-xs text-gray-500 mt-1">O link pode ser inválido ou a instância não está pronta.</p>
                        </div>
                    )}
                </div>

                {(status === 'qr' || status === 'error') && (
                    <div className="mt-4 border-t border-gray-800 pt-6">
                        <p className="text-sm text-gray-400 mb-3">Está no celular? Conecte com código:</p>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="DDI + DDD + Número (Ex: 55119...)"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm outline-none focus:border-blue-500"
                            />
                            <button 
                                onClick={handleRequestPairing}
                                disabled={requestingPairing || phone.length < 10}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                            >
                                Gerar Código
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
