import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Header from "../components/Header";
import Hero from "../components/Hero";
import ProductCategories from "../components/ProductCategories";
import HowItWorks from "../components/HowItWorks";
import Shop from "../components/Shop";
import DesignCTA from "../components/DesignCTA";
import Footer from "../components/Footer";

export default function HomePage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [cartCount] = useState(0);

  const scrollTo = (href) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  // Supports links into this page with a hash (e.g. "/#shop" from the
  // account page's "start a new quote request" button).
  useEffect(() => {
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const handleOrderNow = (product) => {
    navigate(`/quote/${product.id}`);
  };

  return (
    <>
      <Header
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        cartCount={cartCount}
        scrollTo={scrollTo}
      />

      <Hero scrollTo={scrollTo} />

      <ProductCategories setActiveFilter={setActiveFilter} scrollTo={scrollTo} />

      <HowItWorks scrollTo={scrollTo} />

      <Shop
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        onOrderNow={handleOrderNow}
      />

      <DesignCTA scrollTo={scrollTo} />

      <Footer scrollTo={scrollTo} />
    </>
  );
}
