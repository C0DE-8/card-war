import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const decoded = jwtDecode(token);

    if (decoded.is_admin === true || decoded.is_admin === 1) {
      return <Navigate to="/admin" replace />;
    }

    // Otherwise, permit access to standard dashboard
    return children;
  } catch (error) {
    // If token is malformed or invalid
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;