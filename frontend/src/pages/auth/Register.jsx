import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { registerUser } from "../../api/authApi";
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

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
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
      const data = await registerUser(formData);

      if (!data?.success) {
        toast.error(data?.message || "Registration failed");
        return;
      }

      toast.success(data.message || "Account created");
      navigate("/login");
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Registration failed";
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

          <p className={styles.systemState}>CREATE ACCOUNT</p>
          <h1 className={styles.title}>{glitchText("CARD WAR")}</h1>
          <p className={styles.subtitle}>REGISTER TO JOIN THE BATTLE.</p>

          <div className={styles.inputGroup}>
            <label className={styles.label}>USERNAME</label>
            <input
              type="text"
              name="username"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>EMAIL</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
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
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <button type="submit" className={styles.portalButton} disabled={loading}>
            {loading ? "REGISTERING..." : "REGISTER"}
          </button>

          <Link to="/login" className={styles.secondaryButton}>ALREADY HAVE AN ACCOUNT? SIGN IN</Link>
          <p className={styles.footerText}>CARD WAR · v0.9.1</p>
        </form>
      </div>
    </div>
  );
};

export default Register;