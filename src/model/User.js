import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema({
    fullName: {
        type: String,
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
    },
    mobile: {
        type: Number,
        unique: true,
    },
    roles: {
        User: {
            type: Number,
            default: 2001
        },
        Editor: Number,
        Admin: Number
    },
    password: {
        type: String,
        required: true
    },
    refreshToken: String,
    }, { timestamps: true });


const User = mongoose.model('User', userSchema);

export default User;
