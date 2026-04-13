import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
       const decoded = jwtDecode(token);

    if (decoded.is_admin === true || decoded.is_admin === 1) {
      return children;
    }
    return <Navigate to="/dashboard" replace />;
  } catch (error) {
    // If token is invalid
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }
};

export default AdminRoute;