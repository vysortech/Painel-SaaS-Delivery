import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');

export function useSocket(tenantId: string | null) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!tenantId) return;

        const newSocket = io(BACKEND_URL);

        newSocket.on('connect', () => {
            setIsConnected(true);
            newSocket.emit('join_tenant', tenantId);
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
        });

        setSocket(newSocket);

        return () => {
            newSocket.emit('leave_tenant', tenantId);
            newSocket.disconnect();
        };
    }, [tenantId]);

    return { socket, isConnected };
}
