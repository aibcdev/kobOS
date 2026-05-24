import React from 'react';

const Header = () => (
  <header className="fixed top-0 left-0 w-full bg-background/95 backdrop-blur-sm z-50 border-b border-border h-20 transition-all duration-300">
    <div className="h-full px-7 md:px-14 flex items-center justify-between">
      <a href="#" className="block focus:outline-none focus:ring-2 focus:ring-primary rounded-sm">
        <img src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/917d6f93-fb36-439a-8c48-884b67b35381_1600w.jpg" alt="sunday logo" className="h-6 w-auto object-contain" />
      </a>

      <nav className="hidden lg:flex items-center gap-8">
        <div className="relative group cursor-pointer flex items-center gap-1 hover:text-primary transition-colors text-[0.875rem]">
          <span>Products</span>
          <iconify-icon icon="solar:alt-arrow-down-linear" className="text-[1rem]"></iconify-icon>
        </div>
        <div className="relative group cursor-pointer flex items-center gap-1 hover:text-primary transition-colors text-[0.875rem]">
          <span>Customers</span>
          <iconify-icon icon="solar:alt-arrow-down-linear" className="text-[1rem]"></iconify-icon>
        </div>
        <a href="#" className="hover:text-primary transition-colors text-[0.875rem]">
          Pricing
        </a>
        <div className="relative group cursor-pointer flex items-center gap-1 hover:text-primary transition-colors text-[0.875rem]">
          <span>Resources</span>
          <iconify-icon icon="solar:alt-arrow-down-linear" className="text-[1rem]"></iconify-icon>
        </div>
      </nav>

      <div className="flex items-center gap-6">
        <a href="#" className="hidden md:flex items-center gap-2 border border-border rounded-full py-2 px-5 hover:bg-surface transition-colors text-[0.875rem]">
          Login
          <iconify-icon icon="solar:arrow-right-linear"></iconify-icon>
        </a>
        <button className="btn-primary bg-text text-background border border-text rounded-button px-6 py-3 text-[0.875rem] whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
          get a demo
        </button>
      </div>
    </div>
  </header>
);

