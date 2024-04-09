import mongoose from 'mongoose';

const { Schema } = mongoose;

const MessageSchema = new Schema({
    conversationId: {
        type: String,
        required: true
    },
    senderId: {
        type: String,
    },
    message: {
        type: String,
    }
    }, { timestamps: true });

const Message = mongoose.model('messages', MessageSchema);

export default Message;
