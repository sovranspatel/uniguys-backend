import "dotenv/config";
import { connectDB } from "../db.js";
import { Admin } from "../models/Admin.js";

async function run() {
  await connectDB();
  const email = process.env.ADMIN_EMAIL || "admin@uniguys.com";
  const pass  = process.env.ADMIN_PASSWORD || "Admin@123";

  let admin = await Admin.findOne({ email });
  if (!admin) {
    await Admin.create({ email, password: pass, name: "Super Admin" });
    console.log("✅ Admin created:", email);
  } else {
    admin.password = pass;
    await admin.save();
    console.log("🔁 Admin password reset:", email);
  }
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
