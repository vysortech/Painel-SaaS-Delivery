import React, { useEffect, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { Smartphone, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import api from '../../services/api';

interface ConnectionScreenProps {
    tenantId: string;
    instanceName: string;
    onClose: () => void;
}

export const ConnectionScreen: React.FC<ConnectionScreenProps> = ({ tenantId, instanceName, onClose }) => {
    const { socket, isConnected } = useSocket(tenantId);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [status, setStatus] = useState<'PENDING' | 'CONNECTING' | 'CONNECTED' | 'ERROR'>('PENDING');

    useEffect(() => {
        // Inicia o processo de conexão assim que a tela abre
        api.post(`/whatsapp/instances/${instanceName}/connect`, {}, {
            params: { tenant_id: tenantId }
        }).then(res => {
            // Se o backend já retornou o QR Code direto da Evolution Go, mostra imediatamente
            if (res.data?.base64) {
                setQrCode(res.data.base64);
                setStatus('CONNECTING');
            }
            if (res.data?.pairingCode) {
                setPairingCode(res.data.pairingCode);
                setStatus('CONNECTING');
            }
        }).catch(err => {
            console.error(err);
            setStatus('ERROR');
        });

        if (socket) {
            socket.on('qrcode.updated', (data: { instance: string, base64: string, pairingCode?: string }) => {
                if (data.instance === instanceName) {
                    if (data.base64) setQrCode(data.base64);
                    if (data.pairingCode) setPairingCode(data.pairingCode);
                    setStatus('CONNECTING');
                }
            });

            socket.on('instance.connection_update', (data: { instance: string, status: string }) => {
                if (data.instance === instanceName) {
                    if (data.status === 'CONNECTED') {
                        setStatus('CONNECTED');
                        setQrCode(null);
                    } else if (data.status === 'DISCONNECTED') {
                        setStatus('ERROR');
                    }
                }
            });
        }

        return () => {
            if (socket) {
                socket.off('qrcode.updated');
                socket.off('instance.connection_update');
            }
        };
    }, [socket, instanceName, tenantId]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex justify-center items-center p-4">
            <div className="bg-[#111827] border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-8 text-center relative overflow-hidden">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                   <XCircle className="w-6 h-6" />
                </button>
                
                {status === 'CONNECTED' ? (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                            <CheckCircle className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">WhatsApp Conectado!</h3>
                        <p className="text-gray-400 text-sm mb-8">
                            A instância <b>{instanceName}</b> foi sincronizada com sucesso. O motor de automação já está ativo.
                        </p>
                        <button onClick={onClose} className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition-all">
                            Fechar
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Smartphone className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Conectar WhatsApp</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            Abra o WhatsApp no seu celular, vá em "Aparelhos Conectados" e aponte a câmera para o QR Code abaixo.
                        </p>

                        <div className="bg-white p-6 rounded-xl flex items-center justify-center min-h-[300px] mb-6">
                            {qrCode ? (
                                <div className="flex flex-col items-center w-full">
                                    <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-auto max-w-[260px] mx-auto mb-4" />
                                    
                                    {pairingCode && (
                                        <div className="w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col items-center">
                                            <span className="text-sm text-gray-400 mb-1 font-medium">Código de Pareamento</span>
                                            <div className="text-[22px] font-black tracking-[0.2em] text-emerald-400">
                                                {pairingCode}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-gray-400 flex flex-col items-center">
                                    <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                                    <span className="text-sm font-medium">Gerando Conexão...</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`}></div>
                            {isConnected ? 'Sincronização em tempo real ativa' : 'Reconectando ao servidor...'}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
