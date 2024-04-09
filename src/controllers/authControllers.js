import User from "../model/User.js";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import { configDotenv } from "dotenv";
configDotenv();
import { respondWithHttpStatusCode } from "../middleware/status.js";
const { SECRET_KEY, REFRESH_TOKEN_SECRET } = process.env;

const handleLogin = async (req, res) => {

  // user can login with email and username and mobile
  //   let user = await User.findOne({ $or: [{email : userData.username}, {username : userData.username}] });
  const { username, password } = req.body;
  try {
    if (!username || !password) return res.status(400).json({ 'message': 'Username and password are required.' });
    // Check if user exists in the database
    
    const userExist = await User.findOne({ username });
    if (!userExist) return respondWithHttpStatusCode(401, res, req.method);
    let user;
    // Check if the provided credential is an email, username, or mobile number
    if (username.includes('@')) {
      user = await User.findOne({ email: username }).select('+password');
    } else if (!isNaN(username) && username.length === 10) {
      user = await User.findOne({ mobile: username }).select('+password');
    } else {
      user = await User.findOne({ username: username }).select('+password');
    }

    // Verify the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).send("Invalid credentials");

    const roles = Object.values(user.roles).filter(Boolean);
    // Create a token for this user and send it as response
        // create JWTs
        const accessToken = jwt.sign(
            {
                "UserInfo": {
                    "username": user.username,
                    "roles": roles
                }
            },
            SECRET_KEY,
            { expiresIn: '10s' }
        );
        const refreshToken = jwt.sign(
            { "username": user.username, "userId":user._id },
            REFRESH_TOKEN_SECRET,
            { expiresIn: '1d' }
        );
        // Saving refreshToken with current user
        user.refreshToken = refreshToken;
        const result = await user.save();
        console.log(result);
        console.log(roles);

        // Creates Secure Cookie with refresh token
        res.cookie('jwt', refreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 24 * 60 * 60 * 1000 });

        // Send authorization roles and access token to user
        res.json({ roles, accessToken, user });
  } catch (error) {
    console.log(error);
    res.status(500).send();
  }
};

const handleNewUser = async (req, res) => {
  const { username, password, mobile, email, roles, fullName } = req.body;
  if (!username || !password) return res.status(400).json({ 'message': 'Username and password are required.' });

  // if (!/^[a-zA-Z0-9._]+@[a-z]{4}\.[a-z]{3}$/.test(email)) return res.status(422).json('Invalid Email');
  // else if(!(/^\d{10}$/).test(mobile)) return res.status(422).json("Entered Mobile number is not valid");
  // check for duplicate usernames in the db
  const duplicate = await User.findOne({ username: username }).exec();
  if (duplicate) return res.sendStatus(409); //Conflict 

  try {
      //encrypt the password
      const hashedPwd = await bcrypt.hash(password, 10);

      //create and store the new user
      const result = await User.create({
          "username": username,
          "password": hashedPwd,
          "email": email,
          "mobile": mobile,
          "fullName": fullName,
      });

      console.log(result);

      res.status(201).json({ 'success': `New user ${username} created!` });
  } catch (err) {
      res.status(500).json({ 'message': err.message });
  }
};

const handleLogout = async (req, res) => {

  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204); //No content
  const refreshToken = cookies.jwt;

  // Is refreshToken in db?
  const foundUser = await User.findOne({ refreshToken }).exec();
  if (!foundUser) {
      res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
      return res.sendStatus(204);
  }

  // Delete refreshToken in db
  foundUser.refreshToken = '';
  const result = await foundUser.save();
  console.log(result);

  res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
  res.sendStatus(204);
}

export { handleLogin, handleNewUser, handleLogout };
