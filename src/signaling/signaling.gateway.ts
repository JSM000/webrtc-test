import {
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
    },
})
export class SignalingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join')
    handleJoin(@MessageBody() room: string, @ConnectedSocket() client: Socket) {
        console.log(`Client ${client.id} joining room ${room}`);
        client.join(room);
        client.to(room).emit('user-joined', client.id);
    }

    @SubscribeMessage('offer')
    handleOffer(@MessageBody() payload: any, @ConnectedSocket() client: Socket) {
        console.log(`Offer from ${client.id} to ${payload.target}`);
        this.server.to(payload.target).emit('offer', payload);
    }

    @SubscribeMessage('answer')
    handleAnswer(@MessageBody() payload: any, @ConnectedSocket() client: Socket) {
        console.log(`Answer from ${client.id} to ${payload.target}`);
        this.server.to(payload.target).emit('answer', payload);
    }

    @SubscribeMessage('ice-candidate')
    handleIceCandidate(@MessageBody() payload: any, @ConnectedSocket() client: Socket) {
        console.log(`ICE Candidate from ${client.id} to ${payload.target}`);
        this.server.to(payload.target).emit('ice-candidate', payload.candidate);
    }
}
