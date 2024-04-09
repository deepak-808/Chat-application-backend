import express from 'express';
import {
  addMessageToConversation,
  createConversation,
  getAllUsers,
  getConversationWithId,
  getMessageWithConId,
  sendMessage,
} from '../../controllers/Chat.js';
import verifyJWT from '../../middleware/verifyJWT.js';
const router = express.Router();

router.post('/conversation', createConversation);

router.get('/conversation/:userId', getConversationWithId);

router.post('/sendmessage', addMessageToConversation);

router.get('/getmessage/:conversationId', getMessageWithConId);

router.get('/alluser/:id', getAllUsers);

router.post('/message', verifyJWT, sendMessage)


export default router;