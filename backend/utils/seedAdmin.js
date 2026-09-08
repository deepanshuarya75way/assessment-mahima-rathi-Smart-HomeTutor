
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const seedAdminAccount = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "useradmin2005@gmail.com";
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const adminPassword = process.env.ADMIN_PASSWORD || "Admin@HomeTutor2026!";
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await User.create({
        name: "mahi Chaudhary",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        isSuperAdmin: true,
        fullAccess: true,
        manageAccess: true,
        adminRoleName: "Super Admin",
        isVerified: true,
        walletBalance: 0,
        referralCode: "ADMIN-2026",
      });

      console.log(`✅ Default Admin Account Initialized (${adminEmail})`);
    } else {
      let updated = false;
      if (existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        updated = true;
      }
      if (!existingAdmin.isVerified) {
        existingAdmin.isVerified = true;
        updated = true;
      }
      if (!existingAdmin.isSuperAdmin) {
        existingAdmin.isSuperAdmin = true;
        existingAdmin.fullAccess = true;
        existingAdmin.manageAccess = true;
        existingAdmin.adminRoleName = "Super Admin";
        updated = true;
      }
      if (updated) {
        await existingAdmin.save();
      }
    }
  } catch (err) {
    console.error("Admin Account Seed Error:", err.message);
  }
};

module.exports = seedAdminAccount;
