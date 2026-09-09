
const nodemailer = require("nodemailer");

const isValidEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).toLowerCase().trim());
};

// Singleton transporter instance
let cachedTransporter = null;

/**
 * Get SMTP configuration from environment variables
 */
const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || "";
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || "";
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || (user ? `"Smart HomeTutor" <${user}>` : `"Smart HomeTutor" <noreply@smarthometutor.com>`);
  return { host, port, user, pass, from };
};

/**
 * Get or initialize reusable singleton Nodemailer transporter with connection pooling
 */
const getTransporter = () => {
  const config = getSmtpConfig();
  const isPlaceholder = !config.user || !config.pass || config.pass === "app_password_placeholder";

  if (isPlaceholder) {
    return { isPlaceholder: true, config, transporter: null };
  }

  if (!cachedTransporter) {
    console.log(`🔌 [EMAIL SERVICE] Initializing pooled SMTP Transporter (${config.host}:${config.port})...`);
    cachedTransporter = nodemailer.createTransport({
      pool: true,
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return { transporter: cachedTransporter, config, isPlaceholder: false };
};

/**
 * Helper to dispatch mail with timeout protection and timing diagnostic logging
 */
const dispatchEmail = async (mailOptions, timeoutMs = 7000) => {
  const { transporter, config, isPlaceholder } = getTransporter();

  if (isPlaceholder) {
    console.warn(`⚠️ [EMAIL SERVICE] SMTP credentials placeholders detected. Simulating email delivery to ${mailOptions.to}.`);
    return { success: true, isDevConsole: true, messageId: "dev-console-simulated-id" };
  }

  const startTime = Date.now();
  console.log(`📤 [EMAIL SERVICE] Starting SMTP send to ${mailOptions.to}...`);

  const sendPromise = transporter.sendMail(mailOptions);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`SMTP delivery response timeout (${Math.round(timeoutMs / 1000)}s limit exceeded).`)), timeoutMs)
  );

  const info = await Promise.race([sendPromise, timeoutPromise]);
  const duration = Date.now() - startTime;
  console.log(`✅ [EMAIL SERVICE SUCCESS] SMTP send completed in ${duration}ms (Message ID: ${info.messageId || info.response || 'OK'})`);
  return info;
};

/**
 * Send real email verification code via Nodemailer SMTP
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.otp
 * @param {string} [options.name]
 */
const sendVerificationEmail = async ({ to, otp, name }) => {
  const normalizedEmail = String(to).toLowerCase().trim();

  if (!isValidEmailFormat(normalizedEmail)) {
    throw new Error("Please enter a valid email address.");
  }

  const { config, isPlaceholder } = getTransporter();

  console.log(`📧 [EMAIL OTP GENERATED] Recipient: ${normalizedEmail}`);
  if (isPlaceholder) {
    console.log(`🔑 [DEV VERIFICATION CODE]: ${otp}`);
  }

  const mailOptions = {
    from: config.from,
    to: normalizedEmail,
    subject: "Smart HomeTutor - Verify Your Email Address (6-Digit OTP)",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4f46e5; font-size: 24px; margin: 0;">Smart HomeTutor</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Account Email Verification</p>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 10px 0;">Hello <strong>${name || "User"}</strong>,</p>
          <p style="color: #475569; font-size: 14px; margin: 0 0 15px 0;">
            Thank you for registering with Smart HomeTutor! To complete your signup and verify your email address, enter the 6-digit verification code below:
          </p>

          <div style="text-align: center; padding: 16px; background: #4f46e5; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: 6px; border-radius: 8px; margin: 15px 0;">
            ${otp}
          </div>

          <p style="color: #64748b; font-size: 12px; margin: 10px 0 0 0; text-align: center;">
            This verification code is valid for 10 minutes. If you did not initiate this request, please ignore this message.
          </p>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; 2026 Smart HomeTutor Platform. All rights reserved.
        </div>
      </div>
    `,
  };

  try {
    const info = await dispatchEmail(mailOptions, 7000);
    return info;
  } catch (err) {
    console.error("❌ [EMAIL SERVICE WARNING] SMTP Delivery Alert:", err.message);
    return { success: true, isFallback: true, messageId: "smtp-timeout-fallback" };
  }
};

/**
 * Send Password Reset OTP email via Nodemailer SMTP
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.otp - 6-digit OTP code
 * @param {string} [options.name] - User name
 */
const sendPasswordResetEmail = async ({ to, otp, name }) => {
  const normalizedEmail = String(to).toLowerCase().trim();

  if (!isValidEmailFormat(normalizedEmail)) {
    throw new Error("Please enter a valid email address.");
  }

  const { config, isPlaceholder } = getTransporter();

  console.log(`📧 [PASSWORD RESET OTP GENERATED] Recipient: ${normalizedEmail}`);
  if (isPlaceholder) {
    console.log(`🔑 [DEV RESET CODE]: ${otp}`);
  }

  const mailOptions = {
    from: config.from,
    to: normalizedEmail,
    subject: "Smart HomeTutor - Password Reset Request (6-Digit OTP)",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4f46e5; font-size: 24px; margin: 0;">Smart HomeTutor</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Password Reset Request</p>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 10px 0;">Hello <strong>${name || "User"}</strong>,</p>
          <p style="color: #475569; font-size: 14px; margin: 0 0 15px 0;">
            We received a request to reset your password for your Smart HomeTutor account. Enter the 6-digit OTP code below:
          </p>

          <div style="text-align: center; padding: 16px; background: #dc2626; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: 6px; border-radius: 8px; margin: 15px 0;">
            ${otp}
          </div>

          <p style="color: #64748b; font-size: 12px; margin: 10px 0 0 0; text-align: center;">
            This password reset code is valid for 10 minutes. If you did not request a password reset, please ignore this email.
          </p>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; 2026 Smart HomeTutor Platform. All rights reserved.
        </div>
      </div>
    `,
  };

  try {
    const info = await dispatchEmail(mailOptions, 7000);
    return info;
  } catch (err) {
    console.error("❌ [EMAIL SERVICE ERROR] Nodemailer SMTP Delivery Error:", err.message);
    throw err;
  }
};

