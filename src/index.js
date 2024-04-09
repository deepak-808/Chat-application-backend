import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import http from 'http';
import dotenv from 'dotenv';
import path from "path";
import mongoose from "mongoose";
import CookieParser from 'cookie-parser'
import { Server } from "socket.io";

dotenv.config();


import corsOptions from "./config/corsOption.js";
import { logger } from "./middleware/logEvent.js";
import errorHandler from "./middleware/errorHandler.js";
import connectDB from "./config/db.js";
import router from "./routes/auth.js";
import ChatRoute from "./routes/api/chat.js";
import { setUpExpressMiddleware } from "./middleware/status.js";
import { sendMessage } from "./controllers/Chat.js";

const users = [];
connectDB();
const app =  express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions
  });

app.use(logger);

io.on('connection', (socket) => {
  socket.on("addUser", userId => {
    const userIndex = users.findIndex(user => user.userId === userId);
    if (userIndex === -1) {
        socket.userId = userId;
        console.log("User ID:", userId);
        users.push({ userId, socketId: socket.id });
    } else {
        // User already exists, update their socket ID
        users[userIndex].socketId = socket.id;
    }
    // Emit the updated list of users to all clients
    io.emit('getUsers', users);
});

  socket.on('sendMessage', async(data) => {
    const findReciverId = users.find(user=> user.userId === data.reciverId);
    // const senderId = users.find(user=> user.userId === data.userId);
    if(findReciverId){
      const response = await sendMessage(data);
      console.log('data',response, findReciverId)

     io.to(findReciverId.socketId).emit('getMessage', response);
   }
  })

  socket.on('disconnect', () => {
    users.filter((user)=> user.socketId !== socket.id);
    io.emit('getUsers', users);
    console.log(`User disconnected ${"ID : "+ socket.userId}`);
  })
});

const port= process.env.PORT;

const __dirname = path.dirname(new URL(import.meta.url).pathname);

app.use(cors(corsOptions));

app.use(CookieParser());

//server static file
app.use('/', express.static(path.join(__dirname, '/public')));

// built-in middleware to handle urlencoded form data
app.use(bodyParser.urlencoded({ extended: true, limit:"5mb"}));
// parse application/json
app.use(bodyParser.json({limit: '10mb'}));

app.get('/', (req, res) => {
  return res.status(200).send('Welcome to the API');
});
app.use(setUpExpressMiddleware(app));

app.use('/auth', router)
app.use("/api",ChatRoute);
app.all('*', (req, res) => {
  res.status(404);
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, 'views', '404.html'));
  } else if (req.accepts('json')) {
    res.json({ "error": "404 Not Found" });
  } else {
    res.type('txt').send("404 Not Found");
  }
});

app.use(errorHandler);

mongoose.connection.once('open', () => {
    console.log("Connected to MongoDB");
server.listen(port, () => console.log(`Listening on port ${port}`))
});

