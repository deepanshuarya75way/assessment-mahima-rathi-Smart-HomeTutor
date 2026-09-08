const mongoose = require("mongoose");
const dns = require("dns");
const bcrypt = require("bcryptjs");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const connectDB = async () => {
  console.log("Connecting to MongoDB Atlas...");

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, 
    });

    console.log("✅ MongoDB Connected");

    const User = require("../models/User");
    const adminEmail = "useradmin2005@gmail.com";
    let admin = await User.findOne({ email: adminEmail });
    const hashedPassword = await bcrypt.hash("admin123", 10);

    if (!admin) {
      await User.create({
        name: "System Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        isSuperAdmin: true,
        fullAccess: true,
        manageAccess: true,
        adminRoleName: "Super Admin",
        isVerified: true,
      });
    } else {
      let updated = false;
      if (admin.role !== "admin") {
        admin.role = "admin";
        updated = true;
      }
      if (!admin.isVerified) {
        admin.isVerified = true;
        updated = true;
      }
      if (!admin.isSuperAdmin) {
        admin.isSuperAdmin = true;
        admin.fullAccess = true;
        admin.manageAccess = true;
        admin.adminRoleName = "Super Admin";
        updated = true;
      }
      const isMatch = await bcrypt.compare("admin123", admin.password);
      if (!isMatch) {
        admin.password = hashedPassword;
        updated = true;
      }
      if (updated) {
        await admin.save();
      }
    }
  } catch (error) {
    console.error("❌ MongoDB Connection Failed");
    console.error(error.name);
    console.error(error.message);
  }
};

module.exports = connectDB;