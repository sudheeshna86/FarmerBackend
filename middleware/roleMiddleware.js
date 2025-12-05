// middleware/roleMiddleware.js
export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, no user found' });
    }
    console.log("Miidleware",role)
    if (req.user.role !== role) {
      return res.status(403).json({ message: `Access denied. Only ${role}s can perform this action.` });
    }

    next(); // ✅ role matched, move to controller
  };
};
