const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">TW</span>
            </div>
            <span className="font-display text-xl font-bold">TidyWise</span>
          </div>
          <p className="text-background/70 text-sm">
            © {new Date().getFullYear()} TidyWise Cleaning Services. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
