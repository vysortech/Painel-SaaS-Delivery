import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Smartphone, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function Connect() {
    const { instancia } = useParams();
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [status, setStatus] = useState<'loading' | 'qr' | 'connected' | 'error'>('loading');

    const fetchStatus = async () => {
        try {
            const res = await axios.get(`/api/evolution/connect/${instancia}`);
            const data = res.data;

            if (data?.instance?.state === 'open') {
                setStatus('connected');
                setQrCode(null);
            } else if (data?.base64) {
                setStatus('qr');
                setQrCode(data.base64);
            } else if (data?.instance?.state === 'connecting') {
                setStatus('loading');
            } else {
                setStatus('error');
            }
        } catch (err) {
            setStatus('error');
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [instancia]);

    return (
        <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#111827] border border-gray-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
                
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-8 h-8" />
                </div>

                <h1 className="text-2xl font-bold text-white">Conectar WhatsApp</h1>
                <p className="text-gray-400 text-sm">
                    Acesse o WhatsApp no seu celular, vá em Aparelhos Conectados e aponte a câmera para o QR Code abaixo.
                </p>

                <div className="bg-white p-4 rounded-xl flex items-center justify-center min-h-[250px] relative">
                    {status === 'loading' && (
                        <div className="flex flex-col items-center text-gray-500">
                            <Loader2 className="w-10 h-10 animate-spin mb-2 text-blue-500" />
                            <p className="font-medium">Gerando QR Code...</p>
                        </div>
                    )}
                    
                    {status === 'qr' && qrCode && (
                        <img src={qrCode} alt="QR Code WhatsApp" className="w-full h-auto max-w-[250px] mx-auto rounded" />
                    )}

                    {status === 'connected' && (
                        <div className="flex flex-col items-center text-emerald-500">
                            <CheckCircle2 className="w-16 h-16 mb-2" />
                            <p className="font-bold text-lg">WhatsApp Conectado!</p>
                            <p className="text-sm text-gray-500 mt-2 text-center">Seu robô de atendimento já está pronto para uso.</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center text-red-500">
                            <AlertCircle className="w-12 h-12 mb-2" />
                            <p className="font-bold">Erro ao gerar código</p>
                            <p className="text-xs text-gray-500 mt-1">Verifique a instância ou tente novamente.</p>
                        </div>
                    )}
                </div>

                {status === 'qr' && (
                    <div className="text-xs text-gray-500 animate-pulse">
                        Aguardando leitura do código...
                    </div>
                )}

            </div>
        </div>
    );
}
