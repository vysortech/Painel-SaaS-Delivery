import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function Connect() {
    const { instancia } = useParams(); // actually this is the token now
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [status, setStatus] = useState<'loading' | 'qr' | 'pairing' | 'qr_and_pairing' | 'connected' | 'error'>('loading');
    const [phone, setPhone] = useState('');
    const [requestingPairing, setRequestingPairing] = useState(false);
    const [nomeEmpresa, setNomeEmpresa] = useState('');
    const [instanceName, setInstanceName] = useState('');

    useEffect(() => {
        let isMounted = true;
        const fetchStatus = async (phoneNumber?: string) => {
            try {
                let url = `/public/whatsapp/qrcode/${instancia}`;
                if (phoneNumber) url += `?phone=${phoneNumber}`;
                
                const res = await api.get(url);
                const data = res.data;

                if (!isMounted) return;

                if (data.connected || data.status === 'CONNECTED') {
                    setStatus('connected');
                    setQrCode(null);
                    setPairingCode(null);
                } else if (data.base64 || data.pairingCode || data.code) {
                    setStatus('qr_and_pairing');
                    if (data.base64) setQrCode(data.base64);
                    if (data.pairingCode || data.code) setPairingCode(data.pairingCode || data.code);
                } else {
                    setStatus('error');
                }
                
                if (data.nome_empresa) setNomeEmpresa(data.nome_empresa);
                if (data.instanceName) setInstanceName(data.instanceName);
                if (data.telefone_admin && !phone) {
                    const onlyNumbers = data.telefone_admin.split(',')[0].replace(/\D/g, '');
                    if (onlyNumbers) setPhone(onlyNumbers);
                }
            } catch {
                if (isMounted) setStatus('error');
            } finally {
                if (isMounted) setRequestingPairing(false);
            }
        };

        fetchStatus();
        const interval = setInterval(() => {
            if (status !== 'connected' && !requestingPairing) {
                fetchStatus();
            }
        }, 5000);
        
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [instancia, status, requestingPairing]);

    const handleRequestPairing = async () => {
        if (!phone || phone.length < 10) return;
        setRequestingPairing(true);
        setStatus('loading');
        try {
            const res = await api.get(`/public/whatsapp/qrcode/${instancia}?phone=${phone.replace(/\D/g, '')}`);
            const data = res.data;
            if (data.connected || data.status === 'CONNECTED') {
                setStatus('connected');
            } else if (data.base64 || data.pairingCode || data.code) {
                setStatus('qr_and_pairing');
                if (data.base64) setQrCode(data.base64);
                if (data.pairingCode || data.code) setPairingCode(data.pairingCode || data.code);
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        } finally {
            setRequestingPairing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#18181b] border border-[#27272a] rounded-2xl p-8 shadow-2xl flex flex-col items-center">
                
                <h1 className="text-xl font-bold text-white mb-2">Conectar WhatsApp</h1>
                {nomeEmpresa && (
                    <div className="flex flex-col items-center mb-6 text-sm">
                        <span className="text-gray-400">Cliente: <strong className="text-white">{nomeEmpresa}</strong></span>
                        <span className="text-gray-500 text-xs">Instância: {instanceName || instancia}</span>
                    </div>
                )}

                <div className="bg-white p-4 rounded-xl w-full flex flex-col items-center justify-center min-h-[300px] shadow-inner relative">
                    {status === 'loading' && (
                        <div className="flex flex-col items-center text-gray-500">
                            <Loader2 className="w-10 h-10 animate-spin mb-2 text-[#0ea5e9]" />
                            <p className="font-medium">Carregando conexão...</p>
                        </div>
                    )}
                    
                    {status === 'qr_and_pairing' && (
                        <div className="flex flex-col items-center w-full gap-4">
                            {qrCode && (
                                <img src={qrCode} alt="QR Code WhatsApp" className="w-full h-auto max-w-[280px] mx-auto rounded-lg" />
                            )}
                            {pairingCode && (
                                <div className="w-full bg-[#1e1e21] rounded-xl p-4 flex flex-col items-center border border-[#27272a] shadow-inner mt-2">
                                    <span className="text-xs text-gray-400 mb-2">Código de Pareamento</span>
                                    <div className="text-2xl font-black tracking-widest text-white">
                                        {pairingCode}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {status === 'connected' && (
                        <div className="flex flex-col items-center text-[#10b981]">
                            <CheckCircle2 className="w-16 h-16 mb-2" />
                            <p className="font-bold text-lg">Conectado com Sucesso</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center text-[#ef4444]">
                            <AlertCircle className="w-12 h-12 mb-2" />
                            <p className="font-bold">Erro de conexão</p>
                            <p className="text-xs text-gray-500 mt-1 text-center">Tente atualizar a página.</p>
                        </div>
                    )}
                </div>

                {status === 'qr_and_pairing' && (
                    <div className="mt-6 flex flex-col items-center">
                        <p className="text-[#a1a1aa] text-sm mb-3">Escaneie o QR Code ou use o Código de Pareamento</p>
                        <div className="flex items-center gap-2 text-sm text-[#71717a]">
                            <span className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse"></span>
                            Aguardando conexão...
                        </div>
                    </div>
                )}
                {status === 'connected' && (
                    <div className="mt-6 flex flex-col items-center text-center">
                        <p className="text-[#a1a1aa] text-sm">Seu WhatsApp já está conectado e operante.</p>
                        <p className="text-[#a1a1aa] text-sm mt-1">Pode fechar esta página com segurança.</p>
                    </div>
                )}

                {(status === 'error' || (status === 'qr_and_pairing' && !pairingCode)) && (
                    <div className="mt-8 w-full border-t border-[#27272a] pt-6">
                        <p className="text-xs text-[#71717a] mb-3 text-center uppercase tracking-wider font-semibold">Conectar pelo Celular (Pairing Code)</p>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="DDI + DDD + Número (Ex: 5511...)"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                className="flex-1 bg-[#27272a] border border-[#3f3f46] rounded-lg p-2.5 text-white text-sm outline-none focus:border-[#0ea5e9] transition-colors"
                            />
                            <button 
                                onClick={handleRequestPairing}
                                disabled={requestingPairing || phone.length < 10}
                                className="bg-[#27272a] border border-[#3f3f46] hover:bg-[#3f3f46] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
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
