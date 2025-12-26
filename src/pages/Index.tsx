import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import PricingCalculator from "@/components/PricingCalculator";
import Services from "@/components/Services";
import SEOSchema from "@/components/seo/SEOSchema";
import Footer from "@/components/Footer";

// Lazy load below-the-fold components
const WhyChooseUs = lazy(() => import("@/components/WhyChooseUs"));
const Testimonials = lazy(() => import("@/components/Testimonials"));
const BlogPreview = lazy(() => import("@/components/BlogPreview"));
const Contact = lazy(() => import("@/components/Contact"));
const AIChatbot = lazy(() => import("@/components/AIChatbot"));
const ServiceAreaLinks = lazy(() => import("@/components/seo/ServiceAreaLinks"));
const StickyCallButton = lazy(() => import("@/components/seo/StickyCallButton"));
const GoogleMapEmbed = lazy(() => import("@/components/seo/GoogleMapEmbed"));

const LazySection = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="min-h-[200px]" />}>
    {children}
  </Suspense>
);

const Index = () => {
  return (
    <>
      <SEOSchema
        pageTitle="TIDYWISE House Cleaning Fort Lauderdale, Boca Raton & West Palm Beach"
        pageDescription="TIDYWISE professional house cleaning in Fort Lauderdale, Boca Raton & West Palm Beach. Serving 40+ cities in Broward, Palm Beach & Miami-Dade. Call (561) 571-8725!"
        canonicalUrl="https://tidywisecleaning.com"
        pageType="home"
      />
      <main id="main-content" className="min-h-screen">
        <Navbar />
        <Hero />
        <PricingCalculator />
        <Services />
        <LazySection><WhyChooseUs /></LazySection>
        <LazySection><Testimonials /></LazySection>
        <LazySection><ServiceAreaLinks /></LazySection>
        <LazySection><GoogleMapEmbed /></LazySection>
        <LazySection><BlogPreview /></LazySection>
        <LazySection><Contact /></LazySection>
        <Footer />
        <LazySection><StickyCallButton /></LazySection>
        <LazySection><AIChatbot /></LazySection>
      </main>
    </>
  );
};

export default Index;