import adminService from "../services/adminService.js";

const { getAdminConfig } = adminService;

const validateAdmin = async (req, res) => {
  try {
    const { email, secretCode } = req.body;

    if (!email || !secretCode) {
      return res.status(400).json({
        success: false,
        isAdmin: false,
        error: "Email and secret code are required",
      });
    }

    const adminConfig = getAdminConfig();
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email is authorized
    const isAuthorizedEmail =
      adminConfig.authorizedEmails.includes(normalizedEmail);

    // Check if secret code is valid
    const isValidSecretCode = adminConfig.secretCodes.includes(
      secretCode.trim()
    );

    const isAdmin = isAuthorizedEmail && isValidSecretCode;

    res.json({
      success: true,
      isAdmin: isAdmin,
      email: normalizedEmail,
      message: isAdmin ? "Admin access granted" : "Invalid credentials",
    });
  } catch (error) {
    console.error("📡 API: Admin validation error:", error.message);
    res.status(500).json({
      success: false,
      isAdmin: false,
      error: "Server error during admin validation",
    });
  }
};

const checkAdminStatus = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        isAuthorizedEmail: false,
        error: "Email is required",
      });
    }

    const adminConfig = getAdminConfig();
    const normalizedEmail = email.trim().toLowerCase();
    const isAuthorizedEmail =
      adminConfig.authorizedEmails.includes(normalizedEmail);

    res.json({
      success: true,
      isAuthorizedEmail: isAuthorizedEmail,
      email: normalizedEmail,
      message: isAuthorizedEmail
        ? "Email is authorized for admin access"
        : "Email is not authorized for admin access",
    });
  } catch (error) {
    console.error("📡 API: Admin email check error:", error.message);
    res.status(500).json({
      success: false,
      isAuthorizedEmail: false,
      error: "Server error during email check",
    });
  }
};

export default { validateAdmin, checkAdminStatus };
