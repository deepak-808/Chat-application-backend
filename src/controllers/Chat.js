import {
  respondWithData,
  respondWithHttpStatusCode,
} from "../middleware/status.js";
import Conversation from "../model/Conversation.js";
import Message from "../model/Messages.js";
import User from "../model/User.js";

const createConversation = async (req, res, next) => {
  const { receiverId, senderId } = req.body;
  try {
    if (!senderId || !receiverId) {
      return respondWithHttpStatusCode(400, res, req.method);
    } else {
      if (senderId === receiverId) {
        const findSelfChat = await Conversation.findOne({users:[senderId, {type: 'self'}]});
        if(!findSelfChat){
          let conversation = new Conversation({ users: [senderId, {type: 'self'}] });

        await conversation.save();
        return res.status(201).json(conversation);
        }else{
          return respondWithData(201, res, findSelfChat);
        }
        
      } else {
      const findDuplicate = await Conversation.findOne({
        users: { $all: [senderId, receiverId] },
      });

      if (findDuplicate) {
        return respondWithData(findDuplicate, res, "Start chat");
      } else {
        let conversation = new Conversation({ users: [senderId, receiverId] });

        await conversation.save();
        return res.status(201).json(conversation);
      }
    }
  }
  } catch (error) {
    return next(error);
  }
};

const getConversationWithId = async (req, res, next) => {
  const UserId = req.params.userId;
  try {
    const conversation = await Conversation.find({ users: { $in: [UserId] } });
    if (!conversation) {
      return respondWithHttpStatusCode(404, res, req.method);
    }
    const userDetails = await Promise.all(
      conversation.map(async (item) => {
        const otherUserId = item.users.filter((user) => user !== UserId)[0];
        if(otherUserId.type !== 'self'){
        const user = await User.findById(otherUserId).select(
          "-password -__v -refreshToken"
        );
        const data = {
          user: {
            email: user.email,
            id: user._id,
            username: user.username,
            fullName: user.fullName,
          },
          conversationId: item._id,
        };
        return data;
      } else {
        const user = await User.findById(UserId).select(
          "-password -__v -refreshToken"
        );
        const data = {
          user: {
            email: user.email,
            id: user._id,
            username: user.username,
            fullName: user.fullName += " (You)",
          },
          conversationId: item._id,
        };
        return data;
      }
      })
    );
    return respondWithData(
      userDetails,
      res,
      "Successfully fetched conversations"
    );
  } catch (error) {
    return next(error);
  }
};

const addMessageToConversation = async (req, res, next) => {
  const { conversationId, receiverId, senderId, message } = req.body;
  try {
    if (!conversationId) {
      if (!senderId || !receiverId) {
        return respondWithHttpStatusCode(400, res, req.method);
      } else {
        if (senderId === receiverId) {
          const selfChat = await Message.create({
            senderId: senderId,
            message: message,
          });
          return respondWithData(
            selfChat,
            res,
            "You have successfully sent a self chat"
          );
        }

        const findDuplicate = await Conversation.findOne({
          users: { $all: [senderId, receiverId] },
        });

        if (findDuplicate) {
          return respondWithData(findDuplicate, res, "Start chat");
        } else {
          let conversation = new Conversation({
            users: [senderId, receiverId],
          });
          await conversation.save();
          return res.status(201).json(conversation);
        }
      }
    } else {
      const createMessage = new Message({ conversationId, senderId, message });
      await createMessage.save();
      return respondWithData(
        createMessage,
        res,
        "Message added to the conversation successfully"
      );
    }
  } catch (error) {
    return next(error);
  }
};

const getMessageWithConId = async (req, res, next) => {
  const conversationId = req.params.conversationId;
  try {
    if (!conversationId) {
    }
    const message = await Message.find({ conversationId }).select("-__v");
    if (!message) {
      return respondWithHttpStatusCode(404, res, req.method);
    }
    // const messageUserData = await Promise.all(
    //   message.map(async (item) => {
    //     console.log(item);
    //     const conversation = await Conversation.findById(
    //       item.conversationId
    //     ).select("-__v");
    //     const filterReciverId = conversation.users.filter(
    //       (userId) => userId !== item.senderId
    //     );
    //     const user = await User.findById(filterReciverId[0]).select(
    //       "-password -__v -refreshToken"
    //     );
    //     const data = {
    //       user: {
    //         id: user._id,
    //         fullName: user.fullName,
    //       },
    //       message: { ...item._doc },
    //     };
    //     return data;
    //   })
    // );
    return respondWithData(
      message,
      res,
      "Successfully fetched messages with conversation ID"
    );
  } catch (error) {
    return next(error);
  }
};

// const getAllUsers = async (req, res, next) => {
//   try {
//     const {userID} = req.body;
//     const users = await User.find().select([
//       "-password",
//       "-__v",
//       "-refreshToken",
//       "-mobile",
//       "-username",
//       "-roles",
//     ]);
//     //not include self in the list of all users if add than add on in brect its Deepak(You)
//     let newArr = [];
//     for (let i = 0; i < users.length; i++) {
//       if (!users[i]._id.equals(userID)) {
//         newArr.push(users[i]);
//       }
//     }
//     return respondWithData(newArr, res, "Fetched all available users");
//     // return respondWithData(users, res, "successfully got all the users");
//   } catch (error) {
//     next(error);
//   }
// };
const getAllUsers = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch all users from the database, excluding sensitive fields
    const users = await User.find().select([
      "-password",
      "-__v",
      "-refreshToken",
      "-mobile",
      "-username",
      "-roles",
    ]);

    // Filter out the current user from the list of available users
    const mySelf = users.filter((user) => user._id.equals(id));

    // add my self with You
    mySelf[0]["fullName"] += " (You)";

    const others = users.filter((user) => !user._id.equals(id));
    // Return a combined array of both arrays
    return respondWithData(
      [...others, mySelf[0]],
      res,
      "Successfully fetched all users and your profile."
    );

    // Send the modified list of available users as a response
    // return respondWithData(availableUsers, res, "Fetched all available users");
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (data) => {
  try {
    const { receiverId, message, conversationId, userId } = data;

    let conversation;

    if (!conversationId && message && receiverId) {
      if (userId === receiverId) {
        const selfChatExist = await Conversation.findOne({
          users: [userId, { type: "self" }],
        });
        if (selfChatExist) {
          conversation = selfChatExist;
        } else {
          const SelfStartChat = new Conversation({
            users: [userId, { type: "self" }],
          });
          await SelfStartChat.save();
          conversation = SelfStartChat;
        }
      }
      const existingConversation = await Conversation.findOne({
        users: { $all: [userId, receiverId] },
      });
      if (existingConversation) {
        conversation = existingConversation;
      } else {
        conversation = new Conversation({ users: [userId, receiverId] });
        await conversation.save();
      }
    } else {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
    }

    const sender = await User.findById(userId).select("-password");
    const receiver = await User.findById(receiverId).select("-password");

    // Create and save the message
    const msg = new Message({
      message: message,
      senderId: sender._id,
      conversationId: conversation._id,
    });

    await msg.save();
    return msg
  } catch (error) {
    console.log(error);
  }
};

const getMessages = async(req, res, next) => {
  
}

export {
  createConversation,
  getConversationWithId,
  addMessageToConversation,
  getMessageWithConId,
  getAllUsers,
  sendMessage,
};
