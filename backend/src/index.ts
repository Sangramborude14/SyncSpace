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

//Real Time event Handler
io.on('connection', (socket) => {
    logger.info({socketId: socket.id}, 'New socket client connected');

    socket.on('disconnect',() => {
        logger.info({socketId: socket.id},'Socket client disconnected')
    })
})

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT,() => {
    logger.info(`Backend server running at ${PORT}`)
})



