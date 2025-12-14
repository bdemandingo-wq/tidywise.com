import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

const Hero = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center pt-16"
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`,
        }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-foreground/50" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-background mb-6 animate-fade-in">
          Transform Your Home
          <br />
          Into a Sanctuary
        </h1>
        <p className="text-background/90 text-lg md:text-xl max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          South Florida's most trusted cleaning service. Professional, reliable, and thorough cleaning solutions.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <Button
            variant="outline"
            size="lg"
            className="bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90 font-semibold"
            asChild
          >
            <a href="tel:+15615718725" className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Call (561) 571-8725
            </a>
          </Button>
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            asChild
          >
            <a href="#booking">Get Instant Quote</a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
