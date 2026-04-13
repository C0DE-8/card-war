import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { jwtDecode } from "jwt-decode";
import { loginUser } from "../../api/authApi";
import PortalLines from "../../components/auth/PortalLines";
import styles from "./Auth.module.css";

const glitchText = (text) => {
  return text.split("").map((char, index) => {
    const shouldBlink = char !== " " && [0, 2, 5, 7].includes(index);
    return (
      <span key={`${char}-${index}`} className={shouldBlink ? styles.blinkRune : ""}>
        {char}
      </span>
    );
  });
};

const Login = () => {
  const navigate = useNavigate();
  
  // identifier matches your backend 'email OR username' logic
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);

  const portalParticles = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i, size: Math.floor(Math.random() * 8) + 4,
      left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 6}s`, duration: `${5 + Math.random() * 8}s`
    }));
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await loginUser(formData);

      if (!data?.success || !data?.token) {
        toast.error(data?.message || "Sign in failed");
        return;
      }

      localStorage.setItem("token", data.token);

      const decoded = jwtDecode(data.token);
      const isAdmin =
        data.player?.is_admin === true ||
        data.player?.is_admin === 1 ||
        decoded.is_admin === true ||
        decoded.is_admin === 1;

      toast.success(data.message || "Welcome back");

      if (isAdmin) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Sign in failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <PortalLines />
      <div className={styles.smokeLayer}></div>
      <div className={styles.smokeLayerTwo}></div>
      <div className={styles.portalGlow}></div>
      <div className={styles.vignette}></div>

      {portalParticles.map((particle) => (
        <span key={particle.id} className={styles.particle}
          style={{
            width: `${particle.size}px`, height: `${particle.size}px`,
            left: particle.left, top: particle.top,
            animationDelay: particle.delay, animationDuration: particle.duration
          }}
        />
      ))}

      <div className={styles.authShell}>
        <form className={styles.authCard} onSubmit={handleSubmit}>
          <div className={styles.cornerTL}></div>
          <div className={styles.cornerTR}></div>
          <div className={styles.cornerBL}></div>
          <div className={styles.cornerBR}></div>

          <p className={styles.systemState}>SIGN IN</p>
          <h1 className={styles.title}>{glitchText("CARD WAR")}</h1>
          <p className={styles.subtitle}>ENTER YOUR CREDENTIALS TO PLAY.</p>

          <div className={styles.inputGroup}>
            <label className={styles.label}>EMAIL OR USERNAME</label>
            <input
              type="text"
              name="identifier"
              placeholder="Email or Username"
              value={formData.identifier}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>PASSWORD</label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <button type="submit" className={styles.portalButton} disabled={loading}>
            {loading ? "SIGNING IN..." : "SIGN IN"}
          </button>

          <Link to="/register" className={styles.secondaryButton}>CREATE ACCOUNT</Link>
          <p className={styles.footerText}>CARD WAR · v0.9.1</p>
        </form>
      </div>
    </div>
  );
};

export default Login;