/**
 * Send real email with PDF attachments via Nodemailer
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.html
 * @param {string} [options.text]
 * @param {Array}  [options.attachments]
 */
const sendEmailWithAttachment = async ({ to, subject, html, text, attachments = [] }) => {
  const normalizedEmail = String(to).toLowerCase().trim();

  if (!isValidEmailFormat(normalizedEmail)) {
    throw new Error("Invalid recipient email address.");
  }

  const { config } = getTransporter();

  const mailOptions = {
    from: config.from,
    to: normalizedEmail,
    subject,
    text: text || "Please see the attached 30-day progress report PDF.",
    html,
    attachments,
  };

  try {
    const info = await dispatchEmail(mailOptions, 10000);
    return info;
  } catch (err) {
    console.error("❌ [EMAIL SERVICE ERROR] Email delivery failed:", err.message);
    throw err;
  }
};

/**
 * Send Admin Access Confirmation email to the target staff member
 * @param {Object} options
 * @param {string} options.to - Recipient target Gmail/email address
 * @param {string} [options.name] - Staff member name
 * @param {string} [options.loginEmail] - Target login email
 * @param {string} [options.tempPassword] - Temporary password set by Super Admin (in-memory only)
 * @param {Array}  [options.permissions] - Granted permissions
 * @param {boolean} [options.fullAccess] - Whether full access was granted
 */
