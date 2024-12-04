import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { typeDefs } from "./schema/schema.js";
import PackageModel from "./models/Package.model.js";
import UserModel from "./models/User.model.js";
import dotenv from "dotenv";
import authMiddleware from "./utils/jwt.js";

dotenv.config();

mongoose
  .connect("mongodb://localhost:27017/package-management-system-db", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("MongoDB connection error:", error));

const resolvers = {
  Query: {
    // Package Queries
    getAllPackages: async (_, { filter }, { user }) => {
      // return all packages
      if (!user) {
        return {
          status: false,
          message: "Authentication required",
        };
      }
      let query = {};
      if (user.userType !== "admin") {
        query.user = user._id;
      }
      if (filter) {
        if (filter.expirationDate) {
          query.expirationDate = new Date(filter.expirationDate);
        }
        if (filter.expirationDateBefore) {
          query.expirationDate = query.expirationDate || {};
          query.expirationDate.$lt = new Date(filter.expirationDateBefore);
        }
        if (filter.expirationDateAfter) {
          query.expirationDate = query.expirationDate || {};
          query.expirationDate.$gt = new Date(filter.expirationDateAfter);
        }
      }
      let packagesQuery = PackageModel.find(query);

      if (user.userType === "admin") {
        packagesQuery = packagesQuery.populate("user");
      }

      const packages = await packagesQuery;
      return packages;
    },

    getSinglePackage: async (_, request) => {
      // return single package
      return PackageModel.findById(request.id);
    },
    // End of Package Queries
  },

  Mutation: {
    // Package Mutations
    createPackage: async (_, { request }, { user }) => {
      // create a single package
      if (!user) {
        return {
          status: false,
          message: "Authentication required",
        };
      }
      try {
        const newPackage = new PackageModel({ ...request, user: user._id });
        await newPackage.save();
        return {
          status: true,
          message: "Package created successfully",
          data: newPackage,
        };
      } catch (error) {
        console.error("Error creating package:", error);
        return {
          status: false,
          message: error.message || "Failed to create package",
          data: null,
        };
      }
    },
    updatePackage: async (_, args, { user }) => {
      // update a single package
      if (!user) {
        return {
          status: false,
          message: "Authentication required",
        };
      }
      try {
        const existingPackage = await PackageModel.findById(args.id);
        if (!existingPackage) {
          return {
            status: false,
            message: "Package not found",
            data: null,
          };
        }
        if (!existingPackage.user.equals(user._id)) {
          return {
            status: false,
            message: "You are not authorized to update this package",
            data: null,
          };
        }
        const updatedPackage = await PackageModel.findByIdAndUpdate(
          args.id,
          args.request,
          { new: true, runValidators: true }
        );
        return {
          status: true,
          message: "Package updated successfully",
          data: updatedPackage,
        };
      } catch (error) {
        console.error("Error updating package", error);
        return {
          status: false,
          message: error.message || "Failed to create package",
          data: null,
        };
      }
    },
    deletePackage: async (_, args, { user }) => {
      // delete a package
      if (!user) {
        return {
          status: false,
          message: "Authentication required",
        };
      }
      try {
        const existingPackage = await PackageModel.findById(args.id);
        if (!existingPackage) {
          return {
            status: false,
            message: "Package not found",
            data: null,
          };
        }
        if (!existingPackage.user.equals(user._id)) {
          return {
            status: false,
            message: "You are not authorized to delete this package",
            data: null,
          };
        }
        const deletedPackage = await PackageModel.findByIdAndDelete(args.id);
        return {
          status: true,
          message: "Package deleted successfully",
          data: deletedPackage,
        };
      } catch (error) {
        console.error("Error deleting package", error);
        return {
          status: false,
          message: error.message || "Failed to delete package",
          data: null,
        };
      }
    },
    // End of Package Mutations
    createUser: async (_, { request }) => {
      const { userName, password, userType } = request;

      // Check if the user already exists
      const existingUser = await UserModel.findOne({ userName });
      if (existingUser) {
        return {
          status: false,
          message: "User already exists",
        };
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new UserModel({
        userName,
        password: hashedPassword,
        userType,
      });

      try {
        await newUser.save();
        return {
          status: true,
          message: "User created successfully",
          data: null,
        };
      } catch (error) {
        return {
          status: false,
          message: error.message,
        };
      }
    },
    login: async (_, { request }) => {
      try {
        // Find the user by username
        const user = await UserModel.findOne({ userName: request.userName });
        if (!user) {
          return {
            status: false,
            message: "Invalid credentials",
          };
        }
        const isPasswordValid = await bcrypt.compare(
          request.password,
          user.password
        );
        if (!isPasswordValid) {
          console.log("Password comparison failed for user:", request.userName);

          return {
            status: false,
            message: "Invalid credentials",
          };
        }
        const token = jwt.sign(
          { id: user._id, userType: user.userType },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
        );
        return {
          status: true,
          message: "Login successful",
          data: { token },
        };
      } catch (error) {
        return {
          status: false,
          message: error.message,
        };
      }
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    const user = await authMiddleware(req);
    return { user };
  },
});

console.log("we dey port", 4000);
