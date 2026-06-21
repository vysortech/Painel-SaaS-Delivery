import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle, QrCode, RefreshCw, X } from 'lucide-react';
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

                if (data.connected || data.status === 'CONNECTED' || data.status === 'OPEN') {
                    setStatus('connected');
                    setQrCode(null);
                    setPairingCode(null);
                } else if (data.status === 'CONNECTING') {
                    setStatus('loading');
                } else if (data.base64 || data.pairingCode || data.code) {
                    setStatus('qr_and_pairing');
                    if (data.base64) setQrCode(data.base64);
                    if (data.pairingCode || data.code) setPairingCode(data.pairingCode || data.code);
                } else {
                    setStatus('error');
                }
                
                if (data.nome_empresa) setNomeEmpresa(data.nome_empresa);
                if (data.instanceName) setInstanceName(data.instanceName);
                if (data.telefone_whatsapp && !phone) {
                    const onlyNumbers = data.telefone_whatsapp.replace(/\D/g, '');
                    if (onlyNumbers) setPhone(onlyNumbers);
                } else if (data.telefone_admin && !phone) {
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

    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
            <div className="max-w-[400px] w-full flex flex-col gap-3">
                {/* Cabeçalho */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 relative">
                    <button onClick={() => window.close()} className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center gap-2 text-white mb-2 font-bold text-lg">
                        <QrCode className="w-5 h-5 text-emerald-500" />
                        <h2>Conectar WhatsApp</h2>
                    </div>
                    
                    <p className="text-sm text-gray-400 leading-relaxed pr-6">
                        Escaneie o QR Code abaixo com seu WhatsApp para conectar a instância <strong className="text-white">{nomeEmpresa || instanceName || instancia}</strong>
                    </p>
                </div>

                {/* QR Code */}
                <div className="bg-white p-6 rounded-xl flex items-center justify-center min-h-[300px]">
                    {status === 'loading' && (
                        <div className="flex flex-col items-center text-gray-500">
                            <Loader2 className="w-10 h-10 animate-spin mb-2 text-[#0ea5e9]" />
                            <p className="font-medium text-sm">Carregando QR Code...</p>
                        </div>
                    )}
                    
                    {status === 'qr_and_pairing' && qrCode && (
                        <div className="flex flex-col items-center w-full">
                            <img src={qrCode} alt="QR Code WhatsApp" className="w-full h-auto max-w-[260px] mx-auto mb-4" />
                            {pairingCode && (
                                <div className="w-full mt-2 text-center bg-gray-800 border border-gray-700 rounded-xl p-4">
                                    <p className="text-sm text-gray-400 mb-1 font-medium">Código de Pareamento:</p>
                                    <div className="text-[22px] font-black tracking-[0.2em] text-emerald-400">
                                        {pairingCode}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {status === 'connected' && (
                        <div className="flex flex-col items-center text-[#10b981] text-center">
                            <CheckCircle2 className="w-20 h-20 mb-4 animate-bounce" />
                            <h2 className="font-black text-2xl mb-2">Conectado com sucesso!</h2>
                            <p className="text-gray-600 font-medium text-sm">Parabéns, você já pode fechar esta tela e usar o SaaS Delivery!</p>
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

                {/* Passo a Passo */}
                {status !== 'connected' && (
                    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                        <h3 className="text-white font-bold mb-3 text-sm">Como conectar:</h3>
                        <ol className="text-gray-400 text-sm space-y-2.5">
                            <li>1. Abra o WhatsApp no seu celular</li>
                            <li>2. Toque em Menu ou Configurações</li>
                            <li>3. Toque em Dispositivos conectados</li>
                            <li>4. Toque em Conectar um dispositivo</li>
                            <li>5. Aponte seu celular para esta tela para capturar o código</li>
                        </ol>
                    </div>
                )}

                {/* Botão de Atualizar e Fechar */}
                {status !== 'connected' && (
                    <div className="flex gap-2">
                        <button 
                            onClick={() => window.location.reload()}
                            className="flex-1 bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] text-white rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Atualizar QR Code
                        </button>
                        <button 
                            onClick={() => window.close()}
                            className="bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] text-white rounded-xl px-4 flex items-center justify-center transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
