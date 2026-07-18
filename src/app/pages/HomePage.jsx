import { useRef, useState } from "react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import ProductCategories from "../components/ProductCategories";
import HowItWorks from "../components/HowItWorks";
import Shop from "../components/Shop";
import DesignCTA from "../components/DesignCTA";
import Contact from "../components/Contact";
import Footer from "../components/Footer";

function productToSelectValue(category, name) {
  if (category === "blanket-budget") return "budget-blanket";
  if (category === "blanket-premium") return "premium-blanket";
  if (category === "pillow-budget") return "budget-pillow";
  if (category === "pillow-premium") return "premium-pillow";
  if (category === "duvet-budget") return "budget-duvet";
  if (category === "duvet-premium") return "premium-duvet";
  if (name.toLowerCase().includes("ankle")) return "ankle-socks";
  if (name.toLowerCase().includes("crew")) return "crew-socks";
  return "";
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [cartCount] = useState(0);

  const [selectedProduct, setSelectedProduct] = useState("");
  const contactRef = useRef(null);

  const scrollTo = (href) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const handleOrderNow = (product) => {
    const selectVal = productToSelectValue(product.category, product.name);
    setSelectedProduct(selectVal);
    setTimeout(() => {
      contactRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
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

      <Contact
        sectionRef={contactRef}
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
      />

      <Footer scrollTo={scrollTo} />
    </>
  );
}
