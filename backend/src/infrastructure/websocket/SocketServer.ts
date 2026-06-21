import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../../shared/logger';

let io: Server;

export class SocketServer {
    public static init(server: HttpServer): void {
        io = new Server(server, {
            cors: {
                origin: '*', // TODO: Restringir em produção
                methods: ['GET', 'POST']
            }
        });

        io.on('connection', (socket: Socket) => {
            logger.info({ socketId: socket.id }, 'Novo cliente Socket.io conectado');

            socket.on('join_tenant', (tenantId: string) => {
                socket.join(`tenant_${tenantId}`);
                logger.info({ socketId: socket.id, tenantId }, 'Cliente entrou na sala do tenant');
            });

            socket.on('leave_tenant', (tenantId: string) => {
                socket.leave(`tenant_${tenantId}`);
            });

            socket.on('disconnect', () => {
                logger.info({ socketId: socket.id }, 'Cliente Socket.io desconectado');
            });
        });
    }

    public static getIO(): Server {
        if (!io) {
            throw new Error('Socket.io não inicializado. Chame SocketServer.init(server) primeiro.');
        }
        return io;
    }

    public static emitToTenant(tenantId: string, event: string, payload: any): void {
        if (io) {
            io.to(`tenant_${tenantId}`).emit(event, payload);
        }
    }
}
