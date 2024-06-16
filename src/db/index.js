import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

// connect to the database
const connectDB = async () => {
  try {
    // mongoose connection instance
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    // log the connection host
    console.log(
      `\nMongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    // log the error message
    console.error("MongoDB connection error ", error.message);
    process.exit(1);
  }
};

export default connectDB;
