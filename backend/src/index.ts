import express from 'express'
import { createServer} from 'http';
import { Server} from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv'
import {logger} from './utils/logger.js'
import {prisma} from './lib/db.js'

dotenv.config();

const app = express();
const httpServer = createServer(app);

//Enable CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}))
app.use(express.json());

const io = new Server(httpServer,{
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET','POST'],
        credentials: true,
    }
})

interface OnlineUser {
    id: string;
    name: string;
    color: string;
}

// Maps: boardId -> Map(socketId -> OnlineUser)
const rooms = new Map<string, Map<string,OnlineUser>>();

const COLORS = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777'];
const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)]

// Seed system owner helper

    async function ensureSystemOwner() {
        try {
            const systemUser = await prisma.user.findUnique({
                where: {email: 'system@syncspace.com'}
            });
            if(!systemUser){
                return await prisma.user.create({
                    data: {
                        id: 'system-owner',
                        name: 'System Owner',
                        email: 'system@syncspace.com'
                    }
                });
            }
            return systemUser;
        }catch(err){
            logger.error(err, 'Failed to ensure system owner');
        }
    }

ensureSystemOwner();

//Real Time event Handler
io.on('connection', (socket) => {
    logger.info({socketId: socket.id}, 'New socket client connected');

    socket.on('JOIN_BOARD',async({ boardId, username}) => {
        socket.join(boardId);

        try{
            let board = await prisma.board.findUnique({
                where: {id: boardId},
                include: {elements: true}
            });

            if(!board){
                board = await prisma.board.create({
                    data: {
                        id: boardId,
                        name: `Board ${boardId}`,
                        ownerId: 'system-owner'
                    },
                    include: {elements: true}
                });
            }

            //Room user management
            if (!rooms.has(boardId)){
                rooms.set(boardId, new Map());
            }

            const roomUsers = rooms.get(boardId)!;
            const color = getRandomColor();
            const user: OnlineUser = { id: socket.id, name: username, color};
            roomUsers?.set(socket.id,user);

            // Send Board data & user list to the current client
            socket.emit('USER_JOINED', {
                users: Array.from(roomUsers?.values())
            });

            //Notify everyone else in the room
            socket.to(boardId).emit('USER_JOINED',{
                users: Array.from(roomUsers.values())
            });

            //Send existing elements to the newly joined client
            for( const el of board.elements){
                const parsedElement = typeof el.data === 'string' ? JSON.parse(el.data) : el.data;
            }
        }catch(err){
            logger.error({err,boardId,username}, `Error in JOIN_BOARD`);
        }
    })

    socket.on('disconnect',() => {
        logger.info({socketId: socket.id},'Socket client disconnected')
    })
})

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT,() => {
    logger.info(`Backend server running at ${PORT}`)
})



