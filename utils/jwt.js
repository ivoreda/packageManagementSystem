import jwt from "jsonwebtoken";
import UserModel from "../models/User.model.js";

const authMiddleware = async (req) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.split(" ")[1];

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserModel.findById(decoded.id);
    if (!user) {
      console.log("User not found");
      return null;
    }
    return user;
  } catch (error) {
    console.error("Token validation failed:", error.message);
    return null;
  }
};

export default authMiddleware;
