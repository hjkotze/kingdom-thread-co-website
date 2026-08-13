import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Header from "../components/Header";
import Hero from "../components/Hero";
import ProductCategories from "../components/ProductCategories";
import HowItWorks from "../components/HowItWorks";
import Shop from "../components/Shop";
import DesignCTA from "../components/DesignCTA";
import Footer from "../components/Footer";
import { scrollToSection } from "../lib/scrollToSection";

export default function HomePage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("all");

  const scrollTo = (href) => {
    scrollToSection(href);
  };

  // Supports links into this page with a hash (e.g. "/#shop" from the
  // account page's "start a new quote request" button).
  useEffect(() => {
    if (window.location.hash) {
      scrollToSection(window.location.hash);
    }
  }, []);

  const handleOrderNow = (product) => {
    navigate(`/quote/${product.id}`);
  };

  return (
    <>
      <Header />
      <Hero scrollTo={scrollTo} />
      <ProductCategories setActiveFilter={setActiveFilter} scrollTo={scrollTo} />
      <HowItWorks />
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