const Hero = () => (
  <section className="py-14 md:py-[7.5rem] px-7 md:px-14">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
      <div className="flex flex-col items-start gap-8 z-10">
        <h1 className="tracking-tighter text-text leading-[1.05] text-[3rem] md:text-[4rem] lg:text-[4.5rem] font-medium">
          Take back control
          <br />
          of your restaurant.
        </h1>
        <p className="leading-[1.3] text-text max-w-md text-[0.875rem] md:text-[1rem] text-text/60 max-w-lg mt-2">
          The all-in-one platform for independent restaurants. We help you
          power your online ordering, website, and marketing—all with zero
          commissions.
        </p>
        <button className="btn-primary bg-text text-background rounded-button px-8 py-4 text-[1rem] mt-4 focus:outline-none focus:ring-2 focus:ring-primary">
          Discover it for free
        </button>
      </div>

      <div className="relative w-full aspect-square md:aspect-[4/3] rounded-card overflow-hidden">
        <img src="https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?auto=format&fit=crop&w=800&q=80" alt="Customers using sunday at table" className="w-full h-full object-cover" />

        <div className="glass-card absolute bottom-6 left-6 md:bottom-10 md:left-6 w-64 p-5 rounded-card border border-white/20 shadow-2xl z-20 flex flex-col gap-4 bg-black/50 text-white backdrop-blur-xl">
          <div className="bg-primary text-white inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.75rem] font-bold self-start">
            <iconify-icon icon="solar:check-circle-bold" className="text-base"></iconify-icon>
            Already paid
          </div>
          <h3 className="text-[1.25rem] font-medium mt-1">Saturday Party</h3>
          <div className="flex flex-col gap-3">
            {[
              { icon: '🍺', text: '50x Beers' },
              { icon: '🍹', text: '20x Margaritas' },
              { icon: '🍸', text: '25x Mojitos' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 text-[0.875rem] text-white/90">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl shadow-inner">
                  {item.icon}
                </div>
                <span className="font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

const StatsRow = () => (
  <section className="border-t border-border py-14 px-7 md:px-14">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-14">
      <div className="flex flex-col gap-2">
        <span className="text-[2.5rem] md:text-[3.5rem] leading-none tracking-tighter text-primary">85%</span>
        <span className="text-[0.75rem] uppercase tracking-wider text-text/60">Direct Order Increase</span>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[2.5rem] md:text-[3.5rem] leading-none tracking-tighter">0%</span>
        <span className="text-[0.75rem] uppercase tracking-wider text-text/60">Commission Fees</span>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[2.5rem] md:text-[3.5rem] leading-none tracking-tighter">$3k+</span>
        <span className="text-[0.75rem] uppercase tracking-wider text-text/60">Monthly Savings</span>
      </div>
      <div className="flex flex-col gap-2 relative">
        <span className="text-[2.5rem] md:text-[3.5rem] leading-none tracking-tighter">2.5k+</span>
        <span className="text-[0.75rem] uppercase tracking-wider text-text/60">Independent Restaurants</span>
      </div>
    </div>
  </section>
);

const Marquee = () => {
  const MarqueeContent = () => (
    <div className="flex w-1/2 justify-around items-center px-4 shrink-0">
      <img src="https://sundayapp.com/app/uploads/2025/11/RestaurantChickies-Petes-LanguagesUS-min.png" alt="Chickies" className="h-10 md:h-12 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" />
      <img src="https://sundayapp.com/app/uploads/2025/11/RestaurantFabrika-LanguagesUS-min.png" alt="Fabrika" className="h-10 md:h-12 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" />
      <img src="https://sundayapp.com/app/uploads/2025/11/RestaurantVandelay-LanguagesUS-min.png" alt="Vandelay" className="h-10 md:h-12 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" />
      <span className="text-[2rem] font-bold tracking-tighter text-text/20">DISHOM</span>
      <span className="text-[2rem] font-bold tracking-tighter text-text/20">BASTILLE</span>
    </div>
  );

  return (
    <section className="py-10 border-t border-border bg-background overflow-hidden flex items-center relative">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10"></div>
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10"></div>
      <div className="flex w-[200%] animate-marquee items-center">
        <MarqueeContent />
        <MarqueeContent />
      </div>
    </section>
  );
};

const DarkSection = () => {
  const cards = [
    {
      title: "Direct Online Ordering",
      desc: "Zero-commission ordering built to convert.",
      img: "https://sundayapp.com/app/uploads/2025/11/PaymentPayment-Terminal-LanguageUS-ModeDark-min.png",
      imgClass: "absolute -bottom-8 -right-8 w-[110%] transition-transform duration-500 group-hover:scale-105"
    },
    {
      title: "Restaurant Website",
      desc: "SEO-optimized websites that rank #1.",
      img: "https://sundayapp.com/app/uploads/2024/02/Pay-at-table-Cover-LanguageUS@2x-min.png",
      imgClass: "absolute -bottom-4 left-1/2 -translate-x-1/2 w-[85%] transition-transform duration-500 group-hover:scale-105 rounded-t-xl"
    },
    {
      title: "Automated Marketing",
      desc: "Email & SMS campaigns that drive repeat visits.",
      img: "https://sundayapp.com/app/uploads/2025/11/PaymentHybrid-LanguageUS-ModeDark-min.png",
      imgClass: "absolute -bottom-10 left-1/2 -translate-x-1/2 w-[95%] transition-transform duration-500 group-hover:scale-105"
    },
    {
      title: "Branded Mobile App",
      desc: "Your own app in the App Store & Google Play.",
      img: "https://sundayapp.com/app/uploads/2024/02/Pay-at-table-Cover-LanguageUS@2x-min.png",
      imgClass: "absolute -bottom-6 left-1/2 -translate-x-1/2 w-[85%] transition-transform duration-500 group-hover:scale-105 rounded-t-xl"
    },
    {
      title: "Smart Upsells",
      desc: "AI-driven recommendations to boost average ticket size.",
      img: "https://sundayapp.com/app/uploads/2024/02/Pay-at-table-Cover-LanguageUS@2x-min.png",
      imgClass: "absolute -bottom-6 left-1/2 -translate-x-1/2 w-[85%] transition-transform duration-500 group-hover:scale-105 rounded-t-xl"
    }
  ];

  return (
    <section className="bg-dark-bg text-background py-14 md:py-[7.5rem] px-7 md:px-14 dark">
      <div className="flex flex-col gap-8 w-full">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-4">
          <h2 className="text-[2.5rem] md:text-[3.5rem] leading-[1.05] tracking-tighter max-w-3xl font-medium">
            Stop paying 30% to third-party delivery apps.
          </h2>
          <div className="flex flex-col items-start lg:items-end gap-6 max-w-md">
            <p className="text-[1rem] md:text-[1.125rem] text-white/70 leading-relaxed">
              Owner gives you the tools to drive direct orders, build your own
              customer database, and keep 100% of your profits.
            </p>
            <button className="bg-white text-black rounded-full px-6 py-3 text-[0.875rem] font-medium flex items-center gap-2 hover:bg-white/90 transition-colors">
              Get a demo
              <iconify-icon icon="solar:stars-minimalistic-bold" className="text-primary text-lg"></iconify-icon>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-2.5">
          {cards.map((card, idx) => (
            <div key={idx} className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-2 relative overflow-hidden min-h-[360px] group hover:bg-[#161616] transition-colors">
              <h3 className="text-[1.25rem] font-medium z-10">{card.title}</h3>
              <p className="text-[0.875rem] text-white/50 z-10 max-w-[80%]">{card.desc}</p>
              <div className={card.imgClass.split('rounded-t-xl')[0]}>
                <img src={card.img} alt={card.title} className={`w-full h-auto object-contain ${card.imgClass.includes('rounded-t-xl') ? card.imgClass.substring(card.imgClass.indexOf('rounded-t-xl')) : ''}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FeaturesSection = () => {
  const features = [
    {
      icon: "solar:users-group-rounded-linear",
      title: "Take control of your data",
      desc: "Stop renting your customers from delivery apps. Own your customer data and market directly to them."
    },
    {
      icon: "solar:chart-square-linear",
      title: "Drive repeat business",
      desc: "Automated loyalty programs, email, and SMS marketing designed to turn first-time guests into regulars."
    },
    {
      icon: "solar:smartphone-update-linear",
      title: "Increase average order size",
      desc: "Our checkout is optimized for conversion with smart upsells that increase average ticket size by up to 15%."
    }
  ];

  return (
    <section className="bg-surface py-14 md:py-[7.5rem] px-7 md:px-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <h2 className="text-[2.5rem] md:text-[3rem] leading-[1.1] tracking-tighter max-w-lg">
          Everything you need to grow your restaurant.
        </h2>
        <div className="flex items-center gap-4">
          <button className="w-12 h-12 rounded-full border border-border flex items-center justify-center hover:bg-background hover:scale-105 transition-all text-text focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Previous">
            <iconify-icon icon="solar:arrow-left-linear" className="text-[1.5rem]"></iconify-icon>
          </button>
          <button className="w-12 h-12 rounded-full border border-border bg-background flex items-center justify-center hover:scale-105 transition-all text-text focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Next">
            <iconify-icon icon="solar:arrow-right-linear" className="text-[1.5rem]"></iconify-icon>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feat, idx) => (
          <div key={idx} className="bg-background border border-border rounded-card p-8 flex flex-col gap-4">
            <div className="w-12 h-12 bg-pink-transparent text-primary rounded-full flex items-center justify-center mb-4">
              <iconify-icon icon={feat.icon} className="text-[1.5rem]"></iconify-icon>
            </div>
            <h3 className="text-[1.5rem] font-medium tracking-tight">{feat.title}</h3>
            <p className="text-[1rem] text-text/70 leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const FormSection = () => (
  <section className="bg-background py-14 md:py-[7.5rem] px-7 md:px-14 border-t border-border">
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14">
      <div className="flex flex-col gap-8">
        <h2 className="text-[3rem] md:text-[4.5rem] leading-[1.05] tracking-tighter font-medium text-text">
          Ready to take back control?
          <br />
          Get a free demo today.
        </h2>
      </div>
      <div className="flex flex-col gap-8">
        <p className="text-[1rem] text-text/70 leading-relaxed">
          See how Owner can help you drive direct orders, eliminate
          commissions, and grow your restaurant.
        </p>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(e) => e.preventDefault()}>
          <div className="flex flex-col">
            <input type="text" placeholder="First name" className="bg-background border border-border rounded-lg px-4 py-3 text-[0.875rem] w-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" />
          </div>
          <div className="flex flex-col">
            <input type="text" placeholder="Last name" className="bg-background border border-border rounded-lg px-4 py-3 text-[0.875rem] w-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" />
          </div>
          <div className="flex flex-col md:col-span-2">
            <input type="text" placeholder="Restaurant name*" className="bg-background border border-border rounded-lg px-4 py-3 text-[0.875rem] w-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" />
          </div>
          <div className="flex flex-col md:col-span-2">
            <input type="text" placeholder="Address Line 1" className="bg-background border border-border rounded-lg px-4 py-3 text-[0.875rem] w-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" />
          </div>
          <div className="flex flex-col">
            <input type="text" placeholder="City" className="bg-background border border-border rounded-lg px-4 py-3 text-[0.875rem] w-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" />
          </div>
          <div className="flex flex-col">
            <input type="text" placeholder="Postal Code" className="bg-background border border-border rounded-lg px-4 py-3 text-[0.875rem] w-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" />
          </div>
          <div className="flex flex-col">
            <input type="email" placeholder="Email*" className="bg-background border border-border rounded-lg px-4 py-3 text-[0.875rem] w-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" />
          </div>
          <div className="flex flex-col relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[0.875rem] text-text/70 border-r border-border pr-2">
              🇬🇧
              <iconify-icon icon="solar:alt-arrow-down-linear"></iconify-icon>
            </div>
            <input type="tel" placeholder="07400 123456" className="bg-background border border-border rounded-lg pl-16 pr-4 py-3 text-[0.875rem] w-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" />
          </div>
          <div className="flex flex-col md:col-span-2">
            <textarea placeholder="Any details to add?" rows="4" className="bg-background border border-border rounded-lg px-4 py-3 text-[0.875rem] w-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"></textarea>
          </div>
          <div className="md:col-span-2 mt-2">
            <button type="submit" className="bg-text text-background rounded-button px-6 py-3 text-[0.875rem] font-medium hover:bg-text/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
              get a free demo
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-background text-text py-14 px-7 md:px-14">
    <div className="max-w-7xl mx-auto flex flex-col gap-14">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-2">
          <img src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/917d6f93-fb36-439a-8c48-884b67b35381_1600w.jpg" alt="sunday logo" className="h-6 w-auto object-contain" />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <button className="w-full sm:w-auto text-center bg-text text-background rounded-button px-6 py-3 text-[0.875rem] font-medium hover:bg-text/90 transition-colors">
            Get a free demo
          </button>
          <a href="#" className="w-full sm:w-auto text-center bg-surface text-text rounded-button px-6 py-3 text-[0.875rem] font-medium hover:bg-border transition-colors">
            See how it works
          </a>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="flex flex-col gap-4">
          <h4 className="text-[0.875rem] text-text/50 font-medium mb-2">Grow online discovery</h4>
          {["Restaurant Website", "Restaurant SEO", "Online Menu", "Reviews Engine", "Listings Management"].map(link => (
            <a key={link} href="#" className="text-[0.875rem] font-medium hover:text-primary transition-colors">{link}</a>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="text-[0.875rem] text-text/50 font-medium mb-2">Grow repeat orders</h4>
          {["Branded Restaurant App", "Marketing Campaigns", "Email & SMS Marketing", "Push Notifications Marketing", "Loyalty & Rewards"].map(link => (
            <a key={link} href="#" className="text-[0.875rem] font-medium hover:text-primary transition-colors">{link}</a>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="text-[0.875rem] text-text/50 font-medium mb-2">Grow online sales</h4>
          {["Online Ordering", "Smart Upsells", "Delivery", "Catering"].map((link, idx) => (
            <a key={link} href="#" className={`text-[0.875rem] font-medium ${idx === 0 ? 'text-primary hover:text-primary/80' : 'hover:text-primary'} transition-colors`}>{link}</a>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="text-[0.875rem] text-text/50 font-medium mb-2">Run your restaurant</h4>
          {["Owner App", "Reporting & Analytics", "Kitchen Tablet", "POS Integrations"].map(link => (
            <a key={link} href="#" className="text-[0.875rem] font-medium hover:text-primary transition-colors">{link}</a>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8">
        <div className="flex flex-col gap-4">
          <h4 className="text-[0.875rem] text-text/50 font-medium mb-2">Resources</h4>
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="text-[0.875rem] text-text/50 font-medium mb-2">Company</h4>
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="text-[0.875rem] text-text/50 font-medium mb-2">Support</h4>
        </div>
      </div>
    </div>
  </footer>
);

export default function App() {
  return (
    <div className="bg-background text-text font-sans selection:bg-primary selection:text-background min-h-screen">
      <Header />
      <main className="pt-20">
        <Hero />
        <StatsRow />
        <Marquee />
        <DarkSection />
        <FeaturesSection />
        <FormSection />
      </main>
      <Footer />
    </div>
  );
}