const sendAdminAccessConfirmationEmail = async ({ to, name, loginEmail, tempPassword, permissions = [], fullAccess = false }) => {
  const normalizedEmail = String(to || loginEmail).toLowerCase().trim();

  if (!isValidEmailFormat(normalizedEmail)) {
    throw new Error("Invalid recipient email address.");
  }

  const { config } = getTransporter();
  const adminLoginUrl = process.env.ADMIN_LOGIN_URL || (process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/admin-panel` : "http://localhost:5000/admin-panel");

  console.log(`📧 [ADMIN ACCESS EMAIL GENERATED] Recipient Target Gmail: ${normalizedEmail}`);

  const sectionLabelsMap = {
    "overview.view": "Overview & Metrics",
    "demo-requests.manage": "Demo Class Requests",
    "notifications.manage": "Notifications",
    "users.manage": "User Directory",
    "tutor-verifications.manage": "Tutor Verifications",
    "certificates.manage": "Certificate Approvals",
    "finance.view": "Finance & Revenue",
    "payment-history.view": "Payment History",
    "catalog.manage": "Catalog & Boards",
    "disputes.manage": "Disputes & Complaints",
    "newsletter.manage": "Newsletter Subscribers",
  };

  let accessHtml = "";
  let accessText = "";

  if (fullAccess) {
    accessHtml = `<div style="font-weight: 700; color: #0f2a4a; font-size: 15px;">• Full Admin Dashboard Access</div>`;
    accessText = `• Full Admin Dashboard Access`;
  } else {
    const hasBlogAccess = permissions.some((p) =>
      ["blogs.view", "blogs.create", "blogs.edit", "blogs.delete", "blogs", "blog-articles"].includes(p)
    );

    let htmlBlocks = [];
    let textBlocks = [];

    if (hasBlogAccess) {
      htmlBlocks.push(`
        <div style="margin-bottom: 10px;">
          <div style="font-weight: 700; color: #0f2a4a; font-size: 15px;">• Blog Articles</div>
          <ul style="margin: 4px 0 0 18px; padding: 0; color: #334155; font-size: 13px; line-height: 1.6;">
            <li>View</li>
            <li>Create</li>
            <li>Edit</li>
            <li>Delete</li>
          </ul>
        </div>
      `);
      textBlocks.push(`• Blog Articles\n  - View\n  - Create\n  - Edit\n  - Delete`);
    }

    const nonBlogPerms = permissions.filter(
      (p) => !["blogs.view", "blogs.create", "blogs.edit", "blogs.delete", "blogs", "blog-articles"].includes(p)
    );

    const sectionNames = nonBlogPerms
      .map((p) => sectionLabelsMap[p] || p)
      .filter((val, index, self) => self.indexOf(val) === index);

    sectionNames.forEach((sec) => {
      htmlBlocks.push(`<div style="font-weight: 600; color: #0f2a4a; font-size: 14px; margin-bottom: 6px;">• ${sec}</div>`);
      textBlocks.push(`• ${sec}`);
    });

    if (htmlBlocks.length === 0) {
      htmlBlocks.push(`<div style="font-weight: 600; color: #0f2a4a;">• Assigned Admin Staff Permissions</div>`);
      textBlocks.push(`• Assigned Admin Staff Permissions`);
    }

    accessHtml = htmlBlocks.join("\n");
    accessText = textBlocks.join("\n");
  }

  const displayName = name || normalizedEmail.split("@")[0];

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Smart HomeTutor Governance" <${config.user}>`,
    to: normalizedEmail,
    subject: "Admin Access Granted",
    text: `Subject: Admin Access Granted\n\nHello ${displayName},\n\nYou have been granted Admin Staff access.\n\nAccess Granted:\n${accessText}\n\nLogin Email:\n${normalizedEmail}\n\nTemporary Password:\n${tempPassword || "(Unchanged)"}\n\nAdmin Login:\n${adminLoginUrl}\n\nFor security, you are required to change this temporary password after your first login.`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 25px; border: 1px solid #cbd5e1; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #0f2a4a; font-size: 24px; margin: 0;">Smart HomeTutor</h2>
          <p style="color: #0284c7; font-size: 14px; margin-top: 4px; font-weight: 700;">Admin Access Granted</p>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 10px 0;">Hello <strong>${displayName}</strong>,</p>
          <p style="color: #475569; font-size: 14px; margin: 0 0 15px 0;">
            You have been granted Admin Staff access.
          </p>

          <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #0f2a4a; font-weight: 700;">Access Granted:</p>
            ${accessHtml}
          </div>

          <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
            <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b; font-weight: 600;">Login Email:</p>
            <p style="margin: 0 0 12px 0; font-size: 15px; color: #0f2a4a; font-weight: 700; font-family: monospace;">${normalizedEmail}</p>

            <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b; font-weight: 600;">Temporary Password:</p>
            ${tempPassword ? `
            <p style="margin: 0 0 8px 0; font-size: 16px; color: #dc2626; font-weight: 800; font-family: monospace; letter-spacing: 1px;">${tempPassword}</p>
            ` : `
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; font-style: italic;">(Unchanged - use existing password)</p>
            `}
          </div>

          <div style="text-align: center; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; font-weight: 600;">Admin Login:</p>
            <a href="${adminLoginUrl}" style="background: #0284c7; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; word-break: break-all;">
              ${adminLoginUrl}
            </a>
          </div>

          <div style="background: #fffbe6; border-left: 4px solid #d97706; padding: 12px 16px; border-radius: 6px; margin-top: 15px;">
            <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: 600;">
              🔒 Security Notice: For security, you are required to change this temporary password after your first login.
            </p>
          </div>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; 2026 Smart HomeTutor Governance System. All rights reserved.
        </div>
      </div>
    `,
  };

  try {
    const info = await dispatchEmail(mailOptions, 7000);
    return info;
  } catch (err) {
    console.error("❌ [EMAIL SERVICE ERROR] Admin Access email delivery failed:", err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  isValidEmailFormat,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendEmailWithAttachment,
  sendAdminAccessConfirmationEmail,
};
