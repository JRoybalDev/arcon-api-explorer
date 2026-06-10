import { motion } from "framer-motion";
import { useEffect } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { Link } from "react-router-dom";
import { setDocumentTitle } from "../shared/siteConfig";

export function NotFound() {
  useEffect(() => {
    setDocumentTitle("Not Found");
  }, []);

  return (
    <section className="not-found-page page-content">
      <motion.div animate={{ opacity: 1, y: 0 }} className="not-found-panel" initial={{ opacity: 0, y: 18 }} transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}>
        <span className="eyebrow">404</span>
        <h1>Page not found</h1>
        <p>The route you opened does not exist in this template.</p>
        <Link className="btn btn-primary" to="/">
          <FiArrowLeft aria-hidden /> Back to public site
        </Link>
      </motion.div>
    </section>
  );
}
