import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Map, 
  Dna, 
  ShieldAlert, 
  LogOut, 
  ChevronRight, 
  Activity 
} from 'lucide-react';
import PortalLines from '../../components/auth/PortalLines';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    toast.success("Root session terminated");
    navigate('/login');
  };

  const adminModules = [
    {
      title: "Card Library",
      path: "/admin/cards",
      icon: <CreditCard size={32} />,
      desc: "Manage character and ability cards, rarities, stats, effects, and artwork.",
      stats: "DECK READY"
    },
    {
      title: "Zone Management",
      path: "/admin/locations",
      icon: <Map size={32} />,
      desc: "Stabilize world seeds, configure danger levels, and map coordinates.",
      stats: "100% STABLE"
    },
    {
      title: "Vessel Library",
      path: "/admin/vessels",
      icon: <Dna size={32} />,
      desc: "Configure starting soul paths, species stats, and reincarnation data.",
      stats: "DATABASE READY"
    },
    {
      title: "World Control",
      path: "/admin/world-control",
      icon: <ShieldAlert size={32} />,
      desc: "Smiting, karma grants, and direct world-state interference.",
      stats: "OVERRIDE MODE"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className={styles.adminPage}>
      <PortalLines />
      <div className={styles.adminSmoke}></div>

      <motion.div 
        className={styles.adminShell}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className={styles.glassPanel}>
          <header className={styles.header}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#888', fontSize: '0.7rem', margin: 0, letterSpacing: '2px' }}>
                  ACCESS: LEVEL ROOT
                </p>
                <h1 className={styles.rootTitle}>System Command</h1>
              </div>
              <div className={styles.systemPulse}>
                <Activity size={16} color="#ff4d6d" className={styles.pulseIcon} />
                <span style={{ fontSize: '0.7rem', color: '#ff4d6d' }}>LIVE STATE</span>
              </div>
            </div>
          </header>

          <motion.div className={styles.cardGrid} variants={containerVariants}>
            {adminModules.map((module, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Link to={module.path} className={styles.portalCard}>
                  <div className={styles.cardContent}>
                    <div className={styles.cardIcon}>{module.icon}</div>
                    <h3 className={styles.cardTitle}>{module.title}</h3>
                    <p className={styles.cardDesc}>{module.desc}</p>
                  </div>
                  <div className={styles.cardStats}>
                    <span>{module.stats}</span>
                    <ChevronRight size={16} />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={18} style={{ marginRight: '10px' }} />
            Terminate Session
